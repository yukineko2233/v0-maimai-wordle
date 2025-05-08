"use client"

import { useState, useEffect } from "react"
import type { Song, GameSettings, Guess, GameState } from "@/types/game"
import SearchBox from "@/components/search-box"
import GuessRow from "@/components/guess-row"
import ResultScreen from "@/components/result-screen"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Flag, Share2, ArrowUp, ArrowDown } from "lucide-react"
import { isGuessCorrect } from "@/lib/game-logic"
import { useToast } from "@/components/ui/use-toast"
import LoadingScreen from "@/components/loading-screen"
import DailyResultShare from "@/components/daily-result-share"
import { useLanguage } from "@/lib/i18n/language-context"

// Daily game settings
const DAILY_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2024",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 6, // Limit to 6 guesses
  timeLimit: 0, // No time limit
  topSongs: 100, // Use top 100 songs
}

interface DailyGameProps {
  onBack?: () => void
  initialSongs: Song[]
  initialAliases: Record<number, string[]>
}

export default function DailyGame({ onBack, initialSongs, initialAliases }: DailyGameProps) {
  const [songs] = useState<Song[]>(initialSongs)
  const [songAliases] = useState<Record<number, string[]>>(initialAliases)
  const [loading, setLoading] = useState(true)
  const [gameState, setGameState] = useState<GameState>({
    targetSong: null,
    guesses: [],
    gameOver: false,
    won: false,
    remainingTime: 0,
  })
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [reverseOrder, setReverseOrder] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const { toast } = useToast()
  const [alreadyPlayed, setAlreadyPlayed] = useState(false)
  const [todayDate, setTodayDate] = useState("")
  const { t } = useLanguage()

  // Filter songs and get daily song
  useEffect(() => {
    if (songs.length === 0) return

    // Get today's date in YYYY-MM-DD format
    const today = new Date()
    const dateString = today.toISOString().split("T")[0]
    setTodayDate(dateString)

    // Filter songs based on settings
    let filtered = songs.filter((song) => {
      // Filter by master level
      try {
        const masterLevel = Number.parseFloat(song.level_master.replace("+", ".7"))
        const minMasterLevel = Number.parseFloat(DAILY_SETTINGS.masterLevelRange.min.replace("+", ".7"))
        const maxMasterLevel = Number.parseFloat(DAILY_SETTINGS.masterLevelRange.max.replace("+", ".7"))

        if (masterLevel < minMasterLevel || masterLevel > maxMasterLevel) {
          return false
        }
      } catch (error) {
        console.error("Error parsing master level:", error, song)
        return false
      }

      return true
    })

    // Sort by popularity
    filtered = filtered.sort((a, b) => {
      const rateA = a.win_rate ?? 0
      const rateB = b.win_rate ?? 0
      return rateB - rateA
    })

    // Limit to top songs
    filtered = filtered.slice(0, DAILY_SETTINGS.topSongs)
    setFilteredSongs(filtered)

    // Check if user already played today
    const savedData = localStorage.getItem(`daily-game-${dateString}`)
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData)
        setGameState(parsedData.gameState)
        setAlreadyPlayed(true)
      } catch (error) {
        console.error("Error parsing saved game data:", error)
      }
    } else {
      // Get daily song using a deterministic method based on the date
      const dailySong = getDailySong(filtered, dateString)
      setGameState({
        targetSong: dailySong,
        guesses: [],
        gameOver: false,
        won: false,
        remainingTime: 0,
      })
    }

    setLoading(false)
  }, [songs])

  // Save game state when it changes
  useEffect(() => {
    if (gameState.targetSong && (gameState.guesses.length > 0 || gameState.gameOver)) {
      localStorage.setItem(
        `daily-game-${todayDate}`,
        JSON.stringify({
          gameState,
          date: todayDate,
        }),
      )
    }
  }, [gameState, todayDate])

  // Get a deterministic song based on the date
  const getDailySong = (songList: Song[], dateString: string): Song => {
    if (songList.length === 0) {
      return null
    }

    // Convert date string to a number for seeding
    let seed = 0
    for (let i = 0; i < dateString.length; i++) {
      seed = (seed * 31 + dateString.charCodeAt(i)) % 1000000
    }

    // Use the seed to select a song
    const index = seed % songList.length
    return songList[index]
  }

  const makeGuess = (song: Song) => {
    if (gameState.gameOver || !gameState.targetSong) return

    // Check if song was already guessed
    if (gameState.guesses.some((g) => g.song.id === song.id)) {
      toast({
        title: t("duplicateGuess"),
        description: t("duplicateGuessDesc"),
      })
      return
    }

    // Compare BPM values
    const compareBPM = (
      guessBPM: string,
      targetBPM: string,
    ): {
      value: boolean
      direction: "higher" | "lower" | "equal"
      close: boolean
    } => {
      if (!guessBPM || !targetBPM) {
        return { value: false, direction: "equal", close: false }
      }

      try {
        const guessValue = Number.parseInt(guessBPM, 10)
        const targetValue = Number.parseInt(targetBPM, 10)

        return {
          value: guessValue === targetValue,
          direction: guessValue > targetValue ? "higher" : guessValue < targetValue ? "lower" : "equal",
          close: Math.abs(guessValue - targetValue) <= 20, // BPM within 20 is considered close
        }
      } catch (error) {
        console.error("Error comparing BPM values:", error, {
          guessBPM,
          targetBPM,
        })
        return { value: false, direction: "equal", close: false }
      }
    }

    const versionResult = compareVersions(song.version, gameState.targetSong.version)

    const newGuess: Guess = {
      song,
      result: {
        title: song.title === gameState.targetSong.title,
        type: song.type === gameState.targetSong.type,
        artist: song.artist === gameState.targetSong.artist,
        bpm: compareBPM(song.bpm, gameState.targetSong.bpm),
        genre: song.genre === gameState.targetSong.genre,
        masterLevel: {
          value: song.level_master === gameState.targetSong.level_master,
          direction: compareValues(song.level_master, gameState.targetSong.level_master),
          close: isClose(song.level_master, gameState.targetSong.level_master),
        },
        masterDesigner: song.charts.master.designer === gameState.targetSong.charts.master.designer,
        remasterLevel: {
          value: song.level_remaster === gameState.targetSong.level_remaster,
          direction: compareValues(song.level_remaster, gameState.targetSong.level_remaster),
          close: isClose(song.level_remaster, gameState.targetSong.level_remaster),
        },
        remasterDesigner: song.charts.remaster?.designer === gameState.targetSong.charts.remaster?.designer,
        version: {
          value: song.version === gameState.targetSong.version,
          direction: versionResult.direction,
          close: versionResult.close,
        },
      },
    }

    const correct = isGuessCorrect(newGuess)

    setGameState((prev) => {
      const newGuesses = [...prev.guesses, newGuess]
      const gameOver = correct || newGuesses.length >= DAILY_SETTINGS.maxGuesses

      return {
        ...prev,
        guesses: newGuesses,
        gameOver,
        won: correct,
      }
    })
  }

  const toggleOrder = () => setReverseOrder((prev) => !prev)

  const compareValues = (guess: string, target: string): "higher" | "lower" | "equal" => {
    if (!guess || !target) {
      return "equal"
    }

    try {
      const guessValue = Number.parseFloat(guess.replace("+", ".7"))
      const targetValue = Number.parseFloat(target.replace("+", ".7"))

      if (guessValue > targetValue) return "higher"
      if (guessValue < targetValue) return "lower"
      return "equal"
    } catch (error) {
      console.error("Error comparing values:", error, { guess, target })
      return "equal"
    }
  }

  const isClose = (guess: string, target: string): boolean => {
    if (!guess || !target) {
      return false
    }

    try {
      const guessValue = Number.parseFloat(guess.replace("+", ".7"))
      const targetValue = Number.parseFloat(target.replace("+", ".7"))

      return Math.abs(guessValue - targetValue) <= 0.7
    } catch (error) {
      console.error("Error checking if values are close:", error, {
        guess,
        target,
      })
      return false
    }
  }

  const compareVersions = (
    guess: string,
    target: string,
  ): { direction: "newer" | "older" | "equal"; close: boolean } => {
    const versionMap: Record<string, number> = {
      maimai: 1,
      "maimai PLUS": 2,
      "maimai GreeN": 3,
      "maimai GreeN PLUS": 4,
      "maimai ORANGE": 5,
      "maimai ORANGE PLUS": 6,
      "maimai PiNK": 7,
      "maimai PiNK PLUS": 8,
      "maimai MURASAKi": 9,
      "maimai MURASAKi PLUS": 10,
      "maimai MiLK": 11,
      "maimai MiLK PLUS": 12,
      "maimai FiNALE": 13,
      舞萌DX: 14,
      "舞萌DX 2021": 15,
      "舞萌DX 2022": 16,
      "舞萌DX 2023": 17,
      "舞萌DX 2024": 18,
    }

    const guessValue = versionMap[guess] || 0
    const targetValue = versionMap[target] || 0

    const isClose = Math.abs(guessValue - targetValue) === 1

    if (guessValue > targetValue) return { direction: "newer", close: isClose }
    if (guessValue < targetValue) return { direction: "older", close: isClose }
    return { direction: "equal", close: false }
  }

  const handleShareResults = () => {
    setShowShareModal(true)
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex justify-between items-center">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-white hover:bg-white/20">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-medium text-center">
          {t("dailyTitle")} {todayDate}
        </h1>
        <div className="w-9 h-9"></div> {/* Placeholder for alignment */}
      </div>

      <div className="p-6">
        {filteredSongs.length === 0 && !gameState.targetSong ? (
          <div className="text-center text-gray-500 py-10">{t("loading")}</div>
        ) : (
          <>
            {gameState.targetSong && (
              <>
                <div className="mb-3 flex justify-center gap-4 items-center">
                  <div className="flex-1 text-center">
                    <span className="font-medium">{t("guessed")}: </span>
                    <span>
                      {gameState.guesses.length}/{DAILY_SETTINGS.maxGuesses}
                    </span>
                  </div>
                </div>
                <div className="mb-6 flex justify-center gap-4">
                  {!gameState.gameOver && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setGameState((prev) => ({
                          ...prev,
                          gameOver: true,
                        }))
                      }
                      className="flex-1 flex items-center justify-center gap-1 max-w-40"
                    >
                      <Flag className="h-4 w-4" />
                      {t("surrender")}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleOrder}
                    className="flex-1 flex items-center justify-center gap-1 max-w-fit"
                  >
                    {reverseOrder ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </Button>

                  {gameState.gameOver && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareResults}
                      className="flex-1 flex items-center justify-center gap-1 max-w-40"
                    >
                      <Share2 className="h-4 w-4" />
                      {t("shareResults")}
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Search box for making guesses */}
            {!gameState.gameOver && gameState.targetSong && (
              <div className="mb-5">
                <SearchBox
                  songs={filteredSongs}
                  aliases={songAliases}
                  onSelect={makeGuess}
                  disabled={gameState.gameOver}
                />
              </div>
            )}

            {/* Result screen when game is over */}
            {gameState.gameOver && gameState.targetSong && (
              <ResultScreen
                won={gameState.won}
                targetSong={gameState.targetSong}
                guessCount={gameState.guesses.length}
                maxGuesses={DAILY_SETTINGS.maxGuesses}
                onNewGame={() => {}} // No new game in daily mode
                isDaily={true}
                onShare={handleShareResults}
              />
            )}

            {/* Guesses display */}
            <div className={`mt-5 gap-3 flex ${reverseOrder ? "flex-col" : "flex-col-reverse"}`}>
              {gameState.guesses.map((guess, index) => (
                <GuessRow key={index} guess={guess} targetSong={gameState.targetSong} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && gameState.targetSong && (
        <DailyResultShare
          guesses={gameState.guesses}
          won={gameState.won}
          maxGuesses={DAILY_SETTINGS.maxGuesses}
          date={todayDate}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
