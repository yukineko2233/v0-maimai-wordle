import { useState } from "react"
import type { SongTag } from "../../../shared/types"

interface SongTagsProps {
  tags: Array<SongTag & { shared?: boolean }>
}

export default function SongTags({ tags }: SongTagsProps) {
  const [activeTooltipId, setActiveTooltipId] = useState<number | null>(null)

  if (!tags || tags.length === 0) {
    return <div className="text-xs text-gray-400 italic">无标签数据</div>
  }

  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <div key={tag.id} className="relative group">
          <button
            type="button"
            onClick={() => setActiveTooltipId(activeTooltipId === tag.id ? null : tag.id)}
            className={`text-xs px-1.5 py-0.5 rounded-md font-normal transition-colors cursor-pointer border ${
              tag.shared
                ? "text-green-800 bg-green-100 border-green-400 font-semibold"
                : "text-gray-700 bg-gray-100 border-gray-300 hover:bg-gray-200"
            }`}
          >
            {tag.name}
          </button>

          {/* Desktop Hover & Mobile Click Tooltip */}
          <div
            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2.5 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-30 pointer-events-none max-w-xs whitespace-pre-wrap transition-opacity duration-150 ${
              activeTooltipId === tag.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <div className="font-semibold text-pink-300 mb-0.5">{tag.name}</div>
            <div className="text-gray-200 text-2xs leading-tight">{tag.description || "暂无详细释义"}</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      ))}
    </div>
  )
}
