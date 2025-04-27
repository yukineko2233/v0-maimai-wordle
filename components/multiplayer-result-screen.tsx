"use client"

import type { MultiplayerRoom } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Trophy, Home } from "lucide-react"

interface MultiplayerResultScreenProps {
    room: MultiplayerRoom
    currentPlayerId: string
    onExit: () => void
}

export default function MultiplayerResultScreen({ room, currentPlayerId, onExit }: MultiplayerResultScreenProps) {
    const isWinner = room.winner === currentPlayerId
    const winner = room.players[room.winner || ""] || room.allParticipants[room.winner || ""]

    // 获取所有参与者的得分（包括已离开的玩家）
    const allPlayerScores = Object.values(room.allParticipants).map((player) => ({
        id: player.id,
        nickname: player.nickname,
        score: room.roundsWon[player.id] || 0,
        isCurrentPlayer: player.id === currentPlayerId,
        isWinner: player.id === room.winner,
        avatarId: player.avatarId || 1,
    }))

    // 检查是否因为玩家离开而结束游戏
    const isForfeit = Object.keys(room.players).length === 1

    // 按得分排序（从高到低）
    allPlayerScores.sort((a, b) => b.score - a.score)

    return (
        <div className="p-2 bg-gray-50 rounded-lg mb-5 text-center">
            <div className="mb-6">
                <div className="w-20 h-20 mx-auto bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center mb-4">
                    <Trophy className="h-10 w-10 text-white" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                    {isWinner ? "恭喜你赢得了比赛！" : `${winner?.nickname || "对手"} 赢得了比赛！`}
                </h2>
                {isForfeit && isWinner ? (
                    <p className="text-gray-600">其他玩家已离开游戏，你获得了胜利！</p>
                ) : (
                    <p className="text-gray-600">
                        最终比分: {allPlayerScores[0]?.nickname} {allPlayerScores[0]?.score} 分
                    </p>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">比赛详情</h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-4 gap-2 font-medium border-b pb-2 mb-2">
                        <div className="text-left col-span-2">玩家</div>
                        <div className="text-center">得分</div>
                        <div className="text-right">结果</div>
                    </div>
                    {allPlayerScores.map((player) => (
                        <div key={player.id} className="grid grid-cols-4 gap-2 py-2 items-center">
                            <div className="col-span-2 flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                                    <img src={`/chara0${player.avatarId}.png`} alt="avatar" className="w-full h-full object-cover" />
                                </div>
                                <div className="font-medium truncate">
                                    {player.nickname} {player.isCurrentPlayer && "(你)"}
                                </div>
                            </div>
                            <div className="text-center">{player.score}</div>
                            <div className="text-right">
                                {player.isWinner ? (
                                    <span className="text-green-600 font-medium">胜利</span>
                                ) : (
                                    <span className="text-gray-500">失败</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button onClick={onExit} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <Home className="mr-2 h-4 w-4" />
                返回主页
            </Button>
        </div>
    )
}
