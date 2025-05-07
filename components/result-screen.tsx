"use client"

import type { Song } from "@/types/game"
import { Button } from "@/components/ui/button"
import { RefreshCw, Share2 } from "lucide-react"

interface ResultScreenProps {
  won: boolean
  targetSong: Song
  guessCount: number
  maxGuesses: number
  onNewGame: () => void
  isDaily?: boolean
  onShare?: () => void
}

export default function ResultScreen({
  won,
  targetSong,
  guessCount,
  maxGuesses,
  onNewGame,
  isDaily = false,
  onShare,
}: ResultScreenProps) {
  // Update the cover image URL to use diving-fish.com
  const coverImageUrl = `https://www.diving-fish.com/covers/${String(targetSong.id).padStart(5, "0")}.png`

  return (
    <div className="p-3 bg-gray-50 rounded-lg mb-5 text-center">
      {" "}
      {/* Increased padding */}
      {won ? (
        <div>
          <h2 className="text-xl font-bold text-green-600 mb-2">恭喜你猜对了！</h2>
          <p className="mb-1">
            你用了 {guessCount}/{maxGuesses} 次猜出了正确答案
          </p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-bold text-red-600 mb-2">游戏结束</h2>
          <p className="mb-1">很遗憾，你没有猜出正确答案，正确答案是：</p>
        </div>
      )}
      <div className="mt-2 flex flex-col items-center">
        <div className="mb-2">
          <div className="text-lg font-bold">{targetSong.title}</div>
          <div className="text-sm text-gray-600">{targetSong.artist}</div>
        </div>
        <div className="flex items-center gap-5 mb-5">
          {" "}
          {/* Increased spacing */}
          <img
            src={coverImageUrl || "/placeholder.png"}
            alt={targetSong.title}
            className="w-24 h-24 object-cover rounded-lg shadow-md" /* Increased from w-24 h-24 */
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = "/placeholder.png?height=160&width=160"
            }}
          />
          <div className="text-left">
            <div className="text-sm mt-1">
              {targetSong.type} | {targetSong.genre} | <span className="font-medium">BPM: </span> {targetSong.bpm}
            </div>
            <div className="text-sm">
              <span className="font-medium">Master:</span> {targetSong.level_master} |
              <span className="font-medium"> Re:Master:</span> {targetSong.level_remaster || "无"}
            </div>
            <div className="text-sm">{targetSong.version}</div>
          </div>
        </div>

        <div className="flex gap-3">
          {!isDaily && (
            <Button onClick={onNewGame} className="flex items-center gap-1">
              <RefreshCw className="h-4 w-4" />
              开始新游戏
            </Button>
          )}

          {isDaily && onShare && (
            <Button onClick={onShare} className="flex items-center gap-1">
              <Share2 className="h-4 w-4" />
              分享结果
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
