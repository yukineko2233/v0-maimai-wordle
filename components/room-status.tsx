"use client"

import { useState, useEffect } from "react"
import { socket } from "@/lib/socket"
import { Users, Globe } from "lucide-react"

export default function RoomStatus() {
    const [roomCount, setRoomCount] = useState<number | null>(null)
    const [publicRoomCount, setPublicRoomCount] = useState<number | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        // Listen for room count updates
        const handleRoomCountUpdate = ({ count, publicCount }: { count: number; publicCount: number }) => {
            setRoomCount(count)
            setPublicRoomCount(publicCount)
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
            <div className="text-center text-gray-500 text-sm mb-2 ml-2 mr-2">
                <Users className="inline h-4 w-4 mr-1" />
                加载房间数据中，若无响应请等待1分钟左右...
            </div>
        )
    }

    const isFull = roomCount !== null && roomCount >= 200

    return (
        <div className="text-center text-sm mb-2">
            <div className="flex justify-center items-center gap-4">
                <div>
                    <Users className="inline h-4 w-4 mr-1" />
                    {isFull ? (
                        <span className="text-red-500 font-medium">服务器房间已满，请稍后再试</span>
                    ) : (
                        <span className="text-gray-500">
              当前活跃房间数: <span className="font-medium">{roomCount}/200</span>
            </span>
                    )}
                </div>

                {publicRoomCount !== null && publicRoomCount > 0 && (
                    <div>
                        <Globe className="inline h-4 w-4 mr-1" />
                        <span className="text-gray-500">
              公开房间: <span className="font-medium">{publicRoomCount}</span>
            </span>
                    </div>
                )}
            </div>
        </div>
    )
}
