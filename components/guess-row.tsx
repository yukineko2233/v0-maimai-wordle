import type { Guess } from "@/types/game"
import { ArrowDown, ArrowUp } from "lucide-react"

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

  const versionshort: Record<string, string> = {
    "maimai": "maimai 真",
    "maimai PLUS": "maimai+ 真",
    "maimai GreeN": "GreeN 超",
    "maimai GreeN PLUS": "GreeN+ 檄",
    "maimai ORANGE": "ORANGE 橙",
    "maimai ORANGE PLUS": "ORANGE+ 晓",
    "maimai PiNK": "PiNK 桃",
    "maimai PiNK PLUS": "PiNK+ 樱",
    "maimai MURASAKi": "MURASAKi 紫",
    "maimai MURASAKi PLUS": "MURASAKi+ 菫",
    "maimai MiLK": "MiLK 白",
    "maimai MiLK PLUS": "MiLK+ 雪",
    "maimai FiNALE": "FiNALE 辉",
    "舞萌DX": "DX 熊/华 ",
    "舞萌DX 2021": "DX 2021 爽/煌",
    "舞萌DX 2022": "DX 2022 宙/星",
    "舞萌DX 2023": "DX 2023 祭/祝",
    "舞萌DX 2024": "DX 2024 双/宴",
  }


  // Update the cover image URL to use diving-fish.com
  const coverImageUrl = `https://www.diving-fish.com/covers/${String(song.id).padStart(5, "0")}.png`

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 p-2">
        {/* Cover and Title - increased size */}
        <div className="flex items-center gap-2 col-span-4">
          <img
            src={coverImageUrl || "/placeholder.png"}
            alt={song.title}
            className="w-14 h-14 object-cover rounded" /* Increased from w-12 h-12 */
            onError={(e) => {
              ;(e.target as HTMLImageElement).src = "/placeholder.png?height=80&width=80"
            }}
          />
          <div className={`flex-1 p-3 col-span-3 rounded border min-w-0 ${getCellClass(result.title)}`}>
            <div className="font-medium truncate">{song.title}</div>
          </div>
        </div>

        {/* Type */}
        <div className={`p-2 rounded border ${getCellClass(result.type)}`}>
          <div className="text-xs text-gray-500">类型</div>
          <div>{song.type}</div>
        </div>

        {/* BPM - Updated to show arrows and highlight if close */}
        <div className={`p-2 rounded border ${getCellClass(result.bpm.value, result.bpm.close)}`}>
          <div className="text-xs text-gray-500">BPM</div>
          <div className="flex items-center">
            {song.bpm} {!result.bpm.value && <span className="shrink-0">{getDirectionIcon(result.bpm.direction)}</span>}
          </div>
        </div>

        {/* Artist */}
        <div className={`p-2 rounded border col-span-2 ${getCellClass(result.artist)}`}>
          <div className="text-xs text-gray-500">曲师</div>
          <div className="truncate">{song.artist}</div>
        </div>

        {/* Master Level */}
        <div className={`p-2 rounded border ${getCellClass(result.masterLevel.value, result.masterLevel.close)}`}>
          <div className="text-xs text-purple-800">Lv</div>
          <div className="flex items-center">
            {song.level_master} {!result.masterLevel.value && <span className="shrink-0">{getDirectionIcon(result.masterLevel.direction)}</span>}
          </div>
        </div>

        {/* Master Designer */}
        <div className={`p-2 rounded border col-span-3 ${getCellClass(result.masterDesigner)}`}>
          <div className="text-xs text-purple-800">Master 谱师</div>
          <div className="truncate">{song.charts.master.designer || "未知"}</div>
        </div>

        {/* Re:Master Level - Removed checkmark logic */}
        <div className={`p-2 rounded border ${getCellClass(result.remasterLevel.value, result.remasterLevel.close)}`}>
          <div className="text-xs text-purple-400">Lv</div>
          <div className="flex items-center">
            {song.level_remaster || "无"}
            {song.level_remaster && !result.remasterLevel.value && <span className="shrink-0">{getDirectionIcon(result.remasterLevel.direction)}</span>}
          </div>
        </div>

        {/* Re:Master Designer */}
        <div className={`p-2 rounded border col-span-3 ${getCellClass(result.remasterDesigner)}`}>
          <div className="text-xs text-purple-400">Re:Master 谱师</div>
          <div className="truncate">{song.charts.remaster?.designer || "无"}</div>
        </div>

        {/* Genre */}
        <div className={`p-2 rounded border col-span-2 ${getCellClass(result.genre)}`}>
          <div className="text-xs text-gray-500">流派</div>
          <div className="truncate">{song.genre}</div>
        </div>

        {/* Version */}
        <div className={`p-2 rounded border col-span-2 ${getCellClass(result.version.value, result.version.close)}`}>
          <div className="text-xs text-gray-500">版本</div>
          <div className="flex items-center">
            {versionshort[song.version]} {!result.version.value && <span className="shrink-0">{getVersionDirectionIcon(result.version.direction)}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
