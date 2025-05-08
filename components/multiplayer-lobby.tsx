"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Settings, Copy, ArrowRight, HomeIcon as House, ArrowLeft, UserPlus, Shuffle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { MultiplayerRoom, GameSettings, Song } from "@/types/game"
import { MULTIPLAYER_DEFAULT_SETTINGS } from "@/lib/game-logic"
import SettingsPanel from "@/components/settings-panel"
import { socket } from "@/lib/socket"
import PlayerList from "@/components/player-list"

// 更新 MultiplayerLobby 组件
interface MultiplayerLobbyProps {
    onStartGame: (room: MultiplayerRoom) => void
    onBack: () => void
    initialSongs: Song[]
}

// 昵称存储的键名
const NICKNAME_STORAGE_KEY = "maimai_wordle_nickname"

export default function MultiplayerLobby({ onStartGame, onBack, initialSongs }: MultiplayerLobbyProps) {
    const [nickname, setNickname] = useState("")
    const [roomId, setRoomId] = useState("")
    const [bestOf, setBestOf] = useState("3")
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState<GameSettings>(MULTIPLAYER_DEFAULT_SETTINGS)
    const [room, setRoom] = useState<MultiplayerRoom | null>(null)
    const [isHost, setIsHost] = useState(false)
    const [isPublic, setIsPublic] = useState(false)
    const { toast } = useToast()

    // 加载保存的昵称
    useEffect(() => {
        const savedNickname = localStorage.getItem(NICKNAME_STORAGE_KEY)
        if (savedNickname) {
            setNickname(savedNickname)
        }
    }, [])

    // 保存昵称到 localStorage
    const saveNickname = (name: string) => {
        if (name && name.trim()) {
            localStorage.setItem(NICKNAME_STORAGE_KEY, name.trim())
        }
    }

    useEffect(() => {
        // Set up socket event listeners
        socket.on("room_created", ({ roomId, room }) => {
            setRoom(room)
            setIsHost(true)
            // 保存昵称
            saveNickname(nickname)
            toast({
                title: "房间创建成功",
                description: `房间号: ${roomId}`,
            })
        })

        socket.on("room_joined", ({ room }) => {
            setRoom(room)
            setIsHost(socket.id === room.host)
            // 保存昵称
            saveNickname(nickname)
            toast({
                title: "成功加入房间",
                description: `房间号: ${room.id}`,
            })
        })

        socket.on("player_joined", ({ room, playerId }) => {
            setRoom(room)
            const newPlayer = room.players[playerId]
            if (newPlayer && socket.id !== playerId) {
                toast({
                    title: "玩家加入",
                    description: `${newPlayer.nickname} 加入了房间`,
                })
            }
        })

        socket.on("player_left", ({ room, playerId, playerName }) => {
            setRoom(room)
            if (socket.id !== playerId) {
                toast({
                    title: "玩家离开",
                    description: `${playerName} 离开了房间`,
                })
            }
        })

        socket.on("player_removed", ({ room, playerId, playerName }) => {
            setRoom(room)
            if (socket.id === playerId) {
                setRoom(null)
                toast({
                    title: "你被移出房间",
                    description: "房主将你移出了房间",
                    variant: "destructive",
                })
            } else {
                toast({
                    title: "玩家被移除",
                    description: `${playerName} 被移出了房间`,
                })
            }
        })

        socket.on("player_ready", ({ room, playerId }) => {
            setRoom(room)
            const readyPlayer = room.players[playerId]
            if (readyPlayer && socket.id !== playerId) {
                toast({
                    title: "玩家准备就绪",
                    description: `${readyPlayer.nickname} 已准备好`,
                })
            }
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
            socket.off("player_removed")
            socket.off("player_ready")
            socket.off("host_changed")
            socket.off("game_started")
            socket.off("room_error")
        }
    }, [toast, isHost, onStartGame, nickname])

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
            songs: initialSongs,
            isPublic,
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

    const joinRandomRoom = () => {
        if (!nickname.trim()) {
            toast({
                title: "请输入昵称",
                variant: "destructive",
            })
            return
        }

        socket.emit("join_random_room", {
            nickname,
        })
    }

    const toggleReady = () => {
        if (!room) return

        socket.emit("toggle_ready", {
            roomId: room.id,
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

    const removePlayer = (playerId: string) => {
        if (!room || !isHost) return

        socket.emit("remove_player", {
            roomId: room.id,
            playerId,
        })
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
        const allPlayersReady = players.length >= 2 && players.every((p) => p.id === room.host || p.isReady)
        const currentPlayer = room.players[socket.id]
        const isCurrentPlayerReady = currentPlayer?.isReady || false
        const bestOfLabel = {
            '1': '先得1分者胜利',
            '3': '先得2分者胜利',
            '5': '先得3分者胜利',
            '7': '先得4分者胜利',
            '9': '先得5分者胜利',
        };
        return (
            <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="relative bg-gradient-to-r from-pink-500 to-purple-500 text-white p-5 flex items-center justify-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={leaveRoom}
                        className="absolute left-4 text-white hover:bg-white/20"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-xl font-medium">多人模式房间</h1>
                </div>
                <div className="p-6">
                    <div className="mb-3 flex justify-between items-center">
                        <div className="flex items-center">
                            <span className="text-lg font-medium mb-1">房间号: {room.id}</span>
                            <Button variant="ghost" size="icon" onClick={copyRoomId} className="text-black hover:bg-black/20 ml-1">
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${room.isPublic ? "text-green-600" : "text-blue-600"}`}>
                {room.isPublic ? "公开" : "私密"}
              </span>
                        </div>
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-3">玩家 ({players.length}/6)</h3>
                        <PlayerList
                            players={room.players}
                            hostId={room.host}
                            currentPlayerId={socket.id}
                            playerAvatars={room.playerAvatars}
                            onRemovePlayer={isHost ? removePlayer : undefined}
                        />
                    </div>

                    <div className="mb-6">
                        <h3 className="text-lg font-medium mb-2">游戏设置</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>比赛模式</Label>
                                <div className="font-medium">{bestOfLabel[room.bestOf]} / {room.settings.topSongs > 500? "无限制" : `前${room.settings.topSongs}首热门歌曲`}</div>
                            </div>
                            <div>
                                <Label>版本范围</Label>
                                <div className="font-medium">
                                    {room.settings.versionRange.min} - {room.settings.versionRange.max}
                                </div>
                            </div>
                            <div>
                                <Label>流派</Label>
                                <div className="font-medium">
                                    {room.settings.genres.length === 0 ||
                                    ["舞萌", "音击&中二节奏", "niconico & VOCALOID", "流行&动漫", "东方Project", "其他游戏"].every((p) =>
                                        room.settings.genres.includes(p),
                                    )
                                        ? "全部"
                                        : `${room.settings.genres.join(", ")}`}
                                </div>
                            </div>
                            <div>
                                <Label>Master等级范围</Label>
                                <div className="font-medium">
                                    {room.settings.masterLevelRange.min} - {room.settings.masterLevelRange.max}
                                </div>
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

                        {isHost ? (
                            <Button
                                onClick={startGame}
                                disabled={!allPlayersReady}
                                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                            >
                                {allPlayersReady ? "开始游戏" : "等待玩家准备..."}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Button
                                onClick={toggleReady}
                                className={
                                    isCurrentPlayerReady
                                        ? "bg-green-500 hover:bg-green-600 text-white"
                                        : "bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                }
                            >
                                {isCurrentPlayerReady ? "取消准备" : "准备"}
                                {isCurrentPlayerReady && (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="16"
                                        height="16"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        className="ml-2"
                                    >
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="relative p-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center">
                <Button variant="ghost" size="icon" onClick={onBack} className="absolute left-4 text-white hover:bg-white/20">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-medium text-center">多人模式</h1>
            </div>
            <div className="p-6">
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
                        maxLength={8}
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className='grid grid-cols-2 gap-4'>
                            <div className="flex items-center gap-2">
                                <House className="h-6 w-6"/>
                                <h3 className="text-lg font-medium">创建房间</h3>
                            </div>
                            <div className="flex items-center gap-2 justify-end">
                                <Switch id="public-room" checked={isPublic} onCheckedChange={setIsPublic}/>
                                <Label htmlFor="public-room">公开房间</Label>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="bestOf" className="mb-2 block">
                                比赛模式
                            </Label>
                            <Select value={bestOf} onValueChange={setBestOf}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择比赛模式" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">先得1分者胜利</SelectItem>
                                    <SelectItem value="3">先得2分者胜利</SelectItem>
                                    <SelectItem value="5">先得3分者胜利</SelectItem>
                                    <SelectItem value="7">先得4分者胜利</SelectItem>
                                    <SelectItem value="9">先得5分者胜利</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={() => setShowSettings(true)} variant="outline" className="w-full">
                            <Settings className="mr-2 h-4 w-4" />
                            游戏设置
                        </Button>
                        <Button onClick={createRoom} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
                            <UserPlus className="mr-2 h-4 w-4" />
                            创建房间
                        </Button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ArrowRight className="h-6 w-6" />
                            <h3 className="text-lg font-medium">加入房间</h3>
                        </div>
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
                        <Button onClick={joinRandomRoom} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                            <Shuffle className="mr-2 h-4 w-4" />
                            随机加入公开房间
                        </Button>
                    </div>
                </div>
            </div>

            {showSettings && (
                <SettingsPanel
                    settings={settings}
                    onApply={applySettings}
                    onClose={() => setShowSettings(false)}
                    isMultiplayer={true}
                />
            )}
        </div>
    )
}
