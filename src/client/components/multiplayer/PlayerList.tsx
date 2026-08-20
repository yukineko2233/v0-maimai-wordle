import { UserX } from "lucide-react"
import type { PlayerState } from "../../../shared/types"
import PlayerAvatar from "./PlayerAvatar"

interface PlayerListProps {
  players: Record<string, PlayerState>
  hostId: string
  currentPlayerId: string
  playerAvatars: Record<string, number>
  onRemovePlayer?: (playerId: string) => void
  isGameStarted?: boolean
  showReadyStatus?: boolean
}

export default function PlayerList({
  players,
  hostId,
  currentPlayerId,
  playerAvatars,
  onRemovePlayer,
  isGameStarted = false,
  showReadyStatus = false,
}: PlayerListProps) {
  const isHost = currentPlayerId === hostId

  return (
    <div className="space-y-2.5">
      {Object.values(players).map((player) => {
        const isSelf = player.id === currentPlayerId
        const isPlayerHost = player.id === hostId

        return (
          <div
            key={player.id}
            className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
              isSelf ? "bg-pink-50/50 border-pink-200" : "bg-gray-50/80 border-gray-200"
            }`}
          >
            <PlayerAvatar
              avatarId={playerAvatars[player.id] || 1}
              nickname={player.nickname}
              isHost={isPlayerHost}
              isCurrentPlayer={isSelf}
              online={player.online}
              isReady={
                isGameStarted
                  ? showReadyStatus
                    ? player.readyForNextRound
                    : undefined
                  : player.isReady
              }
            />

            <div className="flex items-center gap-2">
              {/* 大厅准备状态 */}
              {!isGameStarted && !isPlayerHost && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    player.isReady ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {player.isReady ? "已准备" : "未准备"}
                </span>
              )}

              {/* 房主踢人按钮 */}
              {isHost && !isSelf && onRemovePlayer && !isGameStarted && (
                <button
                  type="button"
                  onClick={() => onRemovePlayer(player.id)}
                  className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                  title="移出房间"
                >
                  <UserX className="h-4 w-4" />
                </button>
              )}

              {/* 游戏中得分与本轮状态 */}
              {isGameStarted && (
                <div className="flex items-center gap-2 text-xs">
                  {player.currentRound?.gameOver && (
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-2xs ${
                        player.currentRound.won
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {player.currentRound.won ? "已猜出" : "本轮结束"}
                    </span>
                  )}
                  <span className="font-bold text-gray-900 text-sm">{player.score}</span>
                  <span className="text-gray-500 text-2xs">胜场</span>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
