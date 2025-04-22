"use client"

import { useState, useEffect } from "react"
import { socket } from "@/lib/socket"
import { Users } from "lucide-react"

export default function RoomStatus() {
    const [roomCount, setRoomCount] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Listen for room count updates
        const handleRoomCountUpdate = ({ count }: { count: number }) => {
            setRoomCount(count)
            setIsLoading(false)
        }

        socket.on("room_count_update", handleRoomCountUpdate)

        // Request room count on mount
        socket.emit("get_room_count")

        // Clean up listener on unmount
        return () => {
            socket.off("room_count_update", handleRoomCountUpdate)
        }
    }, [])

    if (isLoading) {
        return (
            <div className="text-center text-gray-500 text-sm mt-4">
                <Users className="inline h-4 w-4 mr-1" />
                加载房间数据中...
            </div>
        )
    }

    const isFull = roomCount !== null && roomCount >= 100

    return (
        <div className="text-center text-sm mb-6">
            <Users className="inline h-4 w-4 mr-1" />
            {isFull ? (
                <span className="text-red-500 font-medium">服务器房间已满，请稍后再试</span>
            ) : (
                <span className="text-gray-500">
          当前活跃房间数: <span className="font-medium">{roomCount}/100</span>
        </span>
            )}
        </div>
    )
}
