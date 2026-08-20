import { useState, useEffect } from "react"
import { getCachedCoverUrl } from "../../services/cache"

interface SongCoverProps {
  songId: number
  title: string
  className?: string
  size?: number
}

export function SongCover({ songId, title, className = "w-14 h-14 object-cover rounded shadow-xs", size = 80 }: SongCoverProps) {
  const [src, setSrc] = useState<string>("/placeholder.png")

  useEffect(() => {
    let active = true
    getCachedCoverUrl(songId).then((url) => {
      if (active) {
        setSrc(url)
      }
    })
    return () => {
      active = false
    }
  }, [songId])

  return (
    <img
      src={src}
      alt={title}
      loading="lazy"
      className={className}
      onError={(e) => {
        ;(e.target as HTMLImageElement).src = `/placeholder.png?height=${size}&width=${size}`
      }}
    />
  )
}
