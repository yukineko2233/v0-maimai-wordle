import React, { useState, useEffect, useId, useRef } from "react"
import { Search } from "lucide-react"
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  size,
  useDismiss,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react"
import type { Song } from "../../../shared/types"
import { SongCover } from "./SongCover"

interface SearchBoxProps {
  songs: Song[]
  onSelect: (song: Song) => boolean | void | Promise<boolean | void>
  guessedSongIds?: readonly number[]
  disabled?: boolean
  placeholder?: string
}

interface RankedSong {
  song: Song
  rank: number
  sourceIndex: number
}

const EMPTY_GUESSED_SONG_IDS: readonly number[] = []

function normalizeSearchText(value: string): string {
  return value.normalize("NFKC").trim().toLocaleLowerCase()
}

export function rankSongSearchResults(
  songs: readonly Song[],
  query: string,
  guessedSongIds: readonly number[] = EMPTY_GUESSED_SONG_IDS,
): Song[] {
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []

  const guessedIds = new Set(guessedSongIds)
  const ranked: RankedSong[] = []

  songs.forEach((song, sourceIndex) => {
    if (guessedIds.has(song.id)) return

    const titles = [song.title, ...song.aliases].map(normalizeSearchText)
    let rank = -1
    if (titles.some((value) => value === normalizedQuery)) rank = 0
    else if (titles.some((value) => value.startsWith(normalizedQuery))) rank = 1
    else if (titles.some((value) => value.includes(normalizedQuery))) rank = 2
    else if (normalizeSearchText(song.artist).includes(normalizedQuery)) rank = 3

    if (rank >= 0) ranked.push({ song, rank, sourceIndex })
  })

  return ranked
    .sort((left, right) => left.rank - right.rank || left.sourceIndex - right.sourceIndex)
    .map(({ song }) => song)
}

export default function SearchBox({
  songs,
  onSelect,
  guessedSongIds = EMPTY_GUESSED_SONG_IDS,
  disabled = false,
  placeholder = "输入歌曲名、曲师或别名以开始...",
}: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Song[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [resultAnnouncement, setResultAnnouncement] = useState("")
  const [totalResults, setTotalResults] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const isComposingRef = useRef(false)
  const inputId = useId()
  const listboxId = useId()
  const guessedSongIdsKey = guessedSongIds.join(",")

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
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
  const { getReferenceProps, getFloatingProps } = useInteractions([dismiss])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setTotalResults(0)
      setSelectedIndex(0)
      setIsOpen(false)
      setResultAnnouncement("")
      return
    }

    const matched = rankSongSearchResults(songs, query, guessedSongIds)
    const visibleResults = matched.slice(0, 10)
    setResults(visibleResults)
    setTotalResults(matched.length)
    setSelectedIndex(0)
    setIsOpen(true)
    setResultAnnouncement(
      visibleResults.length > 0
        ? `显示 ${visibleResults.length} 个结果，共 ${matched.length} 个。请使用上下方向键选择。`
        : "没有找到可猜的歌曲。",
    )
  }, [guessedSongIdsKey, query, songs])

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  const handleSelect = async (song: Song) => {
    if (disabled || isSubmitting) return

    setIsSubmitting(true)
    setResultAnnouncement("正在提交猜测。")
    try {
      const succeeded = (await onSelect(song)) !== false
      if (!succeeded) {
        setResultAnnouncement("猜测未提交，请重试。")
        return
      }

      setQuery("")
      setIsOpen(false)
      setResults([])
      setTotalResults(0)
      setResultAnnouncement("")
      if (
        typeof window !== "undefined" &&
        (window.innerWidth < 768 || window.matchMedia?.("(pointer: coarse)").matches)
      ) {
        inputRef.current?.blur()
      }
    } catch {
      setResultAnnouncement("猜测提交失败，请重试。")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (
      e.key === "Enter" &&
      (isComposingRef.current || e.nativeEvent.isComposing || e.keyCode === 229)
    ) {
      e.preventDefault()
      return
    }

    if (e.key === "Tab") {
      setIsOpen(false)
      return
    }

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
        void handleSelect(results[selectedIndex])
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isComposingRef.current || isSubmitting) return
    if (results.length > 0) {
      void handleSelect(results[selectedIndex] || results[0])
    }
  }

  const isListboxMounted = isOpen && Boolean(query.trim())

  return (
    <div
      className="relative w-full"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget
        if (
          !event.currentTarget.contains(nextTarget) &&
          !(nextTarget instanceof Node && listRef.current?.contains(nextTarget))
        ) {
          setIsOpen(false)
        }
      }}
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor={inputId} className="sr-only">搜索歌曲</label>
          <input
            id={inputId}
            ref={(node) => {
              refs.setReference(node)
              inputRef.current = node
            }}
            {...getReferenceProps()}
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={isListboxMounted}
            aria-controls={isListboxMounted ? listboxId : undefined}
            aria-activedescendant={
              isListboxMounted && results[selectedIndex] ? `${listboxId}-option-${selectedIndex}` : undefined
            }
            aria-busy={isSubmitting}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={placeholder}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setIsOpen(true)
            }}
            onFocus={() => {
              if (query.trim()) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => {
              isComposingRef.current = true
            }}
            onCompositionEnd={() => {
              isComposingRef.current = false
            }}
            readOnly={isSubmitting}
            disabled={disabled}
            className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-300 bg-white text-base shadow-xs focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100 transition-all"
          />
          <Search className="absolute right-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>

        <button
          type="submit"
          disabled={results.length === 0 || disabled || isSubmitting}
          className="h-11 px-6 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 text-white font-medium text-sm shadow-xs hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shrink-0 cursor-pointer"
        >
          {isSubmitting ? "提交中..." : "猜测"}
        </button>
      </form>

      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {resultAnnouncement}
      </div>

      {/* 使用 FloatingPortal 将下拉列表渲染到全局最顶层，彻底杜绝任何父容器 overflow 裁切 */}
      {isListboxMounted && (
        <FloatingPortal>
          <div
            id={listboxId}
            ref={(node) => {
              refs.setFloating(node)
              listRef.current = node
            }}
            style={floatingStyles}
            {...getFloatingProps()}
            role="listbox"
            aria-label="歌曲搜索结果"
            className="motion-dropdown z-[99999] bg-white border border-gray-200 rounded-xl shadow-2xl overflow-y-auto overscroll-contain"
          >
            <div role="presentation" className="px-3 py-2 text-2xs text-gray-500 border-b border-gray-100">
              {totalResults > 0 ? `显示 ${results.length} / 共 ${totalResults} 首` : "没有找到可猜的歌曲"}
            </div>
            {results.map((song, index) => {
              const isSelected = index === selectedIndex
              const aliasText = song.aliases.join(", ")

              return (
                <div
                  key={song.id}
                  id={`${listboxId}-option-${index}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void handleSelect(song)}
                  className={`p-2.5 cursor-pointer flex items-center gap-3 transition-colors select-none border-b border-gray-100 last:border-b-0 ${
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
