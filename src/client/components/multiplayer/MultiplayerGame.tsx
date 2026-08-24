import { useState, useEffect, useRef } from "react"
import { ArrowLeft, Flag, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { MultiplayerRoom, Song } from "../../../shared/types"
import { MULTIPLAYER_ROUND_GRACE_MS } from "../../../shared/domain/game"
import {
  clearMultiplayerSession,
  emitSocketRequest,
  getMultiplayerPlayerId,
  getSocketConnectionState,
  onMultiplayerSessionLost,
  onMultiplayerSessionRestored,
  onSocketConnectionState,
  socket,
  type SocketConnectionState,
} from "../../services/socket"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import { SongCover } from "../game/SongCover"
import PlayerList from "./PlayerList"
import MultiplayerResultScreen from "./MultiplayerResultScreen"

interface MultiplayerGameProps {
  initialRoom: MultiplayerRoom
  onExit: () => void
}

function mergeRoom(current: MultiplayerRoom, update: MultiplayerRoom) {
  return { ...update, filteredSongs: update.filteredSongs ?? current.filteredSongs }
}

function connectionLabel(state: SocketConnectionState) {
  if (state === "connected") return "服务器已连接"
  if (state === "reconnecting") return "连接中断，正在重连..."
  if (state === "connecting") return "正在连接服务器..."
  return "服务器连接已断开"
}

export default function MultiplayerGame({
  initialRoom,
  onExit,
}: MultiplayerGameProps) {
  const [room, setRoom] = useState<MultiplayerRoom>(initialRoom)
  const [currentPlayerId, setCurrentPlayerId] = useState(getMultiplayerPlayerId)
  const [remainingTime, setRemainingTime] = useState(() =>
    initialRoom.roundDeadline === null
      ? initialRoom.settings.timeLimit
      : Math.min(
          initialRoom.settings.timeLimit,
          Math.max(
            0,
            Math.ceil((initialRoom.roundDeadline + MULTIPLAYER_ROUND_GRACE_MS - initialRoom.serverTime) / 1000),
          ),
        ),
  )
  const [reverseOrder, setReverseOrder] = useState(true)
  const [pendingAction, setPendingAction] = useState<"guess" | "give_up" | null>(null)
  const [connectionState, setConnectionState] = useState(getSocketConnectionState)
  const [nextRoundRemaining, setNextRoundRemaining] = useState(0)
  const roomRef = useRef(initialRoom)
  const currentPlayerIdRef = useRef(currentPlayerId)
  const reportedTimeoutRef = useRef<number | null>(null)

  const updateRoom = (update: MultiplayerRoom) => {
    const merged = mergeRoom(roomRef.current, update)
    roomRef.current = merged
    setRoom(merged)
    return merged
  }

  const currentPlayer = room.players[currentPlayerId] || {
    id: currentPlayerId,
    nickname: "你",
    score: 0,
    online: true,
    currentRound: { guesses: [], gameOver: false, won: false, remainingTime: 0 },
    isReady: false,
    readyForNextRound: false,
  }

  useEffect(() => {
    const onGameUpdated = ({ room: nextRoom }: { room: MultiplayerRoom }) => updateRoom(nextRoom)

    const onRoundEnded = ({ room: nextRoom, roundWinner, matchWinner, forfeit, message }: {
      room: MultiplayerRoom
      roundWinner?: string | null
      matchWinner?: string | null
      forfeit?: boolean
      message?: string
    }) => {
      const merged = updateRoom(nextRoom)
      setPendingAction(null)
      if (forfeit) {
        toast.info(message || "有玩家离开游戏")
      } else if (message) {
        toast.info(message)
      } else if (roundWinner) {
        const wName = merged.players[roundWinner]?.nickname || "玩家"
        toast.success(`第 ${merged.currentRound} 轮结束：${wName} 获胜！`)
      } else {
        toast.info(`第 ${merged.currentRound} 轮结束：平局！`)
      }

      if (matchWinner) {
        const mName = merged.players[matchWinner]?.nickname || "玩家"
        toast.success(`比赛结束！${mName} 赢得了整场胜利！`)
      }
    }

    const onNextRoundStarted = ({ room: nextRoom }: { room: MultiplayerRoom }) => {
      const merged = updateRoom(nextRoom)
      setPendingAction(null)
      toast.info(`第 ${merged.currentRound} 轮开始！`)
    }

    const onPlayerReady = ({ room: nextRoom }: { room: MultiplayerRoom }) => updateRoom(nextRoom)

    const onPlayerLeft = ({ room: nextRoom, playerName }: { room: MultiplayerRoom; playerName: string }) => {
      updateRoom(nextRoom)
      toast.info(`${playerName} 离开了房间`)
    }

    const unsubscribeRestore = onMultiplayerSessionRestored(({ room: nextRoom, playerId }) => {
      currentPlayerIdRef.current = playerId
      setCurrentPlayerId(playerId)
      updateRoom(nextRoom)
      setPendingAction(null)
      toast.success("已恢复网络连接！")
    })

    const unsubscribeSessionLost = onMultiplayerSessionLost((message) => {
      toast.error(message)
      onExit()
    })

    const unsubscribeConnection = onSocketConnectionState((state) => {
      setConnectionState(state)
      if (state !== "connected") setPendingAction(null)
    })

    const onPlayerDisconnected = ({ room: nextRoom, playerId }: { room: MultiplayerRoom; playerId: string }) => {
      const merged = updateRoom(nextRoom)
      const player = merged.players[playerId]
      if (player && playerId !== currentPlayerIdRef.current) toast.info(`${player.nickname} 已断线，等待重新连接`)
    }

    const onPlayerReconnected = ({ room: nextRoom, playerId }: { room: MultiplayerRoom; playerId: string }) => {
      const merged = updateRoom(nextRoom)
      const p = merged.players[playerId]
      if (p && playerId !== currentPlayerIdRef.current) {
        toast.info(`${p.nickname} 已重新连线`)
      }
    }

    const onGuessError = ({ message }: { message?: string }) => {
      setPendingAction(null)
      toast.error(message || "猜测错误")
    }

    socket.on("game_updated", onGameUpdated)
    socket.on("round_ended", onRoundEnded)
    socket.on("next_round_started", onNextRoundStarted)
    socket.on("player_ready", onPlayerReady)
    socket.on("player_left", onPlayerLeft)
    socket.on("player_disconnected", onPlayerDisconnected)
    socket.on("player_reconnected", onPlayerReconnected)
    socket.on("guess_error", onGuessError)

    return () => {
      socket.off("game_updated", onGameUpdated)
      socket.off("round_ended", onRoundEnded)
      socket.off("next_round_started", onNextRoundStarted)
      socket.off("player_ready", onPlayerReady)
      socket.off("player_left", onPlayerLeft)
      socket.off("player_disconnected", onPlayerDisconnected)
      socket.off("player_reconnected", onPlayerReconnected)
      socket.off("guess_error", onGuessError)
      unsubscribeRestore()
      unsubscribeSessionLost()
      unsubscribeConnection()
    }
  }, [onExit])

  // 倒计时
  useEffect(() => {
    if (room.roundDeadline === null) {
      reportedTimeoutRef.current = null
      setRemainingTime(room.settings.timeLimit)
      return
    }
    reportedTimeoutRef.current = null
    const duration = Math.min(
      room.settings.timeLimit * 1000,
      Math.max(0, room.roundDeadline + MULTIPLAYER_ROUND_GRACE_MS - room.serverTime),
    )
    const localDeadline = performance.now() + duration
    let timer: number | undefined
    const updateRemaining = () => {
      const next = Math.max(0, Math.ceil((localDeadline - performance.now()) / 1000))
      setRemainingTime(next)
      const latestRoom = roomRef.current
      const latestPlayer = latestRoom.players[currentPlayerIdRef.current]
      if (
        next === 0 &&
        !latestRoom.roundSettled &&
        !latestPlayer?.currentRound.gameOver &&
        reportedTimeoutRef.current !== room.roundDeadline
      ) {
        reportedTimeoutRef.current = room.roundDeadline
        void emitSocketRequest("round_time_expired", { roomId: room.id })
      }
      if (next === 0 && timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }
    updateRemaining()
    if (localDeadline > performance.now()) timer = window.setInterval(updateRemaining, 250)
    return () => {
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [room.id, room.roundDeadline, room.settings.timeLimit])

  useEffect(() => {
    const deadline = room.nextRoundDeadline
    if (!deadline || !room.roundSettled || room.status !== "playing") {
      setNextRoundRemaining(0)
      return
    }
    const localDeadline = performance.now() + Math.max(0, deadline - room.serverTime)
    let timer: number | undefined
    const updateRemaining = () => {
      const next = Math.max(0, Math.ceil((localDeadline - performance.now()) / 1000))
      setNextRoundRemaining(next)
      if (next === 0 && timer !== undefined) {
        window.clearInterval(timer)
        timer = undefined
      }
    }
    updateRemaining()
    if (localDeadline > performance.now()) timer = window.setInterval(updateRemaining, 250)
    return () => {
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [room.id, room.nextRoundDeadline, room.roundSettled, room.status])

  const makeGuess = async (song: Song) => {
    if (pendingAction || connectionState !== "connected" || (room.settings.timeLimit > 0 && remainingTime <= 0)) return false
    setPendingAction("guess")
    const result = await emitSocketRequest("make_guess", {
      roomId: room.id,
      songId: song.id,
    })
    setPendingAction(null)
    if (!result.ok) toast.error(result.message || "猜测提交失败，请重试")
    return result.ok
  }

  const giveUp = async () => {
    if (pendingAction || connectionState !== "connected" || (room.settings.timeLimit > 0 && remainingTime <= 0)) return
    if (!window.confirm("确定要投降本轮吗？你将无法继续作答，其他玩家仍可继续。")) return
    setPendingAction("give_up")
    const result = await emitSocketRequest("give_up", {
      roomId: room.id,
    })
    setPendingAction(null)
    if (!result.ok) toast.error(result.message || "投降请求失败，请重试")
  }

  const readyForNextRound = () => {
    if (connectionState !== "connected") {
      toast.error(connectionLabel(connectionState))
      return
    }
    socket.emit("ready_next_round", {
      roomId: room.id,
    })
  }

  const exitGame = () => {
    if (!isMatchFinished && !window.confirm("确定退出对战吗？离开可能会让其他玩家直接获胜。")) return
    try {
      clearMultiplayerSession()
    } catch (e) {}
    if (room && room.id) {
      socket.emit("leave_room", { roomId: room.id })
    }
    onExit()
  }

  const isRoundOver = room.roundSettled
  const isMatchFinished = room.status === "finished"
  const localTimeExpired = room.settings.timeLimit > 0 && remainingTime <= 0
  const canAct = !currentPlayer.currentRound?.gameOver && !isRoundOver && !isMatchFinished
    && !localTimeExpired && connectionState === "connected" && pendingAction === null
  const displayedGuesses = reverseOrder
    ? [...(currentPlayer.currentRound?.guesses || [])].reverse()
    : currentPlayer.currentRound?.guesses || []

  return (
    <div className="motion-page w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shadow-xs rounded-t-2xl">
        <button
          type="button"
          onClick={exitGame}
          className="min-h-11 flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white px-3 py-2 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          退出
        </button>

        <div className="text-center">
          <h2 className="text-base md:text-lg font-bold">第 {room.currentRound} 轮</h2>
          <div className="text-2xs text-blue-100">
            {Object.keys(room.players).length} 名玩家 | 先得 {Math.floor(room.bestOf / 2) + 1} 胜
          </div>
        </div>

        <div className="w-12" />
      </div>

      <div className="p-4 md:p-6">
        <div className={`mb-4 rounded-lg px-3 py-2 text-center text-xs font-medium ${
          connectionState === "connected"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-800"
        }`}>
          {connectionLabel(connectionState)}
        </div>
        {/* 状态统计 */}
        <div className="mb-4 flex justify-center gap-6 items-center text-xs md:text-sm text-gray-700">
          <div>
            <span className="font-semibold text-gray-900">已猜测: </span>
            <strong className="text-indigo-600 font-bold">
              {currentPlayer.currentRound?.guesses.length || 0}
            </strong>{" "}
            / {room.settings.maxGuesses}
          </div>
          <div>
            <span className="font-semibold text-gray-900">剩余时间: </span>
            {room.settings.timeLimit > 0 ? (
              <span className="font-medium text-indigo-700">{remainingTime} 秒</span>
            ) : (
              <span className="text-gray-500 font-medium">无限（整场最多 10 分钟）</span>
            )}
          </div>
        </div>

        {/* 控制按钮 */}
        {!currentPlayer.currentRound?.gameOver && !isRoundOver && !isMatchFinished && (
          <div className="mb-4 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setReverseOrder((prev) => !prev)}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-gray-200"
            >
              {reverseOrder ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
              <span>{reverseOrder ? "最新在上" : "最新在下"}</span>
            </button>

            <button
              type="button"
              onClick={() => void giveUp()}
              disabled={!canAct}
              className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Flag className="h-3.5 w-3.5" />
              {pendingAction === "give_up" ? "提交中..." : "投降"}
            </button>
          </div>
        )}

        {/* 浮动搜索候选框 */}
        {!currentPlayer.currentRound?.gameOver && !isRoundOver && !isMatchFinished && (
          <div className="mb-5">
            <SearchBox
              songs={room.filteredSongs}
              onSelect={makeGuess}
              guessedSongIds={currentPlayer.currentRound?.guesses.map((guess) => guess.song.id)}
              disabled={!canAct}
            />
            {localTimeExpired && <p className="mt-2 text-center text-xs text-amber-700">本轮时间已到，等待服务器结算...</p>}
          </div>
        )}

        {/* 本轮结束面板 */}
        {isRoundOver && !isMatchFinished && room.targetSong && (
          <div className="motion-round mb-5 p-5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-center shadow-xs">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {currentPlayer.currentRound?.won ? "🎉 你赢得了这一轮！" : "本轮结束"}
            </h3>
            <p className="text-xs text-gray-600 mb-3">正确答案是：</p>

            <div className="flex items-center gap-4 mb-4 p-3 bg-white rounded-xl border border-indigo-100 shadow-2xs max-w-md mx-auto justify-center">
              <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden">
                <SongCover songId={room.targetSong.id} title={room.targetSong.title} className="w-16 h-16 object-cover" />
              </div>
              <div className="text-left text-xs space-y-0.5 text-gray-700">
                <div className="font-bold text-gray-900 text-sm">{room.targetSong.title}</div>
                <div className="text-gray-500">{room.targetSong.artist}</div>
                <div className="text-2xs text-purple-700 font-semibold">
                  Master: {room.targetSong.masterLevel} | BPM: {room.targetSong.bpm}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={readyForNextRound}
              disabled={currentPlayer.readyForNextRound || connectionState !== "connected"}
              className={`px-6 py-2.5 text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer ${
                currentPlayer.readyForNextRound
                  ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                  : "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:opacity-90"
              }`}
            >
              {currentPlayer.readyForNextRound ? (
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  等待其他玩家就绪...
                </span>
              ) : (
                "准备下一轮！🔥"
              )}
            </button>
            <p className="mt-2 text-xs text-indigo-700">
              {nextRoundRemaining > 0 ? `服务器将在 ${nextRoundRemaining} 秒后自动开始下一轮` : "服务器会自动推进下一轮"}
            </p>
          </div>
        )}

        {/* 比赛结算面板 */}
        {isMatchFinished && (
          <MultiplayerResultScreen room={room} currentPlayerId={currentPlayerId} onExit={exitGame} />
        )}

        {/* 猜测记录列表 */}
        <div className="flex flex-col gap-3">
          {displayedGuesses.map((guess) => (
            <GuessRow key={guess.song.id} guess={guess} />
          ))}
        </div>

        {/* 实时对战玩家状态 */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="font-bold text-xs text-gray-600 uppercase tracking-wider mb-2.5">
            对战玩家列表
          </h3>
          <PlayerList
            players={room.players}
            hostId={room.host}
            currentPlayerId={currentPlayerId}
            playerAvatars={room.playerAvatars}
            isGameStarted={true}
            showReadyStatus={isRoundOver}
          />
        </div>
      </div>
    </div>
  )
}
