import { randomBytes, randomUUID } from "node:crypto"
import { Server as SocketIOServer, Socket } from "socket.io"
import type {
  BestOf,
  GameSettings,
  MultiplayerRoom,
  PlayerState,
  Song,
} from "../../shared/types"
import { filterSongs, getRandomSong, processGuess } from "../../shared/domain/game"

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const MAX_ROOM_CAPACITY = 6
const MAX_SERVER_ROOMS = 200
const RECONNECT_GRACE_MS = 60_000
const WAITING_ROOM_TTL_MS = 30 * 60_000
const FINISHED_ROOM_TTL_MS = 5 * 60_000
const NEXT_ROUND_DELAY_MS = 20_000
const UNLIMITED_MATCH_TTL_MS = 10 * 60_000
const VALID_BEST_OF = new Set<BestOf>([1, 3, 5, 7, 9])

export interface SocketActionResult {
  ok: boolean
  message?: string
}

interface ServerPlayerState extends PlayerState {
  socketId: string | null
  sessionToken: string
}

interface ServerRoom extends Omit<MultiplayerRoom, "players" | "targetSong"> {
  players: Record<string, ServerPlayerState>
  targetSong: Song
  nextRoundDeadline: number | null
  matchDeadline: number | null
}

type IncomingGameSettings = Omit<GameSettings, "versionRange"> & {
  versionRange: { min: string; max: string }
}

export class RoomManager {
  private rooms = new Map<string, ServerRoom>()
  private socketToRoom = new Map<string, string>()
  private socketToPlayer = new Map<string, string>()
  private sessionToPlayer = new Map<string, { roomId: string; playerId: string }>()
  private disconnectTimers = new Map<string, NodeJS.Timeout>()
  private roundTimers = new Map<string, NodeJS.Timeout>()
  private nextRoundTimers = new Map<string, NodeJS.Timeout>()
  private matchTimers = new Map<string, NodeJS.Timeout>()
  private roomExpiryTimers = new Map<string, NodeJS.Timeout>()

  constructor(private io: SocketIOServer, private getCatalogSongs: () => Song[]) {}

  private generateRoomCode() {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = ""
      for (let i = 0; i < 6; i++) code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length))
      if (!this.rooms.has(code)) return code
    }
    for (let attempt = 0; attempt < 100; attempt++) {
      const code = Array.from(randomBytes(6), (byte) => ROOM_CODE_CHARS[byte % ROOM_CODE_CHARS.length]).join("")
      if (!this.rooms.has(code)) return code
    }
    throw new Error("Unable to allocate a unique room code")
  }

  private generateSessionToken() {
    return randomBytes(32).toString("base64url")
  }

  private publicRoom(room: ServerRoom, viewerId?: string, includeFilteredSongs = false): MultiplayerRoom {
    const players = Object.fromEntries(
      Object.entries(room.players).map(([id, player]) => {
        const { socketId: _socketId, sessionToken: _sessionToken, ...publicPlayer } = player
        return [
          id,
          id === viewerId
            ? publicPlayer
            : { ...publicPlayer, currentRound: { ...publicPlayer.currentRound, guesses: [] } },
        ]
      }),
    )
    const { filteredSongs, ...publicState } = room
    return {
      ...publicState,
      players,
      targetSong: room.roundSettled || room.status === "finished" ? room.targetSong : null,
      ...(includeFilteredSongs ? { filteredSongs } : {}),
    } as MultiplayerRoom
  }

  private emitRoom(room: ServerRoom, event: string, extra: Record<string, unknown> = {}) {
    for (const player of Object.values(room.players)) {
      if (player.socketId) {
        this.io.to(player.socketId).emit(event, { room: this.publicRoom(room, player.id), ...extra })
      }
    }
  }

  private reject(socket: Socket, message: string): SocketActionResult {
    socket.emit("room_error", { message })
    return { ok: false, message }
  }

  private ensureSocketAvailable(socket: Socket) {
    if (!this.socketToRoom.has(socket.id)) return true
    this.reject(socket, "当前连接已经在一个房间中，请先退出")
    return false
  }

  private getPlayer(room: ServerRoom, socket: Socket) {
    const playerId = this.socketToPlayer.get(socket.id)
    return playerId ? room.players[playerId] : undefined
  }

  private scheduleRoomExpiry(room: ServerRoom) {
    const oldTimer = this.roomExpiryTimers.get(room.id)
    if (oldTimer) clearTimeout(oldTimer)
    const ttl = room.status === "finished" ? FINISHED_ROOM_TTL_MS : WAITING_ROOM_TTL_MS
    if (room.status === "playing") {
      this.roomExpiryTimers.delete(room.id)
      return
    }
    const timer = setTimeout(() => this.expireRoom(room.id), ttl)
    this.roomExpiryTimers.set(room.id, timer)
  }

  private expireRoom(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return
    for (const player of Object.values(room.players)) {
      if (player.socketId) {
        this.io.to(player.socketId).emit("room_expired", {
          roomId,
          message: room.status === "waiting" ? "等待房间长时间无活动，已自动关闭" : "对战房间已过期",
        })
      }
    }
    this.deleteRoom(roomId)
  }

  private deleteRoom(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return
    for (const player of Object.values(room.players)) {
      this.sessionToPlayer.delete(player.sessionToken)
      if (player.socketId) {
        this.socketToRoom.delete(player.socketId)
        this.socketToPlayer.delete(player.socketId)
        this.io.sockets.sockets.get(player.socketId)?.leave(roomId)
      }
      const disconnectTimer = this.disconnectTimers.get(player.id)
      if (disconnectTimer) clearTimeout(disconnectTimer)
      this.disconnectTimers.delete(player.id)
    }
    const roundTimer = this.roundTimers.get(roomId)
    if (roundTimer) clearTimeout(roundTimer)
    const nextRoundTimer = this.nextRoundTimers.get(roomId)
    if (nextRoundTimer) clearTimeout(nextRoundTimer)
    const matchTimer = this.matchTimers.get(roomId)
    if (matchTimer) clearTimeout(matchTimer)
    const expiryTimer = this.roomExpiryTimers.get(roomId)
    if (expiryTimer) clearTimeout(expiryTimer)
    this.roundTimers.delete(roomId)
    this.nextRoundTimers.delete(roomId)
    this.matchTimers.delete(roomId)
    this.roomExpiryTimers.delete(roomId)
    this.rooms.delete(roomId)
    this.broadcastRoomStats()
  }

  getRoomStats() {
    let publicCount = 0
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.status === "waiting" && Object.keys(room.players).length < MAX_ROOM_CAPACITY) publicCount++
    }
    return { count: this.rooms.size, publicCount }
  }

  broadcastRoomStats() {
    this.io.emit("room_count_update", this.getRoomStats())
  }

  private updateParticipantInfo(room: ServerRoom, playerId: string) {
    const player = room.players[playerId]
    if (!player) return
    room.allParticipants[playerId] = {
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      avatarId: room.playerAvatars[playerId] || 1,
    }
  }

  private makePlayer(socket: Socket, nickname: string, timeLimit: number): ServerPlayerState {
    return {
      id: randomUUID(),
      socketId: socket.id,
      sessionToken: this.generateSessionToken(),
      nickname,
      score: 0,
      online: true,
      currentRound: { guesses: [], gameOver: false, won: false, remainingTime: timeLimit },
      isReady: false,
      readyForNextRound: false,
    }
  }

  private bindPlayer(socket: Socket, room: ServerRoom, player: ServerPlayerState) {
    this.socketToRoom.set(socket.id, room.id)
    this.socketToPlayer.set(socket.id, player.id)
    this.sessionToPlayer.set(player.sessionToken, { roomId: room.id, playerId: player.id })
    socket.join(room.id)
  }

  createRoom(socket: Socket, data: { nickname: string; settings: IncomingGameSettings; bestOf: BestOf; isPublic?: boolean }): SocketActionResult {
    if (!this.ensureSocketAvailable(socket)) return { ok: false, message: "当前连接已经在一个房间中，请先退出" }
    if (this.rooms.size >= MAX_SERVER_ROOMS) return this.reject(socket, "服务器房间已满，请稍后再试。")
    if (!data?.settings || !VALID_BEST_OF.has(data.bestOf)) return this.reject(socket, "房间设置无效")

    const settings = data.settings as GameSettings
    const filtered = filterSongs(this.getCatalogSongs(), settings)
    if (!filtered.length) return this.reject(socket, "当前设置下没有可用的歌曲，请调整设置。")

    const roomId = this.generateRoomCode()
    const player = this.makePlayer(socket, data.nickname?.trim() || "玩家", settings.timeLimit)
    const room: ServerRoom = {
      id: roomId,
      host: player.id,
      players: { [player.id]: player },
      settings,
      bestOf: data.bestOf,
      currentRound: 1,
      maxRounds: data.bestOf,
      roundsWon: {},
      targetSong: getRandomSong(filtered),
      roundDeadline: null,
      nextRoundDeadline: null,
      matchDeadline: null,
      filteredSongs: filtered,
      status: "waiting",
      roundSettled: false,
      isPublic: Boolean(data.isPublic),
      playerAvatars: { [player.id]: Math.floor(Math.random() * 6) + 1 },
      allParticipants: {},
    }
    this.rooms.set(roomId, room)
    this.bindPlayer(socket, room, player)
    this.scheduleRoomExpiry(room)
    socket.emit("room_created", { roomId, room: this.publicRoom(room, player.id, true), sessionToken: player.sessionToken, playerId: player.id })
    this.broadcastRoomStats()
    return { ok: true }
  }

  joinRoom(socket: Socket, data: { roomId: string; nickname: string }): SocketActionResult {
    if (!this.ensureSocketAvailable(socket)) return { ok: false, message: "当前连接已经在一个房间中，请先退出" }
    const room = this.rooms.get(data?.roomId?.trim().toUpperCase())
    if (!room) return this.reject(socket, "房间不存在")
    if (room.status !== "waiting") return this.reject(socket, "游戏已经开始，无法加入")
    const currentPlayers = Object.keys(room.players)
    if (currentPlayers.length >= MAX_ROOM_CAPACITY) return this.reject(socket, "房间已满")

    const usedAvatars = Object.values(room.playerAvatars)
    let avatarId = 1
    while (usedAvatars.includes(avatarId) && avatarId <= 6) avatarId++
    if (avatarId > 6) avatarId = 1
    const player = this.makePlayer(socket, data.nickname?.trim() || `玩家${currentPlayers.length + 1}`, room.settings.timeLimit)
    room.players[player.id] = player
    room.playerAvatars[player.id] = avatarId
    this.bindPlayer(socket, room, player)
    this.scheduleRoomExpiry(room)
    socket.emit("room_joined", { room: this.publicRoom(room, player.id, true), sessionToken: player.sessionToken, playerId: player.id })
    this.emitRoom(room, "player_joined", { playerId: player.id })
    this.broadcastRoomStats()
    return { ok: true }
  }

  reconnectSession(socket: Socket, data: { sessionToken: string }) {
    if (!this.ensureSocketAvailable(socket)) return
    const session = data?.sessionToken && this.sessionToPlayer.get(data.sessionToken)
    if (!session) return socket.emit("reconnect_failed", { message: "会话已失效或已超时" })
    const room = this.rooms.get(session.roomId)
    const player = room?.players[session.playerId]
    if (!room || !player) {
      this.sessionToPlayer.delete(data.sessionToken)
      return socket.emit("reconnect_failed", { message: "房间已解散或玩家已离开" })
    }
    if (player.online || player.socketId) return socket.emit("reconnect_failed", { message: "该玩家仍在线，无法恢复会话" })

    const timer = this.disconnectTimers.get(player.id)
    if (timer) clearTimeout(timer)
    this.disconnectTimers.delete(player.id)
    this.sessionToPlayer.delete(data.sessionToken)
    player.sessionToken = this.generateSessionToken()
    player.socketId = socket.id
    player.online = true
    this.bindPlayer(socket, room, player)
    socket.emit("reconnected", { room: this.publicRoom(room, player.id, true), sessionToken: player.sessionToken, playerId: player.id })
    this.emitRoom(room, "player_reconnected", { playerId: player.id })
  }

  joinRandomRoom(socket: Socket, data: { nickname: string }): SocketActionResult {
    if (!this.ensureSocketAvailable(socket)) return { ok: false, message: "当前连接已经在一个房间中，请先退出" }
    const available = Array.from(this.rooms.values()).filter(
      (room) => room.isPublic && room.status === "waiting" && Object.keys(room.players).length < MAX_ROOM_CAPACITY,
    )
    if (!available.length) return this.reject(socket, "当前没有可用的公开房间，请创建一个新房间或稍后再试。")
    return this.joinRoom(socket, { roomId: available[Math.floor(Math.random() * available.length)].id, nickname: data.nickname })
  }

  toggleReady(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data?.roomId)
    const player = room && this.getPlayer(room, socket)
    if (!room || room.status !== "waiting" || !player?.online || player.id === room.host) return
    player.isReady = !player.isReady
    this.scheduleRoomExpiry(room)
    this.emitRoom(room, "player_ready", { playerId: player.id })
  }

  removePlayer(socket: Socket, data: { roomId: string; playerId: string }) {
    const room = this.rooms.get(data?.roomId)
    const requester = room && this.getPlayer(room, socket)
    if (!room || room.status !== "waiting" || requester?.id !== room.host || data.playerId === room.host) return
    const target = room.players[data.playerId]
    if (!target) return
    const playerName = target.nickname
    this.removePlayerState(room, target)
    if (target.socketId) {
      this.io.to(target.socketId).emit("player_removed", { room: this.publicRoom(room), playerId: target.id, playerName })
      this.io.sockets.sockets.get(target.socketId)?.leave(room.id)
    }
    this.emitRoom(room, "player_removed", { playerId: target.id, playerName })
    this.scheduleRoomExpiry(room)
  }

  private removePlayerState(room: ServerRoom, player: ServerPlayerState) {
    delete room.players[player.id]
    delete room.playerAvatars[player.id]
    this.sessionToPlayer.delete(player.sessionToken)
    const timer = this.disconnectTimers.get(player.id)
    if (timer) clearTimeout(timer)
    this.disconnectTimers.delete(player.id)
    if (player.socketId) {
      this.socketToRoom.delete(player.socketId)
      this.socketToPlayer.delete(player.socketId)
      this.io.sockets.sockets.get(player.socketId)?.leave(room.id)
    }
  }

  startGame(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data?.roomId)
    const requester = room && this.getPlayer(room, socket)
    if (!room) return this.reject(socket, "房间不存在")
    if (room.status !== "waiting") return this.reject(socket, "游戏已经开始")
    if (requester?.id !== room.host) return this.reject(socket, "只有房主可以开始游戏")
    const players = Object.values(room.players)
    if (players.length < 2) return this.reject(socket, "需要至少两名玩家才能开始游戏")
    if (!players.every((player) => player.online)) return this.reject(socket, "等待所有玩家重新连线")
    if (!players.every((player) => player.id === room.host || player.isReady)) return this.reject(socket, "等待所有玩家准备就绪")

    room.status = "playing"
    this.scheduleRoomExpiry(room)
    for (const player of players) this.updateParticipantInfo(room, player.id)
    this.startMatchTimer(room)
    this.startRoundTimer(room)
    this.emitRoom(room, "game_started")
    this.broadcastRoomStats()
  }

  private startMatchTimer(room: ServerRoom) {
    const oldTimer = this.matchTimers.get(room.id)
    if (oldTimer) clearTimeout(oldTimer)
    if (room.settings.timeLimit > 0) {
      room.matchDeadline = null
      this.matchTimers.delete(room.id)
      return
    }
    room.matchDeadline = Date.now() + UNLIMITED_MATCH_TTL_MS
    this.matchTimers.set(room.id, setTimeout(() => this.finishExpiredMatch(room), UNLIMITED_MATCH_TTL_MS))
  }

  private finishExpiredMatch(room: ServerRoom) {
    if (room.status !== "playing") return
    const players = Object.values(room.players)
    for (const player of players) {
      player.currentRound.gameOver = true
      player.currentRound.won = false
      this.updateParticipantInfo(room, player.id)
    }
    const standings = players
      .map((player) => [player.id, room.roundsWon[player.id] || 0] as const)
      .sort((a, b) => b[1] - a[1])
    room.winner = standings.length === 1 || standings[0]?.[1] > standings[1]?.[1] ? standings[0]?.[0] : undefined
    room.status = "finished"
    room.roundSettled = true
    room.nextRoundDeadline = null
    const roundTimer = this.roundTimers.get(room.id)
    if (roundTimer) clearTimeout(roundTimer)
    const nextRoundTimer = this.nextRoundTimers.get(room.id)
    if (nextRoundTimer) clearTimeout(nextRoundTimer)
    this.roundTimers.delete(room.id)
    this.nextRoundTimers.delete(room.id)
    this.matchTimers.delete(room.id)
    this.scheduleRoomExpiry(room)
    this.emitRoom(room, "round_ended", {
      roundWinner: null,
      matchWinner: room.winner,
      message: "无限时房间已达到 10 分钟上限，比赛自动结算",
    })
  }

  private startRoundTimer(room: ServerRoom) {
    const oldTimer = this.roundTimers.get(room.id)
    if (oldTimer) clearTimeout(oldTimer)
    if (room.settings.timeLimit <= 0) {
      room.roundDeadline = null
      this.roundTimers.delete(room.id)
      return
    }
    room.roundDeadline = Date.now() + room.settings.timeLimit * 1000
    const timer = setTimeout(() => {
      if (room.status !== "playing" || room.roundSettled) return
      for (const player of Object.values(room.players)) {
        if (!player.currentRound.gameOver) {
          player.currentRound.gameOver = true
          player.currentRound.won = false
          player.currentRound.remainingTime = 0
        }
      }
      this.checkRoundEnd(room)
      this.emitRoom(room, "game_updated")
    }, room.settings.timeLimit * 1000)
    this.roundTimers.set(room.id, timer)
  }

  makeGuess(socket: Socket, data: { roomId: string; songId: number }): SocketActionResult {
    const room = this.rooms.get(data?.roomId)
    const player = room && this.getPlayer(room, socket)
    if (!room || room.status !== "playing" || room.roundSettled || !player || player.currentRound.gameOver) {
      return { ok: false, message: "当前回合已结束" }
    }
    if (room.roundDeadline !== null && Date.now() >= room.roundDeadline) return { ok: false, message: "本轮时间已结束" }
    const song = room.filteredSongs.find((candidate) => candidate.id === data.songId)
    if (!song) return { ok: false, message: "无效的猜测歌曲，请从候选列表中选择" }
    if (player.currentRound.guesses.some((guess) => guess.song.id === song.id)) return { ok: false, message: "你已经猜过这首歌了！" }

    const guess = processGuess(song, room.targetSong)
    player.currentRound.guesses.push(guess)
    if (guess.result.correct) {
      player.currentRound.gameOver = true
      player.currentRound.won = true
      for (const other of Object.values(room.players)) {
        if (other.id !== player.id) {
          other.currentRound.gameOver = true
          other.currentRound.won = false
        }
      }
      this.checkRoundEnd(room)
    } else if (player.currentRound.guesses.length >= room.settings.maxGuesses) {
      player.currentRound.gameOver = true
      this.checkRoundEnd(room)
    }
    this.emitRoom(room, "game_updated")
    return { ok: true }
  }

  giveUp(socket: Socket, data: { roomId: string }): SocketActionResult {
    const room = this.rooms.get(data?.roomId)
    const player = room && this.getPlayer(room, socket)
    if (!room || room.status !== "playing" || room.roundSettled || !player || player.currentRound.gameOver) {
      return { ok: false, message: "当前回合已结束" }
    }
    player.currentRound.gameOver = true
    player.currentRound.won = false
    this.checkRoundEnd(room)
    this.emitRoom(room, "game_updated")
    return { ok: true }
  }

  private checkRoundEnd(room: ServerRoom) {
    if (room.roundSettled) return
    const players = Object.values(room.players)
    if (!players.length || !players.every((player) => player.currentRound.gameOver)) return
    room.roundSettled = true
    const timer = this.roundTimers.get(room.id)
    if (timer) clearTimeout(timer)
    this.roundTimers.delete(room.id)

    const roundWinner = players.find((player) => player.currentRound.won)?.id ?? null
    if (roundWinner) {
      room.roundsWon[roundWinner] = (room.roundsWon[roundWinner] || 0) + 1
      room.players[roundWinner].score = room.roundsWon[roundWinner]
      this.updateParticipantInfo(room, roundWinner)
    }
    const winsNeeded = Math.floor(room.bestOf / 2) + 1
    let matchWinner = Object.entries(room.roundsWon).find(([, wins]) => wins >= winsNeeded)?.[0]
    if (!matchWinner && room.currentRound >= room.maxRounds) {
      const standings = players
        .map((player) => [player.id, room.roundsWon[player.id] || 0] as const)
        .sort((a, b) => b[1] - a[1])
      if (standings.length === 1 || standings[0][1] > standings[1][1]) matchWinner = standings[0][0]
    }
    if (matchWinner || room.currentRound >= room.maxRounds) {
      room.status = "finished"
      room.winner = matchWinner
      room.nextRoundDeadline = null
      const matchTimer = this.matchTimers.get(room.id)
      if (matchTimer) clearTimeout(matchTimer)
      this.matchTimers.delete(room.id)
      for (const player of players) this.updateParticipantInfo(room, player.id)
      this.scheduleRoomExpiry(room)
    } else {
      room.nextRoundDeadline = Date.now() + NEXT_ROUND_DELAY_MS
      const oldNextRoundTimer = this.nextRoundTimers.get(room.id)
      if (oldNextRoundTimer) clearTimeout(oldNextRoundTimer)
      this.nextRoundTimers.set(room.id, setTimeout(() => this.beginNextRound(room), NEXT_ROUND_DELAY_MS))
    }
    for (const player of players) player.readyForNextRound = false
    this.emitRoom(room, "round_ended", { roundWinner, matchWinner: room.winner })
  }

  readyNextRound(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data?.roomId)
    const player = room && this.getPlayer(room, socket)
    if (!room || room.status !== "playing" || !room.roundSettled || !player) return
    player.readyForNextRound = true
    if (Object.values(room.players).every((candidate) => candidate.readyForNextRound)) this.beginNextRound(room)
    else this.emitRoom(room, "player_ready", { playerId: player.id })
  }

  private beginNextRound(room: ServerRoom) {
    if (room.status !== "playing" || room.currentRound >= room.maxRounds) return
    const nextRoundTimer = this.nextRoundTimers.get(room.id)
    if (nextRoundTimer) clearTimeout(nextRoundTimer)
    this.nextRoundTimers.delete(room.id)
    room.currentRound++
    room.roundSettled = false
    room.nextRoundDeadline = null
    room.targetSong = getRandomSong(room.filteredSongs)
    for (const player of Object.values(room.players)) {
      player.currentRound = { guesses: [], gameOver: false, won: false, remainingTime: room.settings.timeLimit }
      player.readyForNextRound = false
    }
    this.startRoundTimer(room)
    this.emitRoom(room, "next_round_started")
  }

  leaveRoom(socket: Socket, data: { roomId: string }) {
    const mappedRoom = this.socketToRoom.get(socket.id)
    if (!mappedRoom || mappedRoom !== data?.roomId) return
    const playerId = this.socketToPlayer.get(socket.id)
    if (playerId) this.handlePlayerLeave(playerId, mappedRoom)
  }

  handleDisconnect(socket: Socket) {
    const roomId = this.socketToRoom.get(socket.id)
    const playerId = this.socketToPlayer.get(socket.id)
    const room = roomId ? this.rooms.get(roomId) : undefined
    const player = playerId && room?.players[playerId]
    this.socketToRoom.delete(socket.id)
    this.socketToPlayer.delete(socket.id)
    if (!room || !player || player.socketId !== socket.id) return
    player.online = false
    player.socketId = null
    player.isReady = false
    player.readyForNextRound = false
    const existing = this.disconnectTimers.get(player.id)
    if (existing) clearTimeout(existing)
    this.disconnectTimers.set(player.id, setTimeout(() => {
      this.disconnectTimers.delete(player.id)
      this.handlePlayerLeave(player.id, room.id)
    }, RECONNECT_GRACE_MS))
    this.emitRoom(room, "player_disconnected", { playerId: player.id })
  }

  private handlePlayerLeave(playerId: string, roomId: string) {
    const room = this.rooms.get(roomId)
    const player = room?.players[playerId]
    if (!room || !player) return
    if (room.status !== "waiting") this.updateParticipantInfo(room, playerId)
    const playerName = player.nickname
    const wasPlaying = room.status === "playing"
    this.removePlayerState(room, player)
    const remainingIds = Object.keys(room.players)
    if (!remainingIds.length) return this.deleteRoom(roomId)

    if (playerId === room.host) {
      room.host = remainingIds[0]
      this.emitRoom(room, "host_changed")
    }
    if (wasPlaying && remainingIds.length === 1) {
      const winnerId = remainingIds[0]
      const winsNeeded = Math.floor(room.bestOf / 2) + 1
      room.roundsWon[winnerId] = Math.max(room.roundsWon[winnerId] || 0, winsNeeded)
      room.players[winnerId].score = room.roundsWon[winnerId]
      room.status = "finished"
      room.roundSettled = true
      room.winner = winnerId
      room.nextRoundDeadline = null
      this.updateParticipantInfo(room, winnerId)
      const roundTimer = this.roundTimers.get(room.id)
      if (roundTimer) clearTimeout(roundTimer)
      this.roundTimers.delete(room.id)
      const nextRoundTimer = this.nextRoundTimers.get(room.id)
      if (nextRoundTimer) clearTimeout(nextRoundTimer)
      this.nextRoundTimers.delete(room.id)
      const matchTimer = this.matchTimers.get(room.id)
      if (matchTimer) clearTimeout(matchTimer)
      this.matchTimers.delete(room.id)
      this.scheduleRoomExpiry(room)
      this.emitRoom(room, "round_ended", {
        roundWinner: winnerId,
        matchWinner: winnerId,
        forfeit: true,
        message: `其他玩家已离开，${room.players[winnerId].nickname} 获得了胜利！`,
      })
    } else {
      this.emitRoom(room, "player_left", { playerId, playerName })
      if (wasPlaying) {
        this.checkRoundEnd(room)
        if (room.roundSettled && room.status === "playing" && Object.values(room.players).every((p) => p.readyForNextRound)) this.beginNextRound(room)
      } else {
        this.scheduleRoomExpiry(room)
      }
    }
    this.broadcastRoomStats()
  }
}
