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
import { useLanguage } from "@/lib/i18n/language-context"

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
  const { t } = useLanguage()

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
        title: t("roomCreatedSuccessfully"),
        description: `${t("roomNumber")}: ${roomId}`,
      })
    })

    socket.on("room_joined", ({ room }) => {
      setRoom(room)
      setIsHost(socket.id === room.host)
      // 保存昵称
      saveNickname(nickname)
      toast({
        title: t("successfullyJoinedRoom"),
        description: `${t("roomNumber")}: ${room.id}`,
      })
    })

    socket.on("player_joined", ({ room, playerId }) => {
      setRoom(room)
      const newPlayer = room.players[playerId]
      if (newPlayer && socket.id !== playerId) {
        toast({
          title: t("playerJoined"),
          description: `${newPlayer.nickname} ${t("joinedTheRoom")}`,
        })
      }
    })

    socket.on("player_left", ({ room, playerId, playerName }) => {
      setRoom(room)
      if (socket.id !== playerId) {
        toast({
          title: t("playerLeft"),
          description: `${playerName} ${t("leftTheRoom")}`,
        })
      }
    })

    socket.on("player_removed", ({ room, playerId, playerName }) => {
      setRoom(room)
      if (socket.id === playerId) {
        setRoom(null)
        toast({
          title: t("youWereKicked"),
          description: t("hostKickedYou"),
          variant: "destructive",
        })
      } else {
        toast({
          title: t("playerKicked"),
          description: `${playerName} ${t("wasKicked")}`,
        })
      }
    })

    socket.on("player_ready", ({ room, playerId }) => {
      setRoom(room)
      const readyPlayer = room.players[playerId]
      if (readyPlayer && socket.id !== playerId) {
        toast({
          title: t("playerReady"),
          description: `${readyPlayer.nickname} ${t("isReady")}`,
        })
      }
    })

    socket.on("host_changed", ({ room }) => {
      setRoom(room)
      setIsHost(socket.id === room.host)
      if (socket.id === room.host) {
        toast({
          title: t("youAreNowHost"),
          description: t("originalHostLeft"),
        })
      }
    })

    socket.on("game_started", ({ room }) => {
      onStartGame(room)
    })

    socket.on("room_error", ({ message }) => {
      toast({
        title: t("error"),
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
  }, [toast, isHost, onStartGame, nickname, t])

  const createRoom = () => {
    if (!nickname.trim()) {
      toast({
        title: t("pleaseEnterNickname"),
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
        title: t("pleaseEnterNickname"),
        variant: "destructive",
      })
      return
    }

    if (!roomId.trim()) {
      toast({
        title: t("pleaseEnterRoomId"),
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
        title: t("pleaseEnterNickname"),
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
        title: t("roomIdCopied"),
        description: `${t("roomNumber")} ${room.id} ${t("roomIdCopiedToClipboard")}`,
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
      "1": t("firstTo1Win"),
      "3": t("firstTo2Win"),
      "5": t("firstTo3Win"),
      "7": t("firstTo4Win"),
      "9": t("firstTo5Win"),
    }
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
          <h1 className="text-xl font-medium">{t("multiplayerRoom")}</h1>
        </div>
        <div className="p-6">
          <div className="mb-3 flex justify-between items-center">
            <div className="flex items-center">
              <span className="text-lg font-medium mb-1">
                {t("roomNumber")}: {room.id}
              </span>
              <Button variant="ghost" size="icon" onClick={copyRoomId} className="text-black hover:bg-black/20 ml-1">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${room.isPublic ? "text-green-600" : "text-blue-600"}`}>
                {room.isPublic ? t("public") : t("private")}
              </span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3">
              {t("players")} ({players.length}/6)
            </h3>
            <PlayerList
              players={room.players}
              hostId={room.host}
              currentPlayerId={socket.id}
              playerAvatars={room.playerAvatars}
              onRemovePlayer={isHost ? removePlayer : undefined}
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium mb-2">{t("gameSettings")}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>{t("matchMode")}</Label>
                <div className="font-medium">{bestOfLabel[room.bestOf]}</div>
              </div>
              <div>
                <Label>{t("versionRange")}</Label>
                <div className="font-medium">
                  {room.settings.versionRange.min} - {room.settings.versionRange.max}
                </div>
              </div>
              <div>
                <Label>{t("genre")}</Label>
                <div className="font-medium">
                  {room.settings.genres.length === 0 ||
                  ["舞萌", "音击&中二节奏", "niconico & VOCALOID", "流行&动漫", "东方Project", "其他游戏"].every((p) =>
                    room.settings.genres.includes(p),
                  )
                    ? t("all")
                    : `${room.settings.genres.join(", ")}`}
                </div>
              </div>
              <div>
                <Label>{t("masterLevelRange")}</Label>
                <div className="font-medium">
                  {room.settings.masterLevelRange.min} - {room.settings.masterLevelRange.max}
                </div>
              </div>
              <div>
                <Label>{t("maxGuesses")}</Label>
                <div className="font-medium">{room.settings.maxGuesses}次</div>
              </div>
              <div>
                <Label>{t("timeLimit")}</Label>
                <div className="font-medium">
                  {room.settings.timeLimit === 0 ? t("unlimited") : `${room.settings.timeLimit}秒`}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={leaveRoom}>
              {t("leaveRoom")}
            </Button>

            {isHost ? (
              <Button
                onClick={startGame}
                disabled={!allPlayersReady}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
              >
                {allPlayersReady ? t("startGame") : t("waitingForPlayers")}
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
                {isCurrentPlayerReady ? t("cancelReady") : t("ready")}
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
        <h1 className="text-xl font-medium text-center">{t("multiplayerLobby")}</h1>
      </div>
      <div className="p-6">
        <div className="mb-6">
          <Label htmlFor="nickname" className="mb-2 block">
            {t("nickname")}
          </Label>
          <Input
            id="nickname"
            placeholder={t("enterNickname")}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="mb-4"
            maxLength={8}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <House className="h-6 w-6" />
                <h3 className="text-lg font-medium">{t("createRoom")}</h3>
              </div>
              <div className="flex items-center gap-2 justify-end">
                <Switch id="public-room" checked={isPublic} onCheckedChange={setIsPublic} />
                <Label htmlFor="public-room">{t("publicRoom")}</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="bestOf" className="mb-2 block">
                {t("matchMode")}
              </Label>
              <Select value={bestOf} onValueChange={setBestOf}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMatchMode")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("firstTo1Win")}</SelectItem>
                  <SelectItem value="3">{t("firstTo2Win")}</SelectItem>
                  <SelectItem value="5">{t("firstTo3Win")}</SelectItem>
                  <SelectItem value="7">{t("firstTo4Win")}</SelectItem>
                  <SelectItem value="9">{t("firstTo5Win")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => setShowSettings(true)} variant="outline" className="w-full">
              <Settings className="mr-2 h-4 w-4" />
              {t("gameSettings")}
            </Button>
            <Button onClick={createRoom} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <UserPlus className="mr-2 h-4 w-4" />
              {t("createRoom")}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ArrowRight className="h-6 w-6" />
              <h3 className="text-lg font-medium">{t("joinRoom")}</h3>
            </div>
            <div>
              <Label htmlFor="roomId" className="mb-2 block">
                {t("roomNumber")}
              </Label>
              <Input
                id="roomId"
                placeholder={t("enterRoomId")}
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
              />
            </div>
            <Button onClick={joinRoom} className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white">
              <ArrowRight className="mr-2 h-4 w-4" />
              {t("joinRoom")}
            </Button>
            <Button onClick={joinRandomRoom} className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
              <Shuffle className="mr-2 h-4 w-4" />
              {t("joinRandomPublicRoom")}
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
