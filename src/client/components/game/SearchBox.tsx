import React, { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react"
import type { Song } from "../../../shared/types"
import { SongCover } from "./SongCover"

interface SearchBoxProps {
  songs: Song[]
  onSelect: (song: Song) => void
  disabled?: boolean
  placeholder?: string
}

export default function SearchBox({
  songs,
  onSelect,
  disabled = false,
  placeholder = "输入歌曲名、曲师或别名以开始...",
}: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Song[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const listRef = useRef<HTMLDivElement>(null)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen && results.length > 0,
    onOpenChange: setIsOpen,
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(4),
      flip({ fallbackPlacements: ["top-start"] }),
      shift({ padding: 8 }),
      size({
        apply({ availableHeight, rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
            maxHeight: `${Math.min(availableHeight - 8, 300)}px`,
          })
        },
      }),
    ],
  })

  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  })
  const role = useRole(context, { role: "listbox" })

  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss, role])

  // 搜索逻辑：匹配曲名、曲师和别名
  useEffect(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 1) {
      setResults([])
      setSelectedIndex(0)
      setIsOpen(false)
      return
    }

    const matched = songs.filter((song) => {
      if (song.title.toLowerCase().includes(trimmed)) return true
      if (song.artist.toLowerCase().includes(trimmed)) return true
      return song.aliases.some((alias) => alias.toLowerCase().includes(trimmed))
    })

    setResults(matched.slice(0, 10))
    setSelectedIndex(0)
    setIsOpen(matched.length > 0)
  }, [query, songs])

  const handleSelect = (song: Song) => {
    onSelect(song)
    setQuery("")
    setIsOpen(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0) {
      handleSelect(results[selectedIndex] || results[0])
    }
  }

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div ref={refs.setReference} {...getReferenceProps()} className="relative flex-1">
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => {
              if (results.length > 0) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-300 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 transition-all"
          />
          <Search className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={results.length === 0 || disabled}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
        >
          猜测
        </button>
      </form>

      {/* 使用 FloatingPortal 将下拉列表渲染到全局最顶层，彻底杜绝任何父容器 overflow 裁切 */}
      {isOpen && results.length > 0 && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[99999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto divide-y divide-gray-100 animate-in fade-in slide-in-from-top-1 duration-150"
          >
            {results.map((song, index) => {
              const isSelected = index === selectedIndex
              const aliasText = song.aliases.join(", ")

              return (
                <div
                  key={song.id}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelect(song)}
                  className={`p-2.5 cursor-pointer flex items-center gap-3 transition-colors select-none ${
                    isSelected ? "bg-pink-50/90" : "hover:bg-gray-50"
                  }`}
                >
                  <div className="shrink-0 w-11 h-11 rounded-lg overflow-hidden shadow-xs border border-gray-100">
                    <SongCover songId={song.id} title={song.title} className="w-11 h-11 object-cover" />
                  </div>

                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="font-semibold text-xs md:text-sm text-gray-900 flex items-center gap-1.5">
                      <span className="truncate">{song.title}</span>
                      <span
                        className={`text-3xs px-1.5 py-0.2 rounded font-semibold ${
                          song.type === "DX" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {song.type}
                      </span>
                    </div>
                    <div className="text-2xs text-gray-500 truncate">{song.artist}</div>
                    {aliasText && (
                      <div className="text-3xs text-gray-400 truncate mt-0.5">
                        别名: {aliasText}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </FloatingPortal>
      )}
    </div>
  )
}
