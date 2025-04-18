import type { Guess } from "@/types/game"
import { ArrowDown, ArrowUp, Check } from "lucide-react"

interface GuessRowProps {
  guess: Guess
}

export default function GuessRow({ guess }: GuessRowProps) {
  const { song, result } = guess

  const getCellClass = (correct: boolean, close?: boolean) => {
    if (correct) return "bg-green-100 text-green-800 border-green-300"
    if (close) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    return "bg-gray-100 text-gray-800 border-gray-300"
  }

  const getDirectionIcon = (direction: "higher" | "lower" | "equal") => {
    if (direction === "higher") return <ArrowDown className="h-4 w-4 text-red-500" />
    if (direction === "lower") return <ArrowUp className="h-4 w-4 text-blue-500" />
  }

  const getVersionDirectionIcon = (direction: "newer" | "older" | "equal") => {
    if (direction === "newer") return <ArrowDown className="h-4 w-4 text-red-500" />
    if (direction === "older") return <ArrowUp className="h-4 w-4 text-blue-500" />
  }

  // Update the cover image URL to use diving-fish.com
  const coverImageUrl = `https://www.diving-fish.com/covers/${String(song.id).padStart(5, "0")}.png`

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        {/* Cover and Title - increased size */}
        <div className="flex items-center gap-3 col-span-2">
          <img
            src={coverImageUrl || "/placeholder.png"}
            alt={song.title}
            className="w-20 h-20 object-cover rounded" /* Increased from w-12 h-12 */
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = "/placeholder.png?height=80&width=80"
            }}
          />
          <div className={`flex-1 p-3 rounded border ${getCellClass(result.title)}`}>
            <div className="font-medium">{song.title}</div>
          </div>
        </div>

        {/* Type */}
        <div className={`p-2 rounded border ${getCellClass(result.type)}`}>
          <div className="text-xs text-gray-500">类型</div>
          <div>{song.type}</div>
        </div>

        {/* Artist */}
        <div className={`p-2 rounded border ${getCellClass(result.artist)}`}>
          <div className="text-xs text-gray-500">曲师</div>
          <div className="truncate">{song.artist}</div>
        </div>

        {/* BPM - Updated to show arrows and highlight if close */}
        <div className={`p-2 rounded border ${getCellClass(result.bpm.value, result.bpm.close)}`}>
          <div className="text-xs text-gray-500">BPM</div>
          <div className="flex items-center gap-1">
            {song.bpm} {!result.bpm.value && getDirectionIcon(result.bpm.direction)}
          </div>
        </div>

        {/* Genre */}
        <div className={`p-2 rounded border ${getCellClass(result.genre)}`}>
          <div className="text-xs text-gray-500">流派</div>
          <div className="truncate">{song.genre}</div>
        </div>

        {/* Master Level */}
        <div className={`p-2 rounded border ${getCellClass(result.masterLevel.value, result.masterLevel.close)}`}>
          <div className="text-xs text-gray-500">Master等级</div>
          <div className="flex items-center gap-1">
            {song.level_master} {!result.masterLevel.value && getDirectionIcon(result.masterLevel.direction)}
          </div>
        </div>

        {/* Master Designer */}
        <div className={`p-2 rounded border ${getCellClass(result.masterDesigner)}`}>
          <div className="text-xs text-gray-500">Master谱师</div>
          <div className="truncate">{song.charts.master.designer || "未知"}</div>
        </div>

        {/* Re:Master Level - Removed checkmark logic */}
        <div className={`p-2 rounded border ${getCellClass(result.remasterLevel.value, result.remasterLevel.close)}`}>
          <div className="text-xs text-gray-500">Re:Master等级</div>
          <div className="flex items-center gap-1">
            {song.level_remaster || "无"}
            {song.level_remaster && !result.remasterLevel.value && getDirectionIcon(result.remasterLevel.direction)}
          </div>
        </div>

        {/* Re:Master Designer */}
        <div className={`p-2 rounded border ${getCellClass(result.remasterDesigner)}`}>
          <div className="text-xs text-gray-500">Re:Master谱师</div>
          <div className="truncate">{song.charts.remaster?.designer || "无"}</div>
        </div>

        {/* Version */}
        <div className={`p-2 rounded border ${getCellClass(result.version.value, result.version.close)}`}>
          <div className="text-xs text-gray-500">稼动版本</div>
          <div className="items-center gap-1">
            {song.version} {!result.version.value && getVersionDirectionIcon(result.version.direction)}
          </div>
        </div>
      </div>
    </div>
  )
}
