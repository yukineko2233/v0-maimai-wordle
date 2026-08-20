import { Crown } from "lucide-react"

interface PlayerAvatarProps {
  avatarId: number
  nickname: string
  isHost: boolean
  isCurrentPlayer: boolean
  isReady?: boolean
  online?: boolean
}

export default function PlayerAvatar({
  avatarId,
  nickname,
  isHost,
  isCurrentPlayer,
  isReady,
  online = true,
}: PlayerAvatarProps) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`relative w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 transition-all ${
          isReady
            ? "border-green-500 ring-2 ring-green-200"
            : !online
              ? "border-gray-300 opacity-50"
              : isCurrentPlayer
                ? "border-pink-400"
                : "border-gray-200"
        }`}
      >
        <img
          src={`/chara0${avatarId || 1}.png`}
          alt="avatar"
          className="w-full h-full object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = "/placeholder.png"
          }}
        />
      </div>

      <div className="min-w-0">
        <div className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1">
          <span className="truncate">{nickname}</span>
          {isHost && (
            <span title="房主" className="inline-flex">
              <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />
            </span>
          )}
        </div>
        <div className="text-2xs text-gray-400">
          {isCurrentPlayer ? "(你)" : online ? "对手" : "掉线中..."}
        </div>
      </div>
    </div>
  )
}
