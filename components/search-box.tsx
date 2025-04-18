"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { Song } from "@/types/game"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"

interface SearchBoxProps {
  songs: Song[]
  aliases: Record<number, string[]>
  onSelect: (song: Song) => void
  disabled?: boolean
}

export default function SearchBox({ songs, aliases, onSelect, disabled = false }: SearchBoxProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Song[]>([])
  const [showResults, setShowResults] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }

    const lowerQuery = query.toLowerCase()
    const matchedSongs = songs.filter((song) => {
      // Match by title
      if (song.title.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // Match by artist
      if (song.artist.toLowerCase().includes(lowerQuery)) {
        return true
      }

      // Match by aliases
      const songAliases = aliases[song.id] || []
      return songAliases.some((alias) => alias.toLowerCase().includes(lowerQuery))
    })

    setResults(matchedSongs.slice(0, 10)) // Limit to 10 results
  }, [query, songs, aliases])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
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
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (results.length > 0) {
      handleSelect(results[0])
    }
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            type="text"
            placeholder="输入歌曲名称或别名..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowResults(true)}
            disabled={disabled}
            className="pr-10"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
        <Button type="submit" disabled={results.length === 0 || disabled}>
          猜测
        </Button>
      </form>

      {showResults && results.length > 0 && (
        <div
          ref={resultsRef}
          className="z-10 mt-1 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {results.map((song) => {
            const coverImageUrl = `https://www.diving-fish.com/covers/${String(song.id).padStart(5, "0")}.png`

            return (
              <div
                key={song.id}
                className="p-4 hover:bg-gray-100 cursor-pointer flex items-center gap-4"
                onClick={() => handleSelect(song)}
              >
                <img
                  src={coverImageUrl || "/placeholder.png"}
                  alt={song.title}
                  className="w-16 h-16 object-cover rounded"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = "/placeholder.png?height=64&width=64"
                  }}
                />
                <div>
                  <div className="font-medium">{song.title}</div>
                  <div className="text-xs text-gray-500">{song.artist}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
