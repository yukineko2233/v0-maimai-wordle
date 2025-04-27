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
            <div className="relative w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white">
                <img src={`/chara0${avatarId}.png`} alt="avatar" className="w-full h-full object-cover" />
                {isReady && (
                    <div className="absolute inset-0 bg-green-500 bg-opacity-30 flex items-center justify-center">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-white"
                            >
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>
                )}
            </div>
            <div>
                <div className="font-medium flex items-center gap-1">
                    {nickname}
                    {isHost && <House className="h-4 w-4 text-yellow-500" />}
                </div>
                <div className="text-sm text-muted-foreground">{isCurrentPlayer ? "你" : "对手"}</div>
            </div>
        </div>
    )
}
