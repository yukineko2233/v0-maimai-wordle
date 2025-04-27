"use client"

import { Button } from "@/components/ui/button"
import PlayerAvatar from "@/components/player-avatar"
import { UserX } from "lucide-react"
import type { PlayerState } from "@/types/game"

interface PlayerListProps {
    players: Record<string, PlayerState>
    hostId: string
    currentPlayerId: string
    playerAvatars: Record<string, number>
    onRemovePlayer?: (playerId: string) => void
    isGameStarted?: boolean
    showReadyStatus?: boolean // 新增：是否显示准备状态
}

export default function PlayerList({
                                       players,
                                       hostId,
                                       currentPlayerId,
                                       playerAvatars,
                                       onRemovePlayer,
                                       isGameStarted = false,
                                       showReadyStatus = false, // 默认不显示准备状态
                                   }: PlayerListProps) {
    const isHost = currentPlayerId === hostId

    return (
        <div className="space-y-3">
            {Object.values(players).map((player) => (
                <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <PlayerAvatar
                        avatarId={playerAvatars[player.id] || 1}
                        nickname={player.nickname}
                        isHost={player.id === hostId}
                        isCurrentPlayer={player.id === currentPlayerId}
                        isReady={isGameStarted ? (showReadyStatus ? player.readyForNextRound : undefined) : player.isReady}
                    />

                    {isHost && player.id !== currentPlayerId && onRemovePlayer && !isGameStarted && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onRemovePlayer(player.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-100"
                        >
                            <UserX className="h-5 w-5" />
                        </Button>
                    )}

                    {isGameStarted && (
                        <div className="text-sm">
                            <span className="font-medium">得分: </span>
                            <span>{player.score}</span>
                            {player.currentRound.gameOver && (
                                <span
                                    className={`ml-2 px-2 py-1 rounded text-xs ${player.currentRound.won ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}
                                >
                  {player.currentRound.won ? "已猜出" : "已结束"}
                </span>
                            )}
                            {showReadyStatus && player.readyForNextRound && (
                                <span className="ml-2 px-2 py-1 rounded text-xs bg-green-100 text-green-800">已准备</span>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}
