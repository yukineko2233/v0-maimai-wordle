import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Settings, RefreshCw, ArrowUp, ArrowDown, Flag } from "lucide-react"
import { toast } from "sonner"
import type { GameSettings, GameState, Guess, Song } from "../../../shared/types"
import { DEFAULT_SETTINGS } from "../../../shared/domain/presets"
import { filterSongs, getRandomSong, processGuess } from "../../../shared/domain/game"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import SettingsPanel from "./SettingsPanel"
import ResultScreen from "./ResultScreen"

interface GameBoardProps {
  onBack: () => void
  initialSongs: Song[]
}

export default function GameBoard({ onBack, initialSongs }: GameBoardProps) {
  const [songs] = useState<Song[]>(initialSongs)
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem("maimai_single_settings")
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return DEFAULT_SETTINGS
  })
  const [showSettings, setShowSettings] = useState(false)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [reverseOrder, setReverseOrder] = useState(true)
  const [spinKey, setSpinKey] = useState(0)

  const [gameState, setGameState] = useState<GameState>({
    targetSong: null,
    guesses: [],
    gameOver: false,
    won: false,
    remainingTime: 0,
  })

  // 根据设置筛选可用歌曲
  useEffect(() => {
    if (songs.length === 0) return
    const filtered = filterSongs(songs, settings)
    setFilteredSongs(filtered)

    if (filtered.length === 0) {
      toast.error("当前设置下没有可用的歌曲，请调整筛选条件")
      setShowSettings(true)
      return
    }

    // 若当前无目标曲目，自动开局
    if (!gameState.targetSong) {
      startNewGame(filtered)
    }
  }, [songs, settings])

  // 计时器
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (
      settings.timeLimit > 0 &&
      gameState.remainingTime > 0 &&
      !gameState.gameOver &&
      gameState.targetSong
    ) {
      timer = setTimeout(() => {
        setGameState((prev) => ({
          ...prev,
          remainingTime: prev.remainingTime - 1,
          gameOver: prev.remainingTime <= 1,
        }))
      }, 1000)
    } else if (settings.timeLimit > 0 && gameState.remainingTime === 0 && !gameState.gameOver && gameState.targetSong) {
      setGameState((prev) => ({ ...prev, gameOver: true }))
    }

    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [gameState.remainingTime, gameState.gameOver, gameState.targetSong, settings.timeLimit])

  const startNewGame = useCallback(
    (pool = filteredSongs) => {
      if (pool.length === 0) {
        toast.error("当前设置下没有可用曲目")
        setShowSettings(true)
        return
      }
      const target = getRandomSong(pool)
      setGameState({
        targetSong: target,
        guesses: [],
        gameOver: false,
        won: false,
        remainingTime: settings.timeLimit,
      })
    },
    [filteredSongs, settings.timeLimit],
  )

  const handleNewGameClick = () => {
    setSpinKey((k) => k + 1)
    startNewGame()
  }

  const makeGuess = (song: Song) => {
    if (gameState.gameOver || !gameState.targetSong) return

    if (gameState.guesses.some((g) => g.song.id === song.id)) {
      toast.info("你已经猜过这首歌曲了！")
      return
    }

    const newGuess: Guess = processGuess(song, gameState.targetSong)
    const won = newGuess.result.correct
    const newGuesses = [...gameState.guesses, newGuess]
    const gameOver = won || newGuesses.length >= settings.maxGuesses

    setGameState((prev) => ({
      ...prev,
      guesses: newGuesses,
      won,
      gameOver,
    }))

    if (won) {
      toast.success("恭喜你猜对了！🎉")
    } else if (gameOver) {
      toast.error("猜测次数已用尽，游戏结束")
    }
  }

  const applySettings = (newSettings: GameSettings) => {
    setSettings(newSettings)
    setShowSettings(false)
    try {
      localStorage.setItem("maimai_single_settings", JSON.stringify(newSettings))
    } catch (e) {}
    const filtered = filterSongs(songs, newSettings)
    setFilteredSongs(filtered)
    startNewGame(filtered)
  }

  return (
    <div className="w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 animate-in fade-in duration-200">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex justify-between items-center shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          title="返回主菜单"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold text-center tracking-wide">单人练习模式</h1>

        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          title="设置难度与筛选"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 md:p-6">
        {filteredSongs.length === 0 ? (
          <div className="text-center text-gray-500 py-12 space-y-3">
            <p>当前设置下没有可用的歌曲，请调整筛选设置。</p>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              打开设置
            </button>
          </div>
        ) : (
          <>
            {/* 状态统计 */}
            {gameState.targetSong && (
              <div className="mb-4">
                <div className="flex justify-center gap-6 items-center text-xs md:text-sm text-gray-700 mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">已猜测: </span>
                    <strong className="text-pink-600 font-bold">{gameState.guesses.length}</strong> /{" "}
                    {settings.maxGuesses}
                  </div>
                  <div>
                    <span className="font-semibold text-gray-900">时间: </span>
                    {settings.timeLimit > 0 ? (
                      <span className="font-medium text-purple-700">{gameState.remainingTime} 秒</span>
                    ) : (
                      <span className="text-gray-500 font-medium">无限</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={handleNewGameClick}
                    className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-gray-200"
                  >
                    <RefreshCw key={spinKey} className="h-3.5 w-3.5 animate-[spin_0.8s_ease-in-out_1]" />
                    新游戏
                  </button>

                  <button
                    type="button"
                    onClick={() => setReverseOrder((prev) => !prev)}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-gray-200"
                    title={reverseOrder ? "当前最新猜测置顶" : "当前最早猜测置顶"}
                  >
                    {reverseOrder ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                    <span>{reverseOrder ? "最新在上" : "最新在下"}</span>
                  </button>

                  {!gameState.gameOver && (
                    <button
                      type="button"
                      onClick={() => setGameState((prev) => ({ ...prev, gameOver: true }))}
                      className="flex items-center gap-1.5 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-red-200"
                    >
                      <Flag className="h-3.5 w-3.5" />
                      投降
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* 浮动搜索栏 */}
            {!gameState.gameOver && gameState.targetSong && (
              <div className="mb-5">
                <SearchBox songs={filteredSongs} onSelect={makeGuess} disabled={gameState.gameOver} />
              </div>
            )}

            {/* 结果显示 */}
            {gameState.gameOver && gameState.targetSong && (
              <ResultScreen
                won={gameState.won}
                targetSong={gameState.targetSong}
                guessCount={gameState.guesses.length}
                maxGuesses={settings.maxGuesses}
                onNewGame={handleNewGameClick}
              />
            )}

            {/* 猜测记录列表 */}
            <div className={`gap-3 flex ${reverseOrder ? "flex-col" : "flex-col-reverse"}`}>
              {gameState.guesses.map((guess, idx) => (
                <GuessRow key={idx} guess={guess} />
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
          isMultiplayer={false}
        />
      )}
    </div>
  )
}
