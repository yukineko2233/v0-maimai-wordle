import { useState, useEffect } from "react"
import { socket } from "../../services/socket"
import { Users, Globe } from "lucide-react"

export default function RoomStatus() {
  const [stats, setStats] = useState<{ count: number; publicCount: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleUpdate = (data: { count: number; publicCount: number }) => {
      setStats(data)
      setLoading(false)
    }

    socket.on("room_count_update", handleUpdate)
    socket.emit("get_room_count")

    return () => {
      socket.off("room_count_update", handleUpdate)
    }
  }, [])

  if (loading || !stats) {
    return (
      <div className="text-center text-gray-500 text-xs py-1">
        <Users className="inline h-3.5 w-3.5 mr-1" />
        加载实时房间状态...
      </div>
    )
  }

  const isFull = stats.count >= 200

  return (
    <div className="text-center text-xs text-gray-600 my-2 flex items-center justify-center gap-4 flex-wrap">
      <div className="flex items-center gap-1">
        <Users className="h-3.5 w-3.5 text-indigo-500" />
        {isFull ? (
          <span className="text-red-500 font-medium">服务器房间已满 (200/200)</span>
        ) : (
          <span>
            当前活跃房间: <strong className="text-indigo-600 font-semibold">{stats.count}</strong> / 200
          </span>
        )}
      </div>

      {stats.publicCount > 0 && (
        <div className="flex items-center gap-1">
          <Globe className="h-3.5 w-3.5 text-teal-500" />
          <span>
            公开房间: <strong className="text-teal-600 font-semibold">{stats.publicCount}</strong>
          </span>
        </div>
      )}
    </div>
  )
}
