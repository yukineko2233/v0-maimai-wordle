import React, { useState, useEffect, useRef } from "react"
import { Search } from "lucide-react"
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
  const [showResults, setShowResults] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // 搜索逻辑：匹配曲名、曲师和别名
  useEffect(() => {
    const trimmed = query.trim().toLowerCase()
    if (trimmed.length < 1) {
      setResults([])
      setSelectedIndex(0)
      return
    }

    const matched = songs.filter((song) => {
      if (song.title.toLowerCase().includes(trimmed)) return true
      if (song.artist.toLowerCase().includes(trimmed)) return true
      return song.aliases.some((alias) => alias.toLowerCase().includes(trimmed))
    })

    setResults(matched.slice(0, 10))
    setSelectedIndex(0)
  }, [query, songs])

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleSelect = (song: Song) => {
    onSelect(song)
    setQuery("")
    setShowResults(false)
    setResults([])
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showResults || results.length === 0) return

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
      setShowResults(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0) {
      handleSelect(results[selectedIndex] || results[0])
    }
  }

  return (
    <div ref={containerRef} className="relative w-full z-40">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setShowResults(true)
            }}
            onFocus={() => setShowResults(true)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            className="w-full h-11 pl-4 pr-10 rounded-lg border border-gray-300 bg-white text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 transition-all"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={results.length === 0 || disabled}
          className="h-11 px-6 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
        >
          猜测
        </button>
      </form>

      {/* 浮动下拉候选框：绝对定位，悬浮于猜歌信息列表之上 */}
      {showResults && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-72 overflow-y-auto z-50 divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {results.map((song, index) => {
            const isSelected = index === selectedIndex
            const aliasText = song.aliases.join(", ")

            return (
              <div
                key={song.id}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => handleSelect(song)}
                className={`p-3 cursor-pointer flex items-center gap-3 transition-colors ${
                  isSelected ? "bg-pink-50/80" : "hover:bg-gray-50"
                }`}
              >
                <div className="shrink-0 w-12 h-12 rounded overflow-hidden">
                  <SongCover songId={song.id} title={song.title} className="w-12 h-12 object-cover" />
                </div>

                <div className="flex flex-col min-w-0 flex-1">
                  <div className="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <span className="truncate">{song.title}</span>
                    <span
                      className={`text-2xs px-1.5 py-0.2 rounded font-semibold ${
                        song.type === "DX" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {song.type}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{song.artist}</div>
                  {aliasText && (
                    <div className="text-2xs text-gray-400 truncate mt-0.5">
                      别名: {aliasText}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
