import { useState, useEffect } from "react"
import { Toaster, toast } from "sonner"
import { Calendar, User, Users, HelpCircle, RefreshCw } from "lucide-react"
import type { MultiplayerRoom, Song } from "../shared/types"
import { clearClientCache, fetchSongs } from "./services/api"
import FixedBg from "./components/common/FixedBg"
import LoadingScreen from "./components/common/LoadingScreen"
import HelpModal from "./components/common/HelpModal"
import RoomStatus from "./components/common/RoomStatus"
import GameBoard from "./components/singleplayer/GameBoard"
import DailyGame from "./components/daily/DailyGame"
import MultiplayerLobby from "./components/multiplayer/MultiplayerLobby"
import MultiplayerGame from "./components/multiplayer/MultiplayerGame"

type GameMode = "menu" | "singleplayer" | "daily" | "multiplayer-lobby" | "multiplayer-game"

export default function App() {
  const [mode, setMode] = useState<GameMode>("menu")
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showHelp, setShowHelp] = useState(false)
  const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null)

  // 视口高度适配
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty("--vh", `${vh}px`)
    }
    setVH()
    window.addEventListener("resize", setVH)
    return () => window.removeEventListener("resize", setVH)
  }, [])

  // 加载数据
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const data = await fetchSongs()
        if (mounted) {
          setSongs(data)
          setLoading(false)

          // 首次访问自动弹出帮助说明
          const hasVisited = localStorage.getItem("has_visited_maimai_wordle_v2")
          if (!hasVisited) {
            localStorage.setItem("has_visited_maimai_wordle_v2", "true")
            setShowHelp(true)
          }
        }
      } catch (err) {
        if (mounted) {
          toast.error("曲库加载失败，请检查网络连接后重试")
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
      clearClientCache()
      const data = await fetchSongs(true)
      setSongs(data)
      toast.success(`曲库数据已成功刷新！共加载 ${data.length} 首歌曲`)
    } catch (err) {
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
        <main className="min-h-[calc(var(--vh,1vh)*100)] py-12 px-4 flex flex-col items-center justify-center">
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
      <main className="min-h-[calc(var(--vh,1vh)*100)] py-8 md:py-16 px-3 md:px-6 flex flex-col items-center justify-center">
        <div className="w-full max-w-5xl">
          {mode === "menu" && (
            <div className="relative w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 animate-in fade-in duration-200">
              {/* 经典主标题 Banner */}
              <div className="relative p-5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white flex items-center justify-between shadow-xs">
                <button
                  type="button"
                  onClick={handleRefreshData}
                  disabled={refreshing}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer disabled:opacity-50"
                  title="强制刷新曲库数据"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
                </button>

                <h1 className="text-xl md:text-2xl font-black tracking-wider text-center drop-shadow-xs">
                  舞萌猜猜呗之潘一把
                </h1>

                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
                  title="玩法与规则帮助"
                >
                  <HelpCircle className="h-5 w-5" />
                </button>
              </div>

              {/* 游戏模式大按钮选择区 */}
              <div className="p-6 md:p-10 flex flex-col md:flex-row gap-4 justify-center text-center">
                <button
                  type="button"
                  onClick={() => setMode("daily")}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group"
                >
                  <Calendar className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">每日一首</span>
                  <span className="text-xs font-normal opacity-85">全服每日统一随机挑战</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("singleplayer")}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group"
                >
                  <User className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">单人练习</span>
                  <span className="text-xs font-normal opacity-85">自由设置出题范围与难度</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMode("multiplayer-lobby")}
                  className="flex-1 py-8 px-4 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex flex-col items-center justify-center gap-2 group"
                >
                  <Users className="h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="text-lg">多人联机</span>
                  <span className="text-xs font-normal opacity-85">创建房间与朋友实时抢答</span>
                </button>
              </div>

              {/* 实时房间状态 */}
              <div className="px-6 pb-6">
                <RoomStatus />
              </div>
            </div>
          )}

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
        </div>

        {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        <Toaster richColors position="top-center" />
      </main>
    </>
  )
}
