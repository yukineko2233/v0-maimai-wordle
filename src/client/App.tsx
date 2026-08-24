import { lazy, Suspense, useState, useEffect, useRef } from "react"
import { Toaster, toast } from "sonner"
import { Calendar, User, Users, HelpCircle, RefreshCw } from "lucide-react"
import type { MultiplayerRoom, Song } from "../shared/types"
import { fetchSongs } from "./services/api"
import FixedBg from "./components/common/FixedBg"
import LoadingScreen from "./components/common/LoadingScreen"
import HelpModal from "./components/common/HelpModal"
import RoomStatus from "./components/common/RoomStatus"
import ModeErrorBoundary from "./components/common/ModeErrorBoundary"
import { onMultiplayerSessionLost, onMultiplayerSessionRestored } from "./services/socket"

const GameBoard = lazy(() => import("./components/singleplayer/GameBoard"))
const DailyGame = lazy(() => import("./components/daily/DailyGame"))
const MultiplayerLobby = lazy(() => import("./components/multiplayer/MultiplayerLobby"))
const MultiplayerGame = lazy(() => import("./components/multiplayer/MultiplayerGame"))

type GameMode = "menu" | "singleplayer" | "daily" | "multiplayer-lobby" | "multiplayer-game"

export default function App() {
  const [mode, setMode] = useState<GameMode>("menu")
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null)
  const modeRef = useRef<GameMode>(mode)

  useEffect(() => {
    modeRef.current = mode
  }, [mode])

  useEffect(() => {
    const unsubscribeRestore = onMultiplayerSessionRestored(({ room }) => {
      setMultiplayerRoom(room)
      setMode(room.status === "waiting" ? "multiplayer-lobby" : "multiplayer-game")
      if (modeRef.current === "menu") toast.success("已恢复上一次多人会话")
    })
    const unsubscribeLost = onMultiplayerSessionLost((message) => {
      setMultiplayerRoom(null)
      if (modeRef.current === "multiplayer-lobby" || modeRef.current === "multiplayer-game") {
        setMode("menu")
      } else {
        toast.error(message)
      }
    })
    return () => {
      unsubscribeRestore()
      unsubscribeLost()
    }
  }, [])

  // 加载数据
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const { songs: data, isOfflineCache } = await fetchSongs()
        if (mounted) {
          setSongs(data)
          setLoading(false)
          setLoadError(null)

          if (isOfflineCache) {
            toast.warning("🌐 当前为离线缓存模式，曲库数据可能不是最新版本")
          }

          // 首次访问自动弹出帮助说明
          try {
            const hasVisited = localStorage.getItem("has_visited_maimai_wordle_v2")
            if (!hasVisited) {
              localStorage.setItem("has_visited_maimai_wordle_v2", "true")
              setShowHelp(true)
            }
          } catch (storageError) {}
        }
      } catch (err) {
        if (mounted) {
          toast.error("曲库加载失败，请检查网络连接后重试")
          setLoadError("曲库加载失败，请检查网络连接后重试。")
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [])

  const handleRefreshData = async () => {
    setRefreshing(true)
    try {
      const { songs: data, isOfflineCache } = await fetchSongs(true)
      setSongs(data)
      if (isOfflineCache) {
        setLoadError("刷新失败，已保留并继续使用上一次成功加载的曲库。")
        toast.warning("刷新失败，已保留旧曲库")
      } else {
        setLoadError(null)
        toast.success(`曲库数据已成功刷新！共加载 ${data.length} 首歌曲`)
      }
    } catch (err) {
      setLoadError("曲库加载失败，请检查网络连接后重试。")
      toast.error("刷新失败，请稍后再试")
    } finally {
      setRefreshing(false)
    }
  }

  const handleStartMultiplayer = (room: MultiplayerRoom) => {
    setMultiplayerRoom(room)
    setMode("multiplayer-game")
  }

  if (loading) {
    return (
      <>
        <FixedBg />
        <main className="min-h-[100dvh] py-12 px-4 flex flex-col items-center justify-center">
          <div className="w-full max-w-xl">
            <LoadingScreen />
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <FixedBg />
      <main className="min-h-[100dvh] py-8 md:py-16 px-3 md:px-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl">
          {mode === "menu" && (
            <div className="motion-menu relative w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50">
              {/* 经典主标题 Banner */}
              <div className="relative p-5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white flex items-center justify-between shadow-xs">
                <button
                  type="button"
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer disabled:opacity-50"
                  title="强制刷新曲库数据"
                  aria-label="重新同步服务器曲库"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                </button>

                <h1 className="text-xl md:text-2xl font-black tracking-wider text-center drop-shadow-xs">
                  舞萌猜猜呗
                </h1>

                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="玩法与规则帮助"
                  aria-label="打开玩法与规则帮助"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>

              {loadError && (
                <div className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span>{loadError}</span>
                  <button
                    type="button"
                    onClick={handleRefreshData}
                    disabled={refreshing}
                    className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
                  >
                    {refreshing ? "重试中..." : "重试加载"}
                  </button>
                </div>
              )}

              {/* 游戏模式大按钮选择区 */}
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-4 justify-center text-center">
                <button
                  type="button"
                  onClick={() => setMode("daily")}
                  disabled={songs.length === 0}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Calendar className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">每日一首</span>
                  <span className="text-xs font-normal opacity-85">前100热门中随机，每日共6次机会</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("singleplayer")}
                  disabled={songs.length === 0}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <User className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">单人练习</span>
                  <span className="text-xs font-normal opacity-85">自由设置难度</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("multiplayer-lobby")}
                  disabled={songs.length === 0}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                  <Users className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">多人联机</span>
                  <span className="text-xs font-normal opacity-85">创建房间，至多6人联机</span>
                </button>
              </div>

              {/* 实时房间状态 */}
              <div className="px-6 pb-6">
                <RoomStatus />
              </div>
            </div>
          )}

          <ModeErrorBoundary resetKey={mode} onBack={() => setMode("menu")}>
          <Suspense fallback={<div className="motion-page"><LoadingScreen /></div>}>
            {mode === "singleplayer" && (
              <GameBoard onBack={() => setMode("menu")} initialSongs={songs} />
            )}

            {mode === "daily" && (
              <DailyGame onBack={() => setMode("menu")} initialSongs={songs} />
            )}

            {mode === "multiplayer-lobby" && (
              <MultiplayerLobby
                onStartGame={handleStartMultiplayer}
                onBack={() => setMode("menu")}
                initialSongs={songs}
                initialRoom={multiplayerRoom}
                onRoomChange={setMultiplayerRoom}
              />
            )}

            {mode === "multiplayer-game" && multiplayerRoom && (
              <MultiplayerGame
                initialRoom={multiplayerRoom}
                onExit={() => {
                  setMultiplayerRoom(null)
                  setMode("menu")
                }}
              />
            )}
          </Suspense>
          </ModeErrorBoundary>
        </div>

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        <Toaster richColors position="top-center" />
      </main>
    </>
  )
}
