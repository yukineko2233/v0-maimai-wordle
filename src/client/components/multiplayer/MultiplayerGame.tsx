import { useState, useEffect } from "react"
import { ArrowLeft, Flag, ArrowUp, ArrowDown, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { MultiplayerRoom, Song } from "../../../shared/types"
import { socket } from "../../services/socket"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import { SongCover } from "../game/SongCover"
import PlayerList from "./PlayerList"
import MultiplayerResultScreen from "./MultiplayerResultScreen"

interface MultiplayerGameProps {
  initialRoom: MultiplayerRoom
  onExit: () => void
}

export default function MultiplayerGame({
  initialRoom,
  onExit,
}: MultiplayerGameProps) {
  const [room, setRoom] = useState<MultiplayerRoom>(initialRoom)
  const [remainingTime, setRemainingTime] = useState(initialRoom.settings.timeLimit)
  const [reverseOrder, setReverseOrder] = useState(true)

  const currentPlayer = room.players[socket.id || ""] || {
    id: socket.id || "",
    nickname: "你",
    score: 0,
    online: true,
    currentRound: { guesses: [], gameOver: false, won: false, remainingTime: 0 },
    isReady: false,
    readyForNextRound: false,
  }

  useEffect(() => {
    socket.on("game_updated", ({ room: r }) => {
      setRoom(r)
    })

    socket.on("round_ended", ({ room: r, roundWinner, matchWinner, forfeit, message }) => {
      setRoom(r)
      if (forfeit) {
        toast.info(message || "有玩家离开游戏")
      } else if (roundWinner) {
        const wName = r.players[roundWinner]?.nickname || "玩家"
        toast.success(`第 ${r.currentRound} 轮结束：${wName} 获胜！🎉`)
      } else {
        toast.info(`第 ${r.currentRound} 轮结束：平局！`)
      }

      if (matchWinner) {
        const mName = r.players[matchWinner]?.nickname || "玩家"
        toast.success(`👑 比赛结束！${mName} 赢得了整场胜利！`)
      }
    })

    socket.on("next_round_started", ({ room: r }) => {
      setRoom(r)
      setRemainingTime(r.settings.timeLimit)
      toast.info(`第 ${r.currentRound} 轮开始！`)
    })

    socket.on("player_ready", ({ room: r }) => {
      setRoom(r)
    })

    socket.on("player_left", ({ room: r, playerName }) => {
      setRoom(r)
      toast.info(`${playerName} 离开了房间`)
    })

    socket.on("reconnected", ({ room: r, sessionToken }) => {
      setRoom(r)
      if (sessionToken) {
        try {
          sessionStorage.setItem("maimai_multi_token", sessionToken)
        } catch (e) {}
      }
      toast.success("已恢复网络连接！")
    })

    socket.on("player_reconnected", ({ room: r, playerId }) => {
      setRoom(r)
      const p = r.players[playerId]
      if (p && playerId !== socket.id) {
        toast.info(`${p.nickname} 已重新连线`)
      }
    })

    socket.on("guess_error", ({ message }) => {
      toast.error(message || "猜测错误")
    })

    return () => {
      socket.off("game_updated")
      socket.off("round_ended")
      socket.off("next_round_started")
      socket.off("player_ready")
      socket.off("player_left")
      socket.off("reconnected")
      socket.off("player_reconnected")
      socket.off("guess_error")
    }
  }, [])

  // 倒计时
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null
    if (
      room.settings.timeLimit > 0 &&
      remainingTime > 0 &&
      !currentPlayer.currentRound?.gameOver &&
      room.status === "playing"
    ) {
      timer = setTimeout(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            socket.emit("give_up", { roomId: room.id })
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [remainingTime, currentPlayer, room.status, room.id, room.settings.timeLimit])

  const makeGuess = (song: Song) => {
    socket.emit("make_guess", {
      roomId: room.id,
      songId: song.id,
    })
  }

  const giveUp = () => {
    socket.emit("give_up", {
      roomId: room.id,
    })
  }

  const readyForNextRound = () => {
    socket.emit("ready_next_round", {
      roomId: room.id,
    })
  }

  const exitGame = () => {
    try {
      sessionStorage.removeItem("maimai_multi_token")
    } catch (e) {}
    if (room && room.id) {
      socket.emit("leave_room", { roomId: room.id })
    }
    onExit()
  }

  const isRoundOver =
    Object.values(room.players).every((p) => p.currentRound?.gameOver) && room.status === "playing"
  const isMatchFinished = room.status === "finished"

  return (
    <div className="w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 animate-in fade-in duration-200">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center shadow-xs rounded-t-2xl">
        <button
          type="button"
          onClick={exitGame}
          className="flex items-center gap-1 text-xs font-medium text-white/90 hover:text-white px-2.5 py-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
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
              <span className="text-gray-500 font-medium">无限</span>
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
              onClick={giveUp}
              className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-red-200"
            >
              <Flag className="h-3.5 w-3.5" />
              投降
            </button>
          </div>
        )}

        {/* 浮动搜索候选框 */}
        {!currentPlayer.currentRound?.gameOver && !isRoundOver && !isMatchFinished && (
          <div className="mb-5">
            <SearchBox
              songs={room.filteredSongs}
              onSelect={makeGuess}
              disabled={currentPlayer.currentRound?.gameOver}
            />
          </div>
        )}

        {/* 本轮结束面板 */}
        {isRoundOver && !isMatchFinished && room.targetSong && (
          <div className="mb-5 p-5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-center shadow-xs animate-in fade-in duration-200">
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
              disabled={currentPlayer.readyForNextRound}
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
          </div>
        )}

        {/* 比赛结算面板 */}
        {isMatchFinished && (
          <MultiplayerResultScreen room={room} currentPlayerId={socket.id || ""} onExit={exitGame} />
        )}

        {/* 猜测记录列表 */}
        <div className={`gap-3 flex ${reverseOrder ? "flex-col" : "flex-col-reverse"}`}>
          {currentPlayer.currentRound?.guesses.map((guess) => (
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
            currentPlayerId={socket.id || ""}
            playerAvatars={room.playerAvatars}
            isGameStarted={true}
            showReadyStatus={isRoundOver}
          />
        </div>
      </div>
    </div>
  )
}
