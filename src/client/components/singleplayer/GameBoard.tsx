import { useCallback, useEffect, useRef, useState } from "react"
import { ArrowLeft, Settings, RefreshCw, ArrowUp, ArrowDown, Flag } from "lucide-react"
import { toast } from "sonner"
import type { GameSettings, GameState, Guess, Song } from "../../../shared/types"
import { DEFAULT_SETTINGS } from "../../../shared/domain/presets"
import { filterSongs, getRandomSong, processGuess } from "../../../shared/domain/game"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import SettingsPanel from "./SettingsPanel"
import ResultScreen, { type ResultEndReason } from "./ResultScreen"

interface GameBoardProps {
  onBack: () => void
  initialSongs: Song[]
}

const SETTINGS_STORAGE_VERSION = 1

function isGameSettings(value: unknown): value is GameSettings {
  if (!value || typeof value !== "object") return false
  const settings = value as GameSettings
  return Boolean(
    settings.versionRange &&
      typeof settings.versionRange.min === "string" &&
      typeof settings.versionRange.max === "string" &&
      Array.isArray(settings.genres) &&
      settings.genres.every((genre) => typeof genre === "string") &&
      settings.masterLevelRange &&
      typeof settings.masterLevelRange.min === "string" &&
      typeof settings.masterLevelRange.max === "string" &&
      Number.isFinite(settings.maxGuesses) &&
      settings.maxGuesses > 0 &&
      Number.isFinite(settings.topSongs) &&
      settings.topSongs > 0 &&
      Number.isFinite(settings.timeLimit) &&
      settings.timeLimit >= 0,
  )
}

export default function GameBoard({ onBack, initialSongs }: GameBoardProps) {
  const [songs] = useState<Song[]>(initialSongs)
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem("maimai_single_settings")
      if (saved) {
        const parsed: unknown = JSON.parse(saved)
        const value =
          parsed && typeof parsed === "object" && "version" in parsed && "settings" in parsed
            ? (parsed as { version: unknown; settings: unknown }).version === SETTINGS_STORAGE_VERSION
              ? (parsed as { settings: unknown }).settings
              : null
            : parsed
        if (isGameSettings(value)) return value
      }
    } catch (e) {}
    return DEFAULT_SETTINGS
  })
  const [showSettings, setShowSettings] = useState(false)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [reverseOrder, setReverseOrder] = useState(true)
  const [spinKey, setSpinKey] = useState(0)
  const [deadline, setDeadline] = useState<number | null>(null)
  const [endReason, setEndReason] = useState<ResultEndReason | null>(null)
  const latestFeedbackRef = useRef<HTMLDivElement>(null)
  const shouldScrollFeedbackRef = useRef(false)

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
    if (deadline === null || gameState.gameOver || !gameState.targetSong) return

    let displayedRemainingTime = gameState.remainingTime
    const updateRemainingTime = () => {
      const remainingTime = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      if (remainingTime === displayedRemainingTime) return
      displayedRemainingTime = remainingTime
      if (remainingTime === 0) setEndReason((previous) => previous || "timeout")
      setGameState((prev) => ({ ...prev, remainingTime, gameOver: remainingTime === 0 }))
    }
    updateRemainingTime()
    const timer = window.setInterval(updateRemainingTime, 250)
    return () => window.clearInterval(timer)
  }, [deadline, gameState.gameOver, gameState.targetSong])

  const startNewGame = useCallback(
    (pool = filteredSongs, timeLimit = settings.timeLimit) => {
      if (pool.length === 0) {
        toast.error("当前设置下没有可用曲目")
        setShowSettings(true)
        return
      }
      const target = getRandomSong(pool)
      setDeadline(timeLimit > 0 ? Date.now() + timeLimit * 1000 : null)
      setEndReason(null)
      setGameState({
        targetSong: target,
        guesses: [],
        gameOver: false,
        won: false,
        remainingTime: timeLimit,
      })
    },
    [filteredSongs, settings.timeLimit],
  )

  const handleNewGameClick = () => {
    if (!gameState.gameOver && !window.confirm("开始新游戏会丢失当前进度，确定继续吗？")) return
    setSpinKey((k) => k + 1)
    startNewGame()
  }

  const makeGuess = (song: Song) => {
    if (gameState.gameOver || !gameState.targetSong) return false

    if (gameState.guesses.some((g) => g.song.id === song.id)) {
      toast.info("你已经猜过这首歌曲了！")
      return false
    }

    const newGuess: Guess = processGuess(song, gameState.targetSong)
    const won = newGuess.result.correct
    const newGuesses = [...gameState.guesses, newGuess]
    const gameOver = won || newGuesses.length >= settings.maxGuesses

    shouldScrollFeedbackRef.current = true
    if (gameOver) setEndReason(won ? "won" : "max-guesses")
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
    return true
  }

  useEffect(() => {
    if (!shouldScrollFeedbackRef.current) return
    shouldScrollFeedbackRef.current = false
    const frame = window.requestAnimationFrame(() => {
      latestFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [gameState.guesses.length])

  const giveUp = () => {
    if (!window.confirm("投降后本局将立即结束，确定投降吗？")) return
    setEndReason("give-up")
    setGameState((prev) => ({ ...prev, gameOver: true }))
  }

  const applySettings = (newSettings: GameSettings) => {
    setSettings(newSettings)
    setShowSettings(false)
    try {
      localStorage.setItem(
        "maimai_single_settings",
        JSON.stringify({ version: SETTINGS_STORAGE_VERSION, settings: newSettings }),
      )
    } catch (e) {}
    const filtered = filterSongs(songs, newSettings)
    setFilteredSongs(filtered)
    startNewGame(filtered, newSettings.timeLimit)
  }

  const displayedGuesses = reverseOrder ? [...gameState.guesses].reverse() : gameState.guesses
  const latestGuessId = gameState.guesses.at(-1)?.song.id

  return (
    <div className="motion-page w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex justify-between items-center shadow-xs rounded-t-2xl">
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
                      onClick={giveUp}
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
                <SearchBox
                  songs={filteredSongs}
                  guessedSongIds={gameState.guesses.map((guess) => guess.song.id)}
                  onSelect={makeGuess}
                  disabled={gameState.gameOver}
                />
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
                endReason={endReason || undefined}
              />
            )}

            {/* 猜测记录列表 */}
            <div className="gap-3 flex flex-col">
              {displayedGuesses.map((guess) => (
                <div key={guess.song.id} ref={guess.song.id === latestGuessId ? latestFeedbackRef : undefined}>
                  <GuessRow guess={guess} />
                </div>
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
