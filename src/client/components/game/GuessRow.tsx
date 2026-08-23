import { ArrowDown, ArrowUp } from "lucide-react"
import type { Direction, FeedbackStatus, Guess } from "../../../shared/types"
import { VERSION_SHORT_NAME } from "../../../shared/domain/versions"
import SongTags from "./SongTags"
import { SongCover } from "./SongCover"

interface GuessRowProps {
  guess: Guess
}

export default function GuessRow({ guess }: GuessRowProps) {
  const { song, result } = guess

  const getCellClass = (status: FeedbackStatus | boolean, close?: boolean) => {
    if (typeof status === "boolean") {
      if (status) return "bg-green-100 text-green-900 border-green-400 font-medium"
      if (close) return "bg-yellow-100 text-yellow-900 border-yellow-400 font-medium"
      return "bg-gray-50 text-gray-800 border-gray-200"
    }

    if (status === "exact") return "bg-green-100 text-green-900 border-green-400 font-medium"
    if (status === "close") return "bg-yellow-100 text-yellow-900 border-yellow-400 font-medium"
    return "bg-gray-50 text-gray-800 border-gray-200"
  }

  const getDirectionText = (direction: Direction) => {
    if (direction === "higher") return "目标更低或更早"
    if (direction === "lower") return "目标更高或更晚"
    return ""
  }

  const getDirectionIcon = (direction: Direction) => {
    if (direction === "higher") return <><ArrowDown aria-hidden="true" className="h-3.5 w-3.5 text-red-500 inline ml-1 shrink-0" /><span className="sr-only">，{getDirectionText(direction)}</span></>
    if (direction === "lower") return <><ArrowUp aria-hidden="true" className="h-3.5 w-3.5 text-blue-500 inline ml-1 shrink-0" /><span className="sr-only">，{getDirectionText(direction)}</span></>
    return null
  }

  const getStatusText = (status: FeedbackStatus) => {
    if (status === "exact") return "完全一致"
    if (status === "close") return "接近"
    if (status === "absent") return "双方均无属性"
    return "不一致"
  }

  const getSummaryDirection = (status: FeedbackStatus, direction: Direction) => {
    const directionText = getDirectionText(direction)
    return status === "exact" || status === "absent" || !directionText ? "" : `，${directionText}`
  }

  const feedbackSummary = [
    `歌曲 ${song.title}，歌名${getStatusText(result.title.status)}`,
    `类型${getStatusText(result.type.status)}`,
    `BPM ${getStatusText(result.bpm.status)}${getSummaryDirection(result.bpm.status, result.bpm.direction)}`,
    `曲师${getStatusText(result.artist.status)}`,
    `Master 等级${getStatusText(result.masterLevel.status)}${getSummaryDirection(result.masterLevel.status, result.masterLevel.direction)}`,
    `Master 谱师${getStatusText(result.masterDesigner.status)}`,
    `Re:Master 等级${getStatusText(result.remasterLevel.status)}${getSummaryDirection(result.remasterLevel.status, result.remasterLevel.direction)}`,
    `Re:Master 谱师${getStatusText(result.remasterDesigner.status)}`,
    `流派${getStatusText(result.genre.status)}`,
    `版本${getStatusText(result.version.status)}${getSummaryDirection(result.version.status, result.version.direction)}`,
  ].join("；")

  return (
    <div className="motion-guess border border-gray-200 rounded-xl overflow-hidden shadow-xs bg-white text-xs md:text-sm" role="group" aria-label={`${song.title} 的猜测反馈`}>
      <p className="sr-only" aria-live="polite">{feedbackSummary}</p>
      <div className="grid grid-cols-4 md:grid-cols-8 gap-2 p-2.5">
        {/* Cover and Title */}
        <div className="flex items-center gap-2.5 col-span-4">
          <div className="w-14 h-14 shrink-0 rounded overflow-hidden shadow-xs">
            <SongCover songId={song.id} title={song.title} className="w-14 h-14 object-cover" />
          </div>
          <div
            className={`flex-1 p-3 h-14 flex items-center rounded-lg border min-w-0 ${getCellClass(
              result.title.status,
            )}`}
          >
            <div className="font-semibold text-sm truncate" title={song.title}>
              {song.title}
              <span className="sr-only">，{getStatusText(result.title.status)}</span>
            </div>
          </div>
        </div>

        {/* Type */}
        <div className={`p-2 rounded-lg border flex flex-col justify-center ${getCellClass(result.type.status)}`}>
          <div className="text-2xs text-gray-500 mb-0.5">类型</div>
          <div className="font-medium">{song.type}</div>
          <span className="sr-only">，{getStatusText(result.type.status)}</span>
        </div>

        {/* BPM */}
        <div
          className={`p-2 rounded-lg border flex flex-col justify-center ${getCellClass(
            result.bpm.status,
          )}`}
        >
          <div className="text-2xs text-gray-500 mb-0.5">BPM</div>
          <div className="font-medium flex items-center">
            {song.bpm}
            {result.bpm.status !== "exact" && getDirectionIcon(result.bpm.direction)}
            <span className="sr-only">，{getStatusText(result.bpm.status)}</span>
          </div>
        </div>

        {/* Artist */}
        <div
          className={`p-2 rounded-lg border col-span-2 flex flex-col justify-center ${getCellClass(
            result.artist.status,
          )}`}
        >
          <div className="text-2xs text-gray-500 mb-0.5">曲师</div>
          <div className="font-medium truncate" title={song.artist}>
            {song.artist}
          </div>
        </div>

        {/* Master Level */}
        <div
          className={`p-2 rounded-lg border flex flex-col justify-center ${getCellClass(
            result.masterLevel.status,
          )}`}
        >
          <div className="text-2xs font-semibold text-purple-700 mb-0.5">Lv</div>
          <div className="font-medium flex items-center">
            {song.masterLevel}
            {result.masterLevel.status !== "exact" && getDirectionIcon(result.masterLevel.direction)}
          </div>
        </div>

        {/* Master Designer */}
        <div
          className={`p-2 rounded-lg border col-span-3 flex flex-col justify-center ${getCellClass(
            result.masterDesigner.status,
          )}`}
        >
          <div className="text-2xs font-semibold text-purple-700 mb-0.5">Master 谱师</div>
          <div className="font-medium truncate" title={song.masterDesigner || "未知"}>
            {song.masterDesigner || "未知"}
          </div>
        </div>

        {/* Re:Master Level */}
        <div
          className={`p-2 rounded-lg border flex flex-col justify-center ${getCellClass(
            result.remasterLevel.status,
          )}`}
        >
          <div className="text-2xs font-semibold text-purple-400 mb-0.5">Lv</div>
          <div className="font-medium flex items-center">
            {song.remasterLevel || "无"}
            {song.remasterLevel && result.remasterLevel.status !== "exact" && getDirectionIcon(result.remasterLevel.direction)}
          </div>
        </div>

        {/* Re:Master Designer */}
        <div
          className={`p-2 rounded-lg border col-span-3 flex flex-col justify-center ${getCellClass(
            result.remasterDesigner.status,
          )}`}
        >
          <div className="text-2xs font-semibold text-purple-400 mb-0.5">Re:Master 谱师</div>
          <div className="font-medium truncate" title={song.remasterDesigner || "无"}>
            {song.remasterDesigner || "无"}
          </div>
        </div>

        {/* Genre */}
        <div
          className={`p-2 rounded-lg border col-span-2 flex flex-col justify-center ${getCellClass(
            result.genre.status,
          )}`}
        >
          <div className="text-2xs text-gray-500 mb-0.5">流派</div>
          <div className="font-medium truncate">{song.genre}</div>
        </div>

        {/* Version */}
        <div
          className={`p-2 rounded-lg border col-span-2 flex flex-col justify-center ${getCellClass(
            result.version.status,
          )}`}
        >
          <div className="text-2xs text-gray-500 mb-0.5">版本</div>
          <div className="font-medium flex items-center truncate">
            <span>{VERSION_SHORT_NAME[song.version] || song.version}</span>
            {result.version.status !== "exact" && getDirectionIcon(result.version.direction)}
          </div>
        </div>

        {/* Master Tags */}
        <div className="p-2 rounded-lg border border-gray-200 col-span-4 bg-gray-50/70">
          <div className="text-2xs font-semibold text-purple-800 mb-1">Master 标签</div>
          <SongTags tags={result.tags} />
        </div>
      </div>
    </div>
  )
}
