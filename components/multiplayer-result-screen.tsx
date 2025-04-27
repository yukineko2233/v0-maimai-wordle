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
    const winner = room.players[room.winner || ""]
    const players = Object.values(room.players)
    const isForfeit = Object.keys(room.players).length < 2 // Check if there's only one player left

    // Get scores
    const playerScores = players.map((player) => ({
        id: player.id,
        nickname: player.nickname,
        score: room.roundsWon[player.id] || 0,
        isCurrentPlayer: player.id === currentPlayerId,
        isWinner: player.id === room.winner,
    }))

    // Add the opponent who left if this was a forfeit
    if (isForfeit) {
        // Find the missing player's ID by checking which player ID is in roundsWon but not in players
        const opponentIds = Object.keys(room.roundsWon).filter((id) => !room.players[id])

        if (opponentIds.length > 0) {
            playerScores.push({
                id: "opponent-left",
                nickname: "对手 (已离开)",
                score: 0,
                isCurrentPlayer: false,
                isWinner: false,
            })
        }
    }

    // Sort by score (highest first)
    playerScores.sort((a, b) => b.score - a.score)

    // 确保点击按钮时正确调用onExit
    const handleExit = () => {
        // 明确调用退出函数
        onExit()
    }

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
                    <p className="text-gray-600">对手已离开游戏，你获得了胜利！</p>
                ) : (
                    <p className="text-gray-600">
                        最终比分: {playerScores[0].nickname} {playerScores[0].score} : {playerScores[1]?.score || 0}{" "}
                        {playerScores[1]?.nickname || "对手 (已离开)"}
                    </p>
                )}
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-medium mb-3">比赛详情</h3>
                <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="grid grid-cols-3 gap-2 font-medium border-b pb-2 mb-2">
                        <div className="text-left">玩家</div>
                        <div className="text-center">得分</div>
                        <div className="text-right">结果</div>
                    </div>
                    {playerScores.map((player) => (
                        <div key={player.id} className="grid grid-cols-3 gap-2 py-2">
                            <div className="text-left font-medium">
                                {player.nickname} {player.isCurrentPlayer && "(你)"}
                            </div>
                            <div className="text-center">{player.score}</div>
                            <div className="text-right">
                                {player.isWinner ? (
                                    <span className="text-green-600 font-medium">胜利</span>
                                ) : player.id === "opponent-left" ? (
                                    <span className="text-red-500">已离开</span>
                                ) : (
                                    <span className="text-gray-500">失败</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <Button onClick={handleExit} className="bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                <Home className="mr-2 h-4 w-4" />
                返回主页
            </Button>
        </div>
    )
}
