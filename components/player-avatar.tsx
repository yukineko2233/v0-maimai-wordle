import { HomeIcon as House } from "lucide-react"

interface PlayerAvatarProps {
    avatarId: number
    nickname: string
    isHost: boolean
    isCurrentPlayer: boolean
    isReady?: boolean
}

export default function PlayerAvatar({ avatarId, nickname, isHost, isCurrentPlayer, isReady }: PlayerAvatarProps) {
    return (
        <div className="flex items-center gap-3">
            <div
                className={`relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2
              ${isReady ? 'bg-green-200 border-green-400' : 'bg-white border-white'}`}
            >
                <img
                    src={`/chara0${avatarId}.png`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                />
            </div>
            <div>
                <div className="font-medium flex items-center gap-1 pe-1">
                    {nickname}
                    {isHost && <House className="h-4 w-4 text-yellow-500 shrink-0" />}
                </div>
                <div className="text-sm text-muted-foreground">{isCurrentPlayer ? "你" : "对手"}</div>
            </div>
        </div>
    )
}
