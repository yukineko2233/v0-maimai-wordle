interface SongCoverProps {
  songId: number
  title: string
  className?: string
  size?: number
}

export function SongCover({
  songId,
  title,
  className = "w-14 h-14 object-cover rounded shadow-xs",
  size = 80,
}: SongCoverProps) {
  const paddedId = String(songId).padStart(5, "0")
  const coverUrl = `https://www.diving-fish.com/covers/${paddedId}.png`

  return (
    <img
      src={coverUrl}
      alt={title}
      loading="lazy"
      referrerPolicy="no-referrer"
      className={className}
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.onerror = null
        target.src = `/placeholder.png?height=${size}&width=${size}`
      }}
    />
  )
}
