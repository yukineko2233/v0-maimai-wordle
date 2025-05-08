"use client"

import { useState, useEffect } from "react"
import type { Song, GameSettings, Guess, GameState } from "@/types/game"
import SearchBox from "@/components/search-box"
import GuessRow from "@/components/guess-row"
import SettingsPanel from "@/components/settings-panel"
import ResultScreen from "@/components/result-screen"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, Flag, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react"
import { getRandomSong, isGuessCorrect, DEFAULT_SETTINGS } from "@/lib/game-logic"
import { useToast } from "@/components/ui/use-toast"
import LoadingScreen from "@/components/loading-screen"
import { useLanguage } from "@/lib/i18n/language-context"

// Add this function after the imports
function getVersionValue(version: string): number {
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

  return versionMap[version] || 0
}

interface GameBoardProps {
  onBack?: () => void
  initialSongs: Song[]
  initialAliases: Record<number, string[]>
}

export default function GameBoard({ onBack, initialSongs, initialAliases }: GameBoardProps) {
  const [songs] = useState<Song[]>(initialSongs)
  const [songAliases] = useState<Record<number, string[]>>(initialAliases)
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    targetSong: null,
    guesses: [],
    gameOver: false,
    won: false,
    remainingTime: settings.timeLimit,
  })
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [reverseOrder, setReverseOrder] = useState(true)
  const { toast } = useToast()
  const [spinKey, setSpinKey] = useState(0)
  const { t } = useLanguage()

  const handleClick = () => {
    // 先启动新游戏
    startNewGame()
    // 然后自增 key，触发图标重渲染和动画
    setSpinKey((k) => k + 1)
  }

  // Filter songs based on settings and start new game
  useEffect(() => {
    if (songs.length === 0) return

    const filtered = songs.filter((song) => {
      // Filter by version
      const versionValue = getVersionValue(song.version)
      const minVersionValue = getVersionValue(settings.versionRange.min)
      const maxVersionValue = getVersionValue(settings.versionRange.max)

      if (versionValue < minVersionValue || versionValue > maxVersionValue) {
        return false
      }

      // Filter by genre
      if (settings.genres.length > 0 && !settings.genres.includes(song.genre)) {
        return false
      }

      // Fix: Safely handle level_master that might be undefined
      if (!song.level_master) {
        return false
      }

      // Filter by master level
      try {
        const masterLevel = Number.parseFloat(song.level_master.replace("+", ".7"))
        const minMasterLevel = Number.parseFloat(settings.masterLevelRange.min.replace("+", ".7"))
        const maxMasterLevel = Number.parseFloat(settings.masterLevelRange.max.replace("+", ".7"))

        if (masterLevel < minMasterLevel || masterLevel > maxMasterLevel) {
          return false
        }
      } catch (error) {
        console.error("Error parsing master level:", error, song)
        return false
      }

      return true
    })

    setFilteredSongs(filtered)

    // 只要当前没有 targetSong，就「尝试」启动新一局
    if (!gameState.targetSong) {
      startNewGame(filtered)
    }
  }, [songs, settings, gameState.targetSong])

  // Timer effect - Fixed to properly handle timeLimit of 0 (unlimited)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null

    // Only start the timer if timeLimit is greater than 0
    if (settings.timeLimit > 0 && gameState.remainingTime > 0 && !gameState.gameOver && gameState.targetSong) {
      timer = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          remainingTime: prev.remainingTime - 1,
          gameOver: prev.remainingTime <= 1,
        }))
      }, 1000)
    } else if (settings.timeLimit > 0 && gameState.remainingTime === 0 && !gameState.gameOver) {
      setGameState((prev) => ({
        ...prev,
        gameOver: true,
      }))
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameState, settings.timeLimit])

  const startNewGame = (songList: Song[] = filteredSongs) => {
    if (songList.length === 0) {
      toast({
        title: t("error"),
        description: t("noSongsAvailable"),
        variant: "destructive",
      })
      setShowSettings(true)
      return
    }

    const target = getRandomSong(songList)
    console.log("Target song:", target.id) // For debugging

    setGameState({
      targetSong: target,
      guesses: [],
      gameOver: false,
      won: false,
      remainingTime: settings.timeLimit,
    })
  }

  const makeGuess = (song: Song) => {
    if (gameState.gameOver || !gameState.targetSong) return

    // Check if song was already guessed
    if (gameState.guesses.some((g) => g.song.id === song.id)) {
      toast({
        title: "重复猜测",
        description: "你已经猜过这首歌了！",
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
        console.error("Error comparing BPM values:", error, { guessBPM, targetBPM })
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
      const gameOver = correct || newGuesses.length >= settings.maxGuesses

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
      console.error("Error checking if values are close:", error, { guess, target })
      return false
    }
  }

  const compareVersions = (
    guess: string,
    target: string,
  ): { direction: "newer" | "older" | "equal"; close: boolean } => {
    const guessValue = getVersionValue(guess)
    const targetValue = getVersionValue(target)

    const isClose = Math.abs(guessValue - targetValue) === 1

    if (guessValue > targetValue) return { direction: "newer", close: isClose }
    if (guessValue < targetValue) return { direction: "older", close: isClose }
    return { direction: "equal", close: false }
  }

  const applySettings = (newSettings: GameSettings) => {
    setSettings(newSettings)
    setShowSettings(false)
    setGameState({
      targetSong: null,
      guesses: [],
      gameOver: false,
      won: false,
      remainingTime: newSettings.timeLimit,
    })
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
        <h1 className="text-xl font-medium text-center">{t("singlePlayerTitle")}</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(true)}
          className="text-white hover:bg-white/20"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-6">
        {filteredSongs.length === 0 && !gameState.targetSong ? (
          <div className="text-center text-gray-500 py-10">{t("noSongsAvailable")}</div>
        ) : (
          <>
            {gameState.targetSong && (
              <>
                <div className="mb-3 flex justify-center gap-4 items-center">
                  <div className="flex-1 text-center">
                    <span className="font-medium">{t("guessed")}: </span>
                    <span>
                      {gameState.guesses.length}/{settings.maxGuesses}
                    </span>
                  </div>
                  <div className="flex-1 text-center">
                    {settings.timeLimit > 0 ? (
                      <>
                        <span className="font-medium">{t("timeRemaining")}: </span>
                        <span>
                          {gameState.remainingTime}
                          {t("seconds")}
                        </span>
                      </>
                    ) : (
                      <span>{t("unlimited")}</span>
                    )}
                  </div>
                </div>
                <div className="mb-6 flex justify-center gap-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClick}
                    className="flex-1 flex items-center justify-center gap-1 max-w-40"
                  >
                    <RefreshCw key={spinKey} className="h-4 w-4 animate-[spin_1s_linear_1]" />
                    新游戏
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleOrder}
                    className="flex-1 flex items-center justify-center gap-1 max-w-fit"
                  >
                    {reverseOrder ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                  </Button>
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
                    投降
                  </Button>
                </div>
              </>
            )}

            {/* Fixed: Move search box above result screen to ensure it's visible */}
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

            {gameState.gameOver && gameState.targetSong && (
              <ResultScreen
                won={gameState.won}
                targetSong={gameState.targetSong}
                guessCount={gameState.guesses.length}
                maxGuesses={settings.maxGuesses}
                onNewGame={() => startNewGame()}
              />
            )}

            <div className={`mt-5 gap-3 flex ${reverseOrder ? "flex-col" : "flex-col-reverse"}`}>
              {gameState.guesses.map((guess, index) => (
                <GuessRow key={index} guess={guess} targetSong={gameState.targetSong} />
              ))}
            </div>
          </>
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onApply={applySettings}
          onClose={() => setShowSettings(false)}
          isMultiplayer={false} // Specify that this is single player mode
        />
      )}
    </div>
  )
}
