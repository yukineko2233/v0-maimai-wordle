import { useEffect, useRef, useState } from "react"
import { ArrowDown, ArrowLeft, ArrowUp, Flag, Share2 } from "lucide-react"
import { toast } from "sonner"
import type { GameSettings, GameState, Song } from "../../../shared/types"
import { filterSongs, getShanghaiDate } from "../../../shared/domain/game"
import { fetchDailySession, giveUpDaily, submitDailyGuess } from "../../services/api"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import ResultScreen, { type ResultEndReason } from "../singleplayer/ResultScreen"
import DailyShareModal from "./DailyShareModal"

const DAILY_SETTINGS: GameSettings = {
  versionRange: { min: "maimai", max: "舞萌DX 2026" },
  genres: [],
  masterLevelRange: { min: "10+", max: "14+" },
  maxGuesses: 6,
  topSongs: 100,
  timeLimit: 0,
}

const SESSION_STORAGE_KEY = "maimai_daily_session_v1"

function emptyGameState(targetSong: Song | null = null): GameState {
  return { targetSong, guesses: [], gameOver: false, won: false, remainingTime: 0 }
}

function millisecondsUntilShanghaiMidnight(now = new Date()): number {
  const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return Math.max(
    0,
    Date.UTC(shanghaiNow.getUTCFullYear(), shanghaiNow.getUTCMonth(), shanghaiNow.getUTCDate() + 1) -
      8 * 60 * 60 * 1000 -
      now.getTime(),
  )
}

interface DailyGameProps {
  onBack: () => void
  initialSongs: Song[]
}

type DailyMode = "loading" | "online"

export default function DailyGame({ onBack, initialSongs }: DailyGameProps) {
  const [todayDate, setTodayDate] = useState(() => getShanghaiDate())
  const todayDateRef = useRef(todayDate)
  const modeRef = useRef<DailyMode>("loading")
  const mutationVersionRef = useRef(0)
  const silentReloadRef = useRef(false)
  const latestFeedbackRef = useRef<HTMLDivElement>(null)
  const shouldScrollFeedbackRef = useRef(false)
  const [songs] = useState(initialSongs)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [mode, setMode] = useState<DailyMode>("loading")
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState>(() => emptyGameState())
  const [reverseOrder, setReverseOrder] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [dailyLoading, setDailyLoading] = useState(true)
  const [dailyError, setDailyError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [endReason, setEndReason] = useState<ResultEndReason | null>(null)

  useEffect(() => {
    const checkDate = () => {
      const currentDate = getShanghaiDate()
      if (todayDateRef.current !== currentDate) {
        todayDateRef.current = currentDate
        modeRef.current = "loading"
        setMode("loading")
        setSessionToken(null)
        setGameState(emptyGameState())
        setEndReason(null)
        setShowShareModal(false)
        setDailyLoading(true)
        setTodayDate(currentDate)
      } else if (modeRef.current === "online") {
        silentReloadRef.current = true
        setReloadKey((key) => key + 1)
      }
    }
    const timer = window.setTimeout(checkDate, millisecondsUntilShanghaiMidnight() + 50)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkDate()
    }
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [todayDate])

  useEffect(() => {
    const silentReload = silentReloadRef.current
    silentReloadRef.current = false
    if (songs.length === 0) {
      setFilteredSongs([])
      setDailyError(null)
      setDailyLoading(false)
      return
    }
    const pool = filterSongs(songs, DAILY_SETTINGS)
    setFilteredSongs(pool)
    if (pool.length === 0) {
      modeRef.current = "loading"
      setMode("loading")
      setSessionToken(null)
      setDailyError(null)
      setDailyLoading(false)
      return
    }
    if (!silentReload) {
      setDailyLoading(true)
      setDailyError(null)
    }
    let cancelled = false
    let savedToken: string | undefined
    try {
      savedToken = localStorage.getItem(SESSION_STORAGE_KEY) || undefined
    } catch {}

    const mutationVersion = mutationVersionRef.current
    const restoreSession = fetchDailySession(savedToken).catch(async (error) => {
      if (!savedToken) throw error
      try {
        localStorage.removeItem(SESSION_STORAGE_KEY)
      } catch {}
      return fetchDailySession()
    })

    void restoreSession
      .then((session) => {
        if (cancelled || mutationVersion !== mutationVersionRef.current) return
        todayDateRef.current = session.date
        modeRef.current = "online"
        setTodayDate(session.date)
        setMode("online")
        setSessionToken(session.sessionToken)
        setDailyError(null)
        setEndReason(
          !session.gameOver
            ? null
            : session.won
              ? "won"
              : session.guesses.length >= DAILY_SETTINGS.maxGuesses
                ? "max-guesses"
                : "give-up",
        )
        setGameState({
          targetSong: session.answer || null,
          guesses: session.guesses,
          gameOver: session.gameOver,
          won: session.won,
          remainingTime: 0,
        })
        try {
          localStorage.setItem(SESSION_STORAGE_KEY, session.sessionToken)
          localStorage.removeItem(`maimai_daily_${session.date}`)
        } catch {}
      })
      .catch((error) => {
        if (cancelled) return
        if (!silentReload) {
          setDailyError(error instanceof Error ? error.message : "权威每日题目加载失败，请检查网络后重试")
        }
      })
      .finally(() => {
        if (!cancelled && !silentReload) setDailyLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [songs, todayDate, reloadKey])

  const makeGuess = async (song: Song) => {
    if (submitting || gameState.gameOver) return false
    if (gameState.guesses.some((guess) => guess.song.id === song.id)) {
      toast.info("你已经猜过这首歌曲了！")
      return false
    }

    if (mode === "online" && sessionToken) {
      mutationVersionRef.current++
      setSubmitting(true)
      try {
        const result = await submitDailyGuess(sessionToken, song.id)
        setDailyError(null)
        shouldScrollFeedbackRef.current = true
        if (result.gameOver) setEndReason(result.won ? "won" : "max-guesses")
        setGameState((previous) => ({
          ...previous,
          targetSong: result.answer || null,
          guesses: [...previous.guesses, result.guess],
          gameOver: result.gameOver,
          won: result.won,
        }))
        if (result.won) {
          toast.success("恭喜你猜对了今日挑战！🎉")
        } else if (result.gameOver) {
          toast.error("今日挑战机会已用尽")
        }
        return true
      } catch (error) {
        setDailyError(error instanceof Error ? error.message : "提交猜测失败，请重试")
        return false
      } finally {
        setSubmitting(false)
      }
    }
    return false
  }

  useEffect(() => {
    if (!shouldScrollFeedbackRef.current) return
    shouldScrollFeedbackRef.current = false
    const frame = window.requestAnimationFrame(() => {
      latestFeedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [gameState.guesses.length])

  const giveUp = async () => {
    if (submitting || gameState.gameOver) return
    if (!window.confirm("投降后今天无法重新开始，确定投降吗？")) return
    if (mode === "online" && sessionToken) {
      mutationVersionRef.current++
      setSubmitting(true)
      try {
        const session = await giveUpDaily(sessionToken)
        setDailyError(null)
        setEndReason("give-up")
        setGameState({
          targetSong: session.answer || null,
          guesses: session.guesses,
          gameOver: session.gameOver,
          won: session.won,
          remainingTime: 0,
        })
      } catch (error) {
        setDailyError(error instanceof Error ? error.message : "投降失败，请重试")
      } finally {
        setSubmitting(false)
      }
      return
    }
  }

  const ready = !dailyLoading && mode === "online" && Boolean(sessionToken)
  const displayedGuesses = reverseOrder ? [...gameState.guesses].reverse() : gameState.guesses
  const latestGuessId = gameState.guesses.at(-1)?.song.id

  return (
    <div className="motion-page w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50">
      <div className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white flex justify-between items-center shadow-xs rounded-t-2xl">
        <button type="button" onClick={onBack} className="p-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer" title="返回主菜单">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-lg font-bold text-center tracking-wide">
          每日一首 <span className="text-xs font-normal opacity-90">({todayDate})</span>
        </h1>
        <div className="w-9" />
      </div>

      <div className="p-4 md:p-6">
        {dailyLoading ? (
          <div className="text-center text-gray-500 py-12">正在加载...</div>
        ) : !ready ? (
          <div className="text-center text-gray-500 py-12">
            {dailyError ? (
              <>
                <p className="text-red-700">{dailyError}</p>
                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="mt-3 font-semibold text-red-700 underline cursor-pointer">
                  重试
                </button>
              </>
            ) : filteredSongs.length === 0 ? (
              "当前曲库没有可用于每日挑战的歌曲"
            ) : (
              "今日挑战暂不可用，请稍后重试"
            )}
          </div>
        ) : (
          <>
            {dailyError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-xs text-red-700">
                {dailyError}{" "}
                <button type="button" onClick={() => setReloadKey((key) => key + 1)} className="font-semibold underline cursor-pointer">
                  重试
                </button>
              </div>
            )}
            <div className="mb-4">
              <div className="text-center text-xs md:text-sm text-gray-700 mb-3">
                <span className="font-semibold text-gray-900">今日机会: </span>
                <strong className="text-teal-600 font-bold">{gameState.guesses.length}</strong> / {DAILY_SETTINGS.maxGuesses}
              </div>
              <div className="flex justify-center gap-3 flex-wrap">
                {!gameState.gameOver && (
                  <button type="button" onClick={giveUp} disabled={submitting} className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg border border-red-200 disabled:opacity-50 cursor-pointer">
                    <Flag className="h-3.5 w-3.5" />投降
                  </button>
                )}
                <button type="button" onClick={() => setReverseOrder((previous) => !previous)} className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg border border-gray-200 cursor-pointer">
                  {reverseOrder ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  <span>{reverseOrder ? "最新在上" : "最新在下"}</span>
                </button>
                {gameState.gameOver && (
                  <button type="button" onClick={() => setShowShareModal(true)} className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg shadow-xs cursor-pointer">
                    <Share2 className="h-3.5 w-3.5" />分享结果
                  </button>
                )}
              </div>
            </div>

            {!gameState.gameOver && (
              <div className="mb-5">
                <SearchBox
                  songs={filteredSongs}
                  guessedSongIds={gameState.guesses.map((guess) => guess.song.id)}
                  onSelect={makeGuess}
                />
              </div>
            )}

            {gameState.gameOver && gameState.targetSong && (
              <ResultScreen
                won={gameState.won}
                targetSong={gameState.targetSong}
                guessCount={gameState.guesses.length}
                maxGuesses={DAILY_SETTINGS.maxGuesses}
                onNewGame={() => {}}
                isDaily
                onShare={() => setShowShareModal(true)}
                endReason={endReason || undefined}
              />
            )}

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

      {showShareModal && (
        <DailyShareModal
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
