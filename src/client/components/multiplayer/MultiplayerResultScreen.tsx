import { Trophy, Home } from "lucide-react"
import type { MultiplayerRoom } from "../../../shared/types"

interface MultiplayerResultScreenProps {
  room: MultiplayerRoom
  currentPlayerId: string
  onExit: () => void
}

export default function MultiplayerResultScreen({
  room,
  currentPlayerId,
  onExit,
}: MultiplayerResultScreenProps) {
  const isWinner = room.winner === currentPlayerId
  const winnerPlayer = room.players[room.winner || ""] || room.allParticipants[room.winner || ""]

  const allScores = Object.values(room.allParticipants).map((p) => ({
    id: p.id,
    nickname: p.nickname,
    score: room.roundsWon[p.id] || 0,
    isCurrent: p.id === currentPlayerId,
    isWinner: p.id === room.winner,
    avatarId: p.avatarId || 1,
  }))

  allScores.sort((a, b) => b.score - a.score)

  return (
    <div className="p-5 bg-gray-50/95 border border-gray-200 rounded-xl mb-5 text-center shadow-xs animate-in fade-in duration-200">
      <div className="mb-5">
        <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-amber-400 to-yellow-500 rounded-full flex items-center justify-center mb-3 shadow-md">
          <Trophy className="h-8 w-8 text-white" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-1">
          {isWinner ? "👑 恭喜你赢得了比赛！" : `${winnerPlayer?.nickname || "对手"} 赢得了比赛！`}
        </h2>

        <p className="text-xs text-gray-500">
          全场获胜目标: 先得 {Math.floor(room.bestOf / 2) + 1} 分
        </p>
      </div>

      <div className="mb-5">
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">比分排名</h3>
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-2xs">
          {allScores.map((p, rank) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 text-xs ${
                p.isCurrent ? "bg-pink-50/60 font-medium" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="font-bold text-gray-400 w-4">{rank + 1}</span>
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-200">
                  <img src={`/chara0${p.avatarId}.png`} alt="" className="w-full h-full object-cover" />
                </div>
                <span className="truncate max-w-[120px] font-semibold text-gray-900">
                  {p.nickname} {p.isCurrent && <span className="text-pink-600 font-normal">(你)</span>}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-bold text-sm text-purple-700">{p.score} 胜</span>
                <span
                  className={`text-2xs font-semibold px-2 py-0.5 rounded ${
                    p.isWinner ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {p.isWinner ? "冠军" : "结算"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onExit}
        className="flex items-center justify-center gap-2 w-full py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium text-xs shadow-xs hover:opacity-95 cursor-pointer"
      >
        <Home className="h-4 w-4" />
        返回主菜单
      </button>
    </div>
  )
}
