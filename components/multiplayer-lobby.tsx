"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Settings, Users, Copy, ArrowRight, House, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { MultiplayerRoom, GameSettings, Song } from "@/types/game"
import { MULTIPLAYER_DEFAULT_SETTINGS } from "@/lib/game-logic"
import SettingsPanel from "@/components/settings-panel"
import { socket } from "@/lib/socket"

interface MultiplayerLobbyProps {
    onStartGame: (room: MultiplayerRoom) => void
    onBack: () => void
    initialSongs: Song[]
}

export default function MultiplayerLobby({ onStartGame, onBack, initialSongs }: MultiplayerLobbyProps) {
    const [nickname, setNickname] = useState("")
    const [roomId, setRoomId] = useState("")
    const [bestOf, setBestOf] = useState("3")
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState<GameSettings>(MULTIPLAYER_DEFAULT_SETTINGS)
    const [room, setRoom] = useState<MultiplayerRoom | null>(null)
    const [isHost, setIsHost] = useState(false)
    const { toast } = useToast()

    useEffect(() => {
        // Set up socket event listeners
        socket.on("room_created", ({ roomId, room }) => {
            setRoom(room)
            setIsHost(true)
            toast({
                title: "房间创建成功",
                description: `房间号: ${roomId}`,
            })
        })

        socket.on("room_joined", ({ room }) => {
            setRoom(room)
            setIsHost(socket.id === room.host)
            toast({
                title: "成功加入房间",
                description: `房间号: ${room.id}`,
            })
        })

        socket.on("player_joined", ({ room }) => {
            setRoom(room)
            if (isHost) {
                toast({
                    title: "玩家加入",
                    description: `${Object.values(room.players).find((p) => p.id !== socket.id)?.nickname} 加入了房间`,
                })
            }
        })

        socket.on("player_left", ({ room }) => {
            setRoom(room)
            toast({
                title: "玩家离开",
                description: "一名玩家离开了房间",
            })
        })

        socket.on("host_changed", ({ room }) => {
            setRoom(room)
            setIsHost(socket.id === room.host)
            if (socket.id === room.host) {
                toast({
                    title: "你现在是房主",
                    description: "原房主已离开",
                })
            }
        })

        socket.on("game_started", ({ room }) => {
            onStartGame(room)
        })

        socket.on("room_error", ({ message }) => {
            toast({
                title: "错误",
                description: message,
                variant: "destructive",
            })
        })

        // Clean up listeners on unmount
        return () => {
            socket.off("room_created")
            socket.off("room_joined")
            socket.off("player_joined")
            socket.off("player_left")
            socket.off("host_changed")
            socket.off("game_started")
            socket.off("room_error")
        }
    }, [toast, isHost, onStartGame])

    const createRoom = () => {
        if (!nickname.trim()) {
            toast({
                title: "请输入昵称",
                variant: "destructive",
            })
            return
        }

        socket.emit("create_room", {
            nickname,
            settings,
            bestOf: Number.parseInt(bestOf),
            songs: initialSongs, // Pass the songs to the server
        })
    }

    const joinRoom = () => {
        if (!nickname.trim()) {
            toast({
                title: "请输入昵称",
                variant: "destructive",
            })
            return
        }

        if (!roomId.trim()) {
            toast({
                title: "请输入房间号",
                variant: "destructive",
            })
            return
        }

        socket.emit("join_room", {
            roomId,
            nickname,
        })
    }

    const startGame = () => {
        if (!room) return

        socket.emit("start_game", {
            roomId: room.id,
        })
    }

    const leaveRoom = () => {
        if (room) {
            socket.emit("leave_room", {
                roomId: room.id,
            })
        }
        setRoom(null)
        setIsHost(false)
    }

    const copyRoomId = () => {
        if (room) {
            navigator.clipboard.writeText(room.id)
            toast({
                title: "已复制房间号",
                description: `房间号 ${room.id} 已复制到剪贴板`,
            })
        }
    }

    const applySettings = (newSettings: GameSettings) => {
        setSettings(newSettings)
        setShowSettings(false)
    }

    if (room) {
        const players = Object.values(room.players)
        const canStart = isHost && players.length === 2

        return (
            <Card className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="relative bg-gradient-to-r from-pink-500 to-purple-500 text-white p-5 flex items-center justify-center">
                    <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-4 text-white hover:bg-white/20">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-medium">双人模式房间</h1>
                </div>
                <CardContent className="p-6">
                    <div className="mb-3">
                        <span className="text-lg font-medium mb-1">房间号: {room.id}</span>
                        <Button variant="ghost" size="icon" onClick={copyRoomId} className="text-black hover:bg-black/20 ml-1">
                            <Copy className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">玩家 ({players.length}/2)</h3>
                        <div className="space-y-3">
                            {players.map((player) => (
                                <div key={player.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
                                            <img
                                                src={player.id === room.host ? "/chara01.png" : "/chara02.png"}
                                                alt="avatar"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="font-medium flex items-center gap-1">
                                                {player.nickname}
                                                {player.id === room.host && <House className="h-4 w-4 text-yellow-500" />}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{player.id === socket.id ? "你" : "对手"}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-2">游戏设置</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>比赛模式</Label>
                                <div className="font-medium">BO{room.bestOf}</div>
                            </div>
                            <div>
                                <Label>版本范围</Label>
                                <div className="font-medium">{room.settings.versionRange.min} - {room.settings.versionRange.max}</div>
                            </div>
                            <div>
                                <Label>流派</Label>
                                <div className="font-medium">
                                    {room.settings.genres.length === 0 ||
                                    ["舞萌", "音击&中二节奏", "niconico & VOCALOID", "流行&动漫", "东方Project", "其他游戏"]
                                        .every(p => room.settings.genres.includes(p))
                                        ? "全部"
                                        : `${room.settings.genres.join(", ")}`}
                                </div>
                            </div>
                            <div>
                                <Label>Master等级范围</Label>
                                <div className="font-medium">{room.settings.masterLevelRange.min} - {room.settings.masterLevelRange.max}</div>
                            </div>
                            <div>
                                <Label>最大猜测次数</Label>
                                <div className="font-medium">{room.settings.maxGuesses}次</div>
                            </div>
                            <div>
                                <Label>时间限制</Label>
                                <div className="font-medium">
                                    {room.settings.timeLimit === 0 ? "无限制" : `${room.settings.timeLimit}秒`}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between">
                        <Button variant="outline" onClick={leaveRoom}>
                            离开房间
                        </Button>
                        {isHost && (
                            <Button
                                onClick={startGame}
                                disabled={!canStart}
                                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                            >
                                {canStart ? "开始游戏" : "等待玩家加入..."}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="relative p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center">
                <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-4 text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-medium text-center">双人模式</h1>
            </div>
            <CardContent className="p-6">
                <div className="mb-6">
                    <Label htmlFor="nickname" className="mb-2 block">
                        你的昵称
                    </Label>
                    <Input
                        id="nickname"
                        placeholder="输入你的昵称..."
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        className="mb-4"
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">创建房间</h3>
                        <div>
                            <Label htmlFor="bestOf" className="mb-2 block">
                                比赛模式
                            </Label>
                            <Select value={bestOf} onValueChange={setBestOf}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择比赛模式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">BO1 (1轮)</SelectItem>
                                    <SelectItem value="3">BO3 (3轮)</SelectItem>
                                    <SelectItem value="5">BO5 (5轮)</SelectItem>
                                    <SelectItem value="7">BO7 (7轮)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => setShowSettings(true)} variant="outline" className="w-full">
                            <Settings className="mr-2 h-4 w-4" />
                            游戏设置
                        </Button>
                        <Button onClick={createRoom} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            <Users className="mr-2 h-4 w-4" />
                            创建房间
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-lg font-medium">加入房间</h3>
                        <div>
                            <Label htmlFor="roomId" className="mb-2 block">
                                房间号
                            </Label>
                            <Input
                                id="roomId"
                                placeholder="输入房间号..."
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            />
                        </div>
                        <Button onClick={joinRoom} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            <ArrowRight className="mr-2 h-4 w-4" />
                            加入房间
                        </Button>
                    </div>
                </div>
            </CardContent>

            {showSettings && (
                <SettingsPanel
                    settings={settings}
                    onApply={applySettings}
                    onClose={() => setShowSettings(false)}
                    isMultiplayer={true} // Specify that this is multiplayer mode
                />
            )}
        </Card>
    )
}
