import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Settings, Copy, Check, Shuffle, LogIn, Plus } from "lucide-react"
import { toast } from "sonner"
import type { BestOf, GameSettings, MultiplayerRoom, Song } from "../../../shared/types"
import { MULTIPLAYER_DEFAULT_SETTINGS } from "../../../shared/domain/presets"
import {
  clearMultiplayerSession,
  emitSocketRequest,
  getMultiplayerPlayerId,
  getSocketConnectionState,
  onMultiplayerSessionLost,
  onMultiplayerSessionRestored,
  onSocketConnectionState,
  saveMultiplayerSession,
  socket,
  type SocketConnectionState,
} from "../../services/socket"
import SettingsPanel from "../singleplayer/SettingsPanel"
import PlayerList from "./PlayerList"

const NICKNAME_STORAGE_KEY = "maimai_wordle_nickname"

function mergeRoom(current: MultiplayerRoom | null, update: MultiplayerRoom) {
  if (!current) return update
  return { ...update, filteredSongs: update.filteredSongs ?? current.filteredSongs }
}

function connectionLabel(state: SocketConnectionState) {
  if (state === "connected") return "服务器已连接"
  if (state === "reconnecting") return "连接中断，正在重连..."
  if (state === "connecting") return "正在连接服务器..."
  return "服务器连接已断开"
}

interface MultiplayerLobbyProps {
  onStartGame: (room: MultiplayerRoom) => void
  onBack: () => void
  initialSongs: Song[]
  initialRoom?: MultiplayerRoom | null
  onRoomChange?: (room: MultiplayerRoom | null) => void
}

export default function MultiplayerLobby({
  onStartGame,
  onBack,
  initialRoom = null,
  onRoomChange,
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
  const [room, setRoom] = useState<MultiplayerRoom | null>(initialRoom)
  const [currentPlayerId, setCurrentPlayerId] = useState(getMultiplayerPlayerId)
  const [requestPending, setRequestPending] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [connectionState, setConnectionState] = useState(getSocketConnectionState)
  const roomRef = useRef<MultiplayerRoom | null>(initialRoom)
  const currentPlayerIdRef = useRef(currentPlayerId)
  const requestPendingRef = useRef(false)

  const updateRoom = (update: MultiplayerRoom) => {
    const merged = mergeRoom(roomRef.current, update)
    roomRef.current = merged
    setRoom(merged)
    onRoomChange?.(merged)
    return merged
  }

  const leaveRoomView = () => {
    roomRef.current = null
    setRoom(null)
    onRoomChange?.(null)
  }

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
    const onRoomCreated = ({ roomId, room: nextRoom, sessionToken, playerId }: {
      roomId: string
      room: MultiplayerRoom
      sessionToken: string
      playerId: string
    }) => {
      updateRoom(nextRoom)
      requestPendingRef.current = false
      setRequestPending(false)
      currentPlayerIdRef.current = playerId
      setCurrentPlayerId(playerId)
      saveMultiplayerSession(sessionToken, playerId)
      toast.success(`房间创建成功！房间号: ${roomId}`)
    }

    const onRoomJoined = ({ room: nextRoom, sessionToken, playerId }: {
      room: MultiplayerRoom
      sessionToken: string
      playerId: string
    }) => {
      updateRoom(nextRoom)
      requestPendingRef.current = false
      setRequestPending(false)
      currentPlayerIdRef.current = playerId
      setCurrentPlayerId(playerId)
      saveMultiplayerSession(sessionToken, playerId)
      toast.success(`成功加入房间: ${nextRoom.id}`)
    }

    const onPlayerJoined = ({ room: nextRoom, playerId }: { room: MultiplayerRoom; playerId: string }) => {
      const merged = updateRoom(nextRoom)
      const p = merged.players[playerId]
      if (p && playerId !== currentPlayerIdRef.current) {
        toast.info(`${p.nickname} 加入了房间`)
      }
    }

    const onPlayerLeft = ({ room: nextRoom, playerId, playerName }: { room: MultiplayerRoom; playerId: string; playerName: string }) => {
      updateRoom(nextRoom)
      if (playerId !== currentPlayerIdRef.current) {
        toast.info(`${playerName} 离开了房间`)
      }
    }

    const onPlayerRemoved = ({ room: nextRoom, playerId, playerName }: { room: MultiplayerRoom; playerId: string; playerName: string }) => {
      if (playerId === currentPlayerIdRef.current) {
        leaveRoomView()
        clearMultiplayerSession()
        toast.error("你已被房主移出房间")
      } else {
        updateRoom(nextRoom)
        toast.info(`${playerName} 已被移出房间`)
      }
    }

    const onPlayerReady = ({ room: nextRoom }: { room: MultiplayerRoom }) => updateRoom(nextRoom)

    const onHostChanged = ({ room: nextRoom }: { room: MultiplayerRoom }) => {
      const merged = updateRoom(nextRoom)
      if (merged.host === currentPlayerIdRef.current) {
        toast.success("原房主已离开，你已成为新房主！")
      }
    }

    const onGameStarted = ({ room: nextRoom }: { room: MultiplayerRoom }) => onStartGame(updateRoom(nextRoom))

    const unsubscribeRestore = onMultiplayerSessionRestored(({ room: nextRoom, playerId }) => {
      currentPlayerIdRef.current = playerId
      setCurrentPlayerId(playerId)
      updateRoom(nextRoom)
      toast.success("已恢复房间连接！")
      if (nextRoom.status !== "waiting") {
        onStartGame(nextRoom)
      }
    })

    const unsubscribeSessionLost = onMultiplayerSessionLost((message) => {
      leaveRoomView()
      currentPlayerIdRef.current = ""
      setCurrentPlayerId("")
      requestPendingRef.current = false
      setRequestPending(false)
      toast.error(message)
    })

    const unsubscribeConnection = onSocketConnectionState((state) => {
      setConnectionState(state)
      if (state !== "connected") {
        requestPendingRef.current = false
        setRequestPending(false)
      }
    })

    const onPlayerDisconnected = ({ room: nextRoom }: { room: MultiplayerRoom }) => updateRoom(nextRoom)
    const onPlayerReconnected = ({ room: nextRoom }: { room: MultiplayerRoom }) => updateRoom(nextRoom)

    const onRoomError = ({ message }: { message?: string }) => {
      requestPendingRef.current = false
      setRequestPending(false)
      toast.error(message || "发生错误")
    }

    socket.on("room_created", onRoomCreated)
    socket.on("room_joined", onRoomJoined)
    socket.on("player_joined", onPlayerJoined)
    socket.on("player_left", onPlayerLeft)
    socket.on("player_removed", onPlayerRemoved)
    socket.on("player_ready", onPlayerReady)
    socket.on("host_changed", onHostChanged)
    socket.on("game_started", onGameStarted)
    socket.on("player_disconnected", onPlayerDisconnected)
    socket.on("player_reconnected", onPlayerReconnected)
    socket.on("room_error", onRoomError)

    return () => {
      socket.off("room_created", onRoomCreated)
      socket.off("room_joined", onRoomJoined)
      socket.off("player_joined", onPlayerJoined)
      socket.off("player_left", onPlayerLeft)
      socket.off("player_removed", onPlayerRemoved)
      socket.off("player_ready", onPlayerReady)
      socket.off("host_changed", onHostChanged)
      socket.off("game_started", onGameStarted)
      socket.off("player_disconnected", onPlayerDisconnected)
      socket.off("player_reconnected", onPlayerReconnected)
      socket.off("room_error", onRoomError)
      unsubscribeRestore()
      unsubscribeSessionLost()
      unsubscribeConnection()
    }
  }, [onStartGame])

  const runLobbyRequest = async (event: string, data: unknown) => {
    if (connectionState !== "connected") {
      toast.error(connectionLabel(connectionState))
      return
    }
    if (requestPendingRef.current) return
    requestPendingRef.current = true
    setRequestPending(true)
    const result = await emitSocketRequest(event, data)
    requestPendingRef.current = false
    setRequestPending(false)
    if (!result.ok && (result.message?.includes("超时") || result.message?.includes("连接"))) {
      toast.error(result.message)
    }
  }

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      toast.error("请先输入你的玩家昵称")
      return
    }
    saveNickname(nickname)
    void runLobbyRequest("create_room", {
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
    void runLobbyRequest("join_room", {
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
    void runLobbyRequest("join_random_room", {
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
    const nickname = room.players[playerId]?.nickname || "该玩家"
    if (!window.confirm(`确定将 ${nickname} 移出房间吗？`)) return
    socket.emit("remove_player", { roomId: room.id, playerId })
  }

  const handleLeaveRoom = () => {
    if (room && !window.confirm("确定离开当前房间吗？")) return
    if (room) {
      socket.emit("leave_room", { roomId: room.id })
    }
    clearMultiplayerSession()
    leaveRoomView()
  }

  const copyRoomCode = async () => {
    if (!room) return
    try {
      let copied = false
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(room.id)
          copied = true
        } catch {}
      }
      if (!copied) {
        const input = document.createElement("textarea")
        input.value = room.id
        input.style.position = "fixed"
        input.style.opacity = "0"
        document.body.appendChild(input)
        input.focus()
        input.select()
        copied = document.execCommand("copy")
        input.remove()
        if (!copied) throw new Error("copy failed")
      }
      setCopiedCode(true)
      toast.success("房间号已复制！")
      window.setTimeout(() => setCopiedCode(false), 2000)
    } catch {
      toast.error(`复制失败，请手动复制房间号 ${room.id}`)
    }
  }

  const isHost = room?.host === currentPlayerId
  const players = room ? Object.values(room.players) : []
  const canStart =
    isHost &&
    connectionState === "connected" &&
    players.length >= 2 &&
    players.every((p) => p.online && (p.id === room?.host || p.isReady))
  const controlsDisabled = requestPending || connectionState !== "connected"

  return (
    <div className="motion-page w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex justify-between items-center shadow-xs rounded-t-2xl">
        <button
          type="button"
          onClick={room ? handleLeaveRoom : onBack}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          title="返回"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold text-center tracking-wide">
          {room ? `多人联机房间` : "多人联机"}
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
        <div className={`mb-4 rounded-lg px-3 py-2 text-center text-xs font-medium ${
          connectionState === "connected"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-800"
        }`}>
          {connectionLabel(connectionState)}
        </div>
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
                  ⚙️ 游戏设置
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
                    <option value={1}>先赢 1 局者胜</option>
                    <option value={3}>先赢 2 局者胜</option>
                    <option value={5}>先赢 3 局者胜</option>
                    <option value={7}>先赢 4 局者胜</option>
                    <option value={9}>先赢 5 局者胜</option>
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
                disabled={controlsDisabled}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm rounded-xl hover:opacity-95 transition-opacity shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                创建房间
              </button>
            </div>

            {/* 加入房间 */}
            <div className="p-5 bg-gray-50 border border-gray-200 rounded-2xl space-y-4">
              <h3 className="font-bold text-sm text-gray-900 flex items-center gap-1.5">
                <LogIn className="h-4 w-4 text-gray-600" />
                加入房间
              </h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入 6 位房间号码..."
                  maxLength={6}
                  value={roomIdInput}
                  onChange={(e) => setRoomIdInput(e.target.value.toUpperCase())}
                  className="w-full h-11 px-4 rounded-xl border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleJoinRoom}
                  disabled={controlsDisabled}
                  className="px-6 h-11 bg-gray-900 text-white font-medium text-xs rounded-xl hover:bg-black transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  加入
                </button>
              </div>

              <button
                type="button"
                onClick={handleJoinRandom}
                disabled={controlsDisabled}
                className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-medium text-xs rounded-xl hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
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
                {copiedCode ? "已复制" : "复制"}
              </button>
            </div>

            {/* 房间信息 */}
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600 space-y-1">
              <div className="font-bold text-gray-800">房间规则</div>
              <div>先赢 {Math.floor(room.bestOf / 2) + 1} 者胜 · {room.isPublic ? "公开" : "私密"}</div>
              <div>每轮: {room.settings.maxGuesses} 次猜测 · {room.settings.timeLimit > 0 ? `${room.settings.timeLimit} 秒` : "无限时间"} · 热度前 {room.settings.topSongs} 首</div>
              <div>版本: {room.settings.versionRange.min} 至 {room.settings.versionRange.max}</div>
              <div>Master等级: {room.settings.masterLevelRange.min} 至 {room.settings.masterLevelRange.max} · 分类: {room.settings.genres.length ? room.settings.genres.join("、") : "全部"}</div>
            </div>

            {/* 玩家列表 */}
            <div className="space-y-2">
              <h3 className="font-bold text-xs text-gray-700 uppercase tracking-wider">玩家列表 {Object.keys(room.players).length} / 6</h3>
              <PlayerList
                players={room.players}
                hostId={room.host}
                currentPlayerId={currentPlayerId}
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
                    ? "等待其他玩家加入..."
                    : !canStart
                      ? "等待所有玩家准备就绪..."
                      : "开始对战"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleToggleReady}
                  disabled={connectionState !== "connected"}
                  className={`w-full py-3.5 font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer ${
                    room.players[currentPlayerId]?.isReady
                      ? "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      : "bg-gradient-to-r from-green-500 to-teal-500 text-white hover:opacity-95"
                  }`}
                >
                  {room.players[currentPlayerId]?.isReady ? "取消准备" : "准备就绪"}
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
