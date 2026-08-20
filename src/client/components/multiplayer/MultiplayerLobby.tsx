import { useState, useEffect } from "react"
import { ArrowLeft, Settings, Copy, Check, Shuffle, LogIn, Plus } from "lucide-react"
import { toast } from "sonner"
import type { BestOf, GameSettings, MultiplayerRoom, Song } from "../../../shared/types"
import { MULTIPLAYER_DEFAULT_SETTINGS } from "../../../shared/domain/presets"
import { socket } from "../../services/socket"
import SettingsPanel from "../singleplayer/SettingsPanel"
import PlayerList from "./PlayerList"

const NICKNAME_STORAGE_KEY = "maimai_wordle_nickname"

interface MultiplayerLobbyProps {
  onStartGame: (room: MultiplayerRoom) => void
  onBack: () => void
  initialSongs: Song[]
}

export default function MultiplayerLobby({
  onStartGame,
  onBack,
}: MultiplayerLobbyProps) {
  const [nickname, setNickname] = useState(() => {
    try {
      return localStorage.getItem(NICKNAME_STORAGE_KEY) || ""
    } catch (e) {
      return ""
    }
  })
  const [roomIdInput, setRoomIdInput] = useState("")
  const [bestOf, setBestOf] = useState<BestOf>(3)
  const [isPublic, setIsPublic] = useState(false)
  const [settings, setSettings] = useState<GameSettings>(MULTIPLAYER_DEFAULT_SETTINGS)
  const [showSettings, setShowSettings] = useState(false)
  const [room, setRoom] = useState<MultiplayerRoom | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)

  const saveNickname = (name: string) => {
    const trimmed = name.trim()
    if (trimmed) {
      setNickname(trimmed)
      try {
        localStorage.setItem(NICKNAME_STORAGE_KEY, trimmed)
      } catch (e) {}
    }
  }

  useEffect(() => {
    socket.on("room_created", ({ roomId, room: r, sessionToken }) => {
      setRoom(r)
      if (sessionToken) {
        try {
          sessionStorage.setItem("maimai_multi_token", sessionToken)
        } catch (e) {}
      }
      toast.success(`房间创建成功！房间号: ${roomId}`)
    })

    socket.on("room_joined", ({ room: r, sessionToken }) => {
      setRoom(r)
      if (sessionToken) {
        try {
          sessionStorage.setItem("maimai_multi_token", sessionToken)
        } catch (e) {}
      }
      toast.success(`成功加入房间: ${r.id}`)
    })

    socket.on("player_joined", ({ room: r, playerId }) => {
      setRoom(r)
      const p = r.players[playerId]
      if (p && playerId !== socket.id) {
        toast.info(`${p.nickname} 加入了房间`)
      }
    })

    socket.on("player_left", ({ room: r, playerId, playerName }) => {
      setRoom(r)
      if (playerId !== socket.id) {
        toast.info(`${playerName} 离开了房间`)
      }
    })

    socket.on("player_removed", ({ room: r, playerId, playerName }) => {
      if (playerId === socket.id) {
        setRoom(null)
        toast.error("你已被房主移出房间")
      } else {
        setRoom(r)
        toast.info(`${playerName} 已被移出房间`)
      }
    })

    socket.on("player_ready", ({ room: r }) => {
      setRoom(r)
    })

    socket.on("host_changed", ({ room: r }) => {
      setRoom(r)
      if (r.host === socket.id) {
        toast.success("原房主已离开，你已成为新房主！👑")
      }
    })

    socket.on("game_started", ({ room: r }) => {
      onStartGame(r)
    })

    socket.on("room_error", ({ message }) => {
      toast.error(message || "发生错误")
    })

    return () => {
      socket.off("room_created")
      socket.off("room_joined")
      socket.off("player_joined")
      socket.off("player_left")
      socket.off("player_removed")
      socket.off("player_ready")
      socket.off("host_changed")
      socket.off("game_started")
      socket.off("room_error")
    }
  }, [onStartGame])

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      toast.error("请先输入你的玩家昵称")
      return
    }
    saveNickname(nickname)
    socket.emit("create_room", {
      nickname: nickname.trim(),
      settings,
      bestOf: Number(bestOf),
      isPublic,
    })
  }

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      toast.error("请先输入你的玩家昵称")
      return
    }
    if (!roomIdInput.trim()) {
      toast.error("请输入 6 位房间号")
      return
    }
    saveNickname(nickname)
    socket.emit("join_room", {
      roomId: roomIdInput.trim().toUpperCase(),
      nickname: nickname.trim(),
    })
  }

  const handleJoinRandom = () => {
    if (!nickname.trim()) {
      toast.error("请先输入你的玩家昵称")
      return
    }
    saveNickname(nickname)
    socket.emit("join_random_room", {
      nickname: nickname.trim(),
    })
  }

  const handleToggleReady = () => {
    if (!room) return
    socket.emit("toggle_ready", { roomId: room.id })
  }

  const handleStartGame = () => {
    if (!room) return
    socket.emit("start_game", { roomId: room.id })
  }

  const handleRemovePlayer = (playerId: string) => {
    if (!room) return
    socket.emit("remove_player", { roomId: room.id, playerId })
  }

  const handleLeaveRoom = () => {
    if (room) {
      socket.emit("leave_room", { roomId: room.id })
    }
    setRoom(null)
  }

  const copyRoomCode = () => {
    if (!room) return
    navigator.clipboard.writeText(room.id)
    setCopiedCode(true)
    toast.success("房间号已复制！")
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const isHost = room?.host === socket.id
  const players = room ? Object.values(room.players) : []
  const canStart =
    isHost &&
    players.length >= 2 &&
    players.every((p) => p.id === room?.host || p.isReady)

  return (
    <div className="w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 animate-in fade-in duration-200">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex justify-between items-center shadow-xs">
        <button
          type="button"
          onClick={room ? handleLeaveRoom : onBack}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          title="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold text-center tracking-wide">
          {room ? `对战房间 #${room.id}` : "多人联机对战大厅"}
        </h1>

        {!room ? (
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
            title="预设创建房间规则"
          >
            <Settings className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" />
        )}
      </div>

      <div className="p-4 md:p-6">
        {!room ? (
          /* 大厅准备/创建/加入界面 */
          <div className="space-y-6 max-w-xl mx-auto">
            {/* 昵称输入 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 block">玩家昵称</label>
              <input
                type="text"
                placeholder="输入你的游戏昵称..."
                maxLength={20}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* 创建房间 */}
            <div className="p-5 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-indigo-950 flex items-center gap-1.5">
                  <Plus className="h-4 w-4 text-indigo-600" />
                  创建新房间
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  ⚙️ 调整出题范围
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="text-gray-600 block mb-1">赛制规则</label>
                  <select
                    value={bestOf}
                    onChange={(e) => setBestOf(Number(e.target.value) as BestOf)}
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 bg-white"
                  >
                    <option value={1}>抢 1 胜制 (一局定胜负)</option>
                    <option value={3}>抢 2 胜制 (3局2胜)</option>
                    <option value={5}>抢 3 胜制 (5局3胜)</option>
                    <option value={7}>抢 4 胜制 (7局4胜)</option>
                    <option value={9}>抢 5 胜制 (9局5胜)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg border border-gray-200 bg-white mt-4">
                  <span className="text-gray-700 font-medium">公开房间</span>
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
              >
                创建房间
              </button>
            </div>

            {/* 加入房间 */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-gray-600" />
                加入已有房间
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入 6 位房间号码..."
                  maxLength={6}
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-300 bg-white font-mono text-sm tracking-widest text-center uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  className="px-6 h-11 bg-gray-900 text-white font-medium text-xs rounded-xl hover:bg-black transition-colors cursor-pointer shrink-0"
                >
                  加入
                </button>
              </div>

              <button
                type="button"
                onClick={handleJoinRandom}
                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-medium text-xs rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
              >
                <Shuffle className="h-4 w-4 text-teal-600" />
                随机匹配公开房间
              </button>
            </div>
          </div>
        ) : (
          /* 房间等待大厅 */
          <div className="space-y-6 max-w-xl mx-auto">
            {/* 房间号与复制卡片 */}
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-2xs font-semibold text-indigo-500 uppercase tracking-wider">房间代码</div>
                <div className="font-mono text-2xl font-bold text-indigo-950 tracking-wider">{room.id}</div>
              </div>

              <button
                type="button"
                onClick={copyRoomCode}
                className="flex items-center gap-1 px-3 py-2 bg-white text-indigo-700 border border-indigo-200 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors cursor-pointer shadow-2xs"
              >
                {copiedCode ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                {copiedCode ? "已复制" : "复制房号"}
              </button>
            </div>

            {/* 房间信息 */}
            <div className="text-xs text-gray-500 flex justify-between px-1">
              <span>赛制: 抢 {Math.floor(room.bestOf / 2) + 1} 胜 (最多 {room.bestOf} 轮)</span>
              <span>人数: {Object.keys(room.players).length} / 6</span>
            </div>

            {/* 玩家列表 */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">玩家列表</h3>
              <PlayerList
                players={room.players}
                hostId={room.host}
                currentPlayerId={socket.id || ""}
                playerAvatars={room.playerAvatars}
                onRemovePlayer={isHost ? handleRemovePlayer : undefined}
                isGameStarted={false}
              />
            </div>

            {/* 准备 / 开始按钮 */}
            <div className="pt-2">
              {isHost ? (
                <button
                  type="button"
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm rounded-xl hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md cursor-pointer"
                >
                  {players.length < 2
                    ? "等待其他玩家加入 (至少2人)..."
                    : !canStart
                      ? "等待所有玩家准备就绪..."
                      : "开始对战！🚀"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer ${
                    room.players[socket.id || ""]?.isReady
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-gradient-to-r from-green-500 to-teal-500 text-white hover:opacity-95"
                  }`}
                >
                  {room.players[socket.id || ""]?.isReady ? "取消准备" : "准备就绪！✨"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onApply={(newS) => {
            setSettings(newS)
            setShowSettings(false)
          }}
          onClose={() => setShowSettings(false)}
          isMultiplayer={true}
        />
      )}
    </div>
  )
}
