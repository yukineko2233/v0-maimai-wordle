"use client"

import { useState, useEffect } from "react"
import type { Song, GameSettings, Guess, GameState } from "@/types/game"
import SearchBox from "@/components/search-box"
import GuessRow from "@/components/guess-row"
import SettingsPanel from "@/components/settings-panel"
import ResultScreen from "@/components/result-screen"
import { fetchSongs, fetchAliases } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Settings, RefreshCw, HelpCircle } from "lucide-react"
import { getRandomSong, isGuessCorrect, DEFAULT_SETTINGS } from "@/lib/game-logic"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/components/ui/use-toast"
import LoadingScreen from "@/components/loading-screen"
import HelpModal from "@/components/help-modal"

// Add this function after the imports
function getVersionValue(version: string): number {
  const versionMap: Record<string, number> = {
    "maimai": 1,
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
    "maimai でらっくす": 14,
    "maimai でらっくす PLUS": 15,
    "maimai でらっくす Splash": 16,
    "maimai でらっくす Splash PLUS": 17,
    "maimai でらっくす UNiVERSE": 18,
    "maimai でらっくす UNiVERSE PLUS": 19,
    "maimai でらっくす FESTiVAL": 20,
    "maimai でらっくす FESTiVAL PLUS": 21,
    "maimai でらっくす BUDDiES": 22,
  }

  return versionMap[version] || 0
}

export default function GameBoard() {
  const [songs, setSongs] = useState<Song[]>([])
  const [songAliases, setSongAliases] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [gameState, setGameState] = useState<GameState>({
    targetSong: null,
    guesses: [],
    gameOver: false,
    won: false,
    remainingTime: settings.timeLimit,
  })
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const { toast } = useToast()

  // Load songs and aliases on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const songsData = await fetchSongs()
        const aliasesData = await fetchAliases()

        setSongs(songsData)
        setSongAliases(aliasesData)
        setLoading(false)
      } catch (error) {
        console.error("Failed to load game data:", error)
        toast({
          title: "加载失败",
          description: "无法加载游戏数据，请刷新页面重试。",
          variant: "destructive",
        })
      }
    }

    loadData()
  }, [toast])

  // Filter songs based on settings and start new game
  useEffect(() => {
    if (songs.length > 0) {
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

      // Start a new game if we don't have one yet
      if (!gameState.targetSong && filtered.length > 0) {
        startNewGame(filtered)
      }
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
        title: "无法开始游戏",
        description: "当前设置下没有可用的歌曲，请调整设置。",
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
    startNewGame()
  }

  if (loading) {
    return <LoadingScreen />
  }

  return (
      <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex justify-between items-center">
          <Button variant="ghost" size="icon" onClick={() => setShowHelp(true)} className="text-white hover:bg-white/20">
            <HelpCircle className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-center">舞萌猜歌之潘一把</h1>
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
          {gameState.targetSong && (
              <div className="mb-6 flex justify-between items-center">
                <div>
                  <span className="font-medium">已猜测: </span>
                  <span>
                {gameState.guesses.length}/{settings.maxGuesses}
              </span>
                </div>
                {settings.timeLimit > 0 && (
                    <div>
                      <span className="font-medium">剩余时间: </span>
                      <span>{gameState.remainingTime}秒</span>
                    </div>
                )}
                {settings.timeLimit === 0 && (
                    <div>
                      <span>无限制</span>
                    </div>
                )}
                <Button variant="outline" size="sm" onClick={() => startNewGame()} className="flex items-center gap-1">
                  <RefreshCw className="h-4 w-4" />
                  新游戏
                </Button>
              </div>
          )}

          {/* Fixed: Move search box above result screen to ensure it's visible */}
          {!gameState.gameOver && gameState.targetSong && (
              <div className="mb-5">
                <SearchBox songs={filteredSongs} aliases={songAliases} onSelect={makeGuess} disabled={gameState.gameOver} />
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

          <div className="mt-5 space-y-3">
            {gameState.guesses.map((guess, index) => (
                <GuessRow key={index} guess={guess} />
            ))}
          </div>
        </div>

        {showSettings && (
            <SettingsPanel settings={settings} onApply={applySettings} onClose={() => setShowSettings(false)} />
        )}

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

        <Toaster />
      </div>
  )
}
