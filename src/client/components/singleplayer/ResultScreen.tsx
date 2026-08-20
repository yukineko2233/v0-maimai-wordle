import { RefreshCw, Share2 } from "lucide-react"
import type { Song } from "../../../shared/types"
import { SongCover } from "../game/SongCover"
import { VERSION_SHORT_NAME } from "../../../shared/domain/versions"

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
  return (
    <div className="p-5 bg-gray-50/90 border border-gray-200 rounded-xl mb-5 text-center shadow-xs animate-in fade-in zoom-in-95 duration-200">
      {won ? (
        <div className="mb-3">
          <h2 className="text-xl font-bold text-green-600 mb-1">🎉 恭喜你猜对了！</h2>
          <p className="text-sm text-gray-600">
            你用了 <strong className="text-green-700 font-bold">{guessCount}</strong> / {maxGuesses} 次猜出了正确答案
          </p>
        </div>
      ) : (
        <div className="mb-3">
          <h2 className="text-xl font-bold text-red-600 mb-1">😢 游戏结束</h2>
          <p className="text-sm text-gray-600">正确答案是：</p>
        </div>
      )}

      <div className="flex flex-col items-center">
        <div className="mb-3">
          <div className="text-lg font-bold text-gray-900">{targetSong.title}</div>
          <div className="text-xs text-gray-500">{targetSong.artist}</div>
        </div>

        <div className="flex items-center gap-4 mb-5 p-3 bg-white rounded-xl border border-gray-200 shadow-xs max-w-md w-full justify-center">
          <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden shadow-xs">
            <SongCover songId={targetSong.id} title={targetSong.title} className="w-20 h-20 object-cover" />
          </div>

          <div className="text-left text-xs space-y-1 text-gray-700">
            <div>
              <span className="font-semibold text-gray-900">类型:</span> {targetSong.type} |{" "}
              <span className="font-semibold text-gray-900">流派:</span> {targetSong.genre}
            </div>
            <div>
              <span className="font-semibold text-gray-900">BPM:</span> {targetSong.bpm}
            </div>
            <div>
              <span className="font-semibold text-purple-800">Master:</span> {targetSong.masterLevel} (
              {targetSong.masterDesigner})
            </div>
            {targetSong.remasterLevel && (
              <div>
                <span className="font-semibold text-purple-500">Re:Master:</span> {targetSong.remasterLevel} (
                {targetSong.remasterDesigner})
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-900">版本:</span>{" "}
              {VERSION_SHORT_NAME[targetSong.version] || targetSong.version}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {!isDaily && (
            <button
              type="button"
              onClick={onNewGame}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              开始新一局
            </button>
          )}

          {isDaily && onShare && (
            <button
              type="button"
              onClick={onShare}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-green-500 to-teal-500 text-white text-sm font-medium rounded-lg hover:opacity-95 transition-opacity shadow-xs cursor-pointer"
            >
              <Share2 className="h-4 w-4" />
              分享挑战结果
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
