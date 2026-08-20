import { Server as SocketIOServer, Socket } from "socket.io"
import type {
  BestOf,
  GameSettings,
  MultiplayerRoom,
  PlayerState,
  Song,
} from "../../shared/types"
import {
  filterSongs,
  getRandomSong,
  processGuess,
} from "../../shared/domain/game"

const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
const MAX_ROOM_CAPACITY = 6
const MAX_SERVER_ROOMS = 200
const RECONNECT_GRACE_MS = 30000

export class RoomManager {
  private rooms: Map<string, MultiplayerRoom> = new Map()
  private socketToRoom: Map<string, string> = new Map()
  private sessionToPlayer: Map<string, { roomId: string; playerId: string }> = new Map()
  private disconnectTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(private io: SocketIOServer, private getCatalogSongs: () => Song[]) {}

  private generateRoomCode(): string {
    for (let attempt = 0; attempt < 100; attempt++) {
      let code = ""
      for (let i = 0; i < 6; i++) {
        code += ROOM_CODE_CHARS.charAt(Math.floor(Math.random() * ROOM_CODE_CHARS.length))
      }
      if (!this.rooms.has(code)) {
        return code
      }
    }
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  getRoomStats() {
    let publicCount = 0
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.status === "waiting" && Object.keys(room.players).length < MAX_ROOM_CAPACITY) {
        publicCount++
      }
    }
    return {
      count: this.rooms.size,
      publicCount,
    }
  }

  broadcastRoomStats() {
    this.io.emit("room_count_update", this.getRoomStats())
  }

  private updateParticipantInfo(room: MultiplayerRoom, playerId: string) {
    const player = room.players[playerId]
    if (!player) return
    room.allParticipants[playerId] = {
      id: player.id,
      nickname: player.nickname,
      score: player.score,
      avatarId: room.playerAvatars[playerId] || 1,
    }
  }

  createRoom(
    socket: Socket,
    data: {
      nickname: string
      settings: GameSettings
      bestOf: BestOf
      isPublic?: boolean
    },
  ) {
    if (this.rooms.size >= MAX_SERVER_ROOMS) {
      socket.emit("room_error", { message: "服务器房间已满，请稍后再试。" })
      return
    }

    const nickname = data.nickname?.trim() || "玩家"
    const catalog = this.getCatalogSongs()
    const filtered = filterSongs(catalog, data.settings)

    if (filtered.length === 0) {
      socket.emit("room_error", { message: "当前设置下没有可用的歌曲，请调整设置。" })
      return
    }

    const roomId = this.generateRoomCode()
    const targetSong = getRandomSong(filtered)
    const avatarId = Math.floor(Math.random() * 6) + 1
    const sessionToken = this.generateSessionToken()

    const player: PlayerState = {
      id: socket.id,
      sessionToken,
      nickname,
      score: 0,
      online: true,
      currentRound: {
        guesses: [],
        gameOver: false,
        won: false,
        remainingTime: data.settings.timeLimit,
      },
      isReady: false,
      readyForNextRound: false,
    }

    const room: MultiplayerRoom = {
      id: roomId,
      host: socket.id,
      players: { [socket.id]: player },
      settings: data.settings,
      bestOf: data.bestOf || 3,
      currentRound: 1,
      maxRounds: data.bestOf || 3,
      roundsWon: {},
      targetSong,
      filteredSongs: filtered,
      status: "waiting",
      isPublic: data.isPublic || false,
      playerAvatars: { [socket.id]: avatarId },
      allParticipants: {},
    }

    this.rooms.set(roomId, room)
    this.socketToRoom.set(socket.id, roomId)
    this.sessionToPlayer.set(sessionToken, { roomId, playerId: socket.id })

    socket.join(roomId)
    socket.emit("room_created", { roomId, room, sessionToken })
    this.broadcastRoomStats()
  }

  joinRoom(socket: Socket, data: { roomId: string; nickname: string }) {
    const roomId = data.roomId?.trim().toUpperCase()
    const room = this.rooms.get(roomId)

    if (!room) {
      socket.emit("room_error", { message: "房间不存在" })
      return
    }

    if (room.status !== "waiting") {
      socket.emit("room_error", { message: "游戏已经开始，无法加入" })
      return
    }

    const currentPlayers = Object.keys(room.players)
    if (currentPlayers.length >= MAX_ROOM_CAPACITY) {
      socket.emit("room_error", { message: "房间已满" })
      return
    }

    // 分配未使用的头像
    const usedAvatars = Object.values(room.playerAvatars)
    let avatarId = 1
    while (usedAvatars.includes(avatarId) && avatarId <= 6) {
      avatarId++
    }
    if (avatarId > 6) avatarId = 1

    const sessionToken = this.generateSessionToken()
    const nickname = data.nickname?.trim() || `玩家${currentPlayers.length + 1}`

    const player: PlayerState = {
      id: socket.id,
      sessionToken,
      nickname,
      score: 0,
      online: true,
      currentRound: {
        guesses: [],
        gameOver: false,
        won: false,
        remainingTime: room.settings.timeLimit,
      },
      isReady: false,
      readyForNextRound: false,
    }

    room.players[socket.id] = player
    room.playerAvatars[socket.id] = avatarId
    this.socketToRoom.set(socket.id, roomId)
    this.sessionToPlayer.set(sessionToken, { roomId, playerId: socket.id })

    socket.join(roomId)
    socket.emit("room_joined", { room, sessionToken })
    this.io.to(roomId).emit("player_joined", { room, playerId: socket.id })
    this.broadcastRoomStats()
  }

  joinRandomRoom(socket: Socket, data: { nickname: string }) {
    const available = Array.from(this.rooms.values()).filter(
      (r) => r.isPublic && r.status === "waiting" && Object.keys(r.players).length < MAX_ROOM_CAPACITY,
    )

    if (available.length === 0) {
      socket.emit("room_error", { message: "当前没有可用的公开房间，请创建一个新房间或稍后再试。" })
      return
    }

    const chosen = available[Math.floor(Math.random() * available.length)]
    this.joinRoom(socket, { roomId: chosen.id, nickname: data.nickname })
  }

  toggleReady(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)
    if (!room || room.status !== "waiting") return

    const player = room.players[socket.id]
    if (!player || socket.id === room.host) return

    player.isReady = !player.isReady
    this.io.to(room.id).emit("player_ready", { room, playerId: socket.id })
  }

  removePlayer(socket: Socket, data: { roomId: string; playerId: string }) {
    const room = this.rooms.get(data.roomId)
    if (!room || socket.id !== room.host) return

    const targetPlayer = room.players[data.playerId]
    if (!targetPlayer) return

    const playerName = targetPlayer.nickname
    delete room.players[data.playerId]
    delete room.playerAvatars[data.playerId]
    this.socketToRoom.delete(data.playerId)

    this.io.to(data.playerId).emit("player_removed", { room, playerId: data.playerId, playerName })
    this.io.to(room.id).emit("player_removed", { room, playerId: data.playerId, playerName })

    const targetSocket = this.io.sockets.sockets.get(data.playerId)
    if (targetSocket) {
      targetSocket.leave(room.id)
    }
  }

  startGame(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)
    if (!room) {
      socket.emit("room_error", { message: "房间不存在" })
      return
    }

    if (socket.id !== room.host) {
      socket.emit("room_error", { message: "只有房主可以开始游戏" })
      return
    }

    const playerList = Object.values(room.players)
    if (playerList.length < 2) {
      socket.emit("room_error", { message: "需要至少两名玩家才能开始游戏" })
      return
    }

    const allReady = playerList.every((p) => p.id === room.host || p.isReady)
    if (!allReady) {
      socket.emit("room_error", { message: "等待所有玩家准备就绪" })
      return
    }

    room.status = "playing"
    for (const p of playerList) {
      this.updateParticipantInfo(room, p.id)
    }

    this.io.to(room.id).emit("game_started", { room })
    this.broadcastRoomStats()
  }

  makeGuess(socket: Socket, data: { roomId: string; songId: number }) {
    const room = this.rooms.get(data.roomId)
    if (!room || room.status !== "playing" || !room.targetSong) return

    const player = room.players[socket.id]
    if (!player || player.currentRound.gameOver) return

    // 从服务端权威数据源查找歌曲，防止客户端伪造猜测
    const song = room.filteredSongs.find((s) => s.id === data.songId)
    if (!song) {
      socket.emit("guess_error", { message: "无效的猜测歌曲，请从候选列表中选择" })
      return
    }

    if (player.currentRound.guesses.some((g) => g.song.id === song.id)) {
      socket.emit("guess_error", { message: "你已经猜过这首歌了！" })
      return
    }

    const guess = processGuess(song, room.targetSong)
    const isCorrect = guess.result.correct

    player.currentRound.guesses.push(guess)

    if (isCorrect) {
      player.currentRound.gameOver = true
      player.currentRound.won = true

      for (const p of Object.values(room.players)) {
        if (p.id !== player.id) {
          p.currentRound.gameOver = true
          p.currentRound.won = false
        }
      }
      this.checkRoundEnd(room)
    } else if (player.currentRound.guesses.length >= room.settings.maxGuesses) {
      player.currentRound.gameOver = true
      player.currentRound.won = false
      this.checkRoundEnd(room)
    }

    this.io.to(room.id).emit("game_updated", { room })
  }

  giveUp(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)
    if (!room || room.status !== "playing") return

    const player = room.players[socket.id]
    if (!player || player.currentRound.gameOver) return

    player.currentRound.gameOver = true
    player.currentRound.won = false
    this.checkRoundEnd(room)

    this.io.to(room.id).emit("game_updated", { room })
  }

  private checkRoundEnd(room: MultiplayerRoom) {
    const players = Object.values(room.players)
    const allFinished = players.every((p) => p.currentRound.gameOver)

    if (allFinished) {
      let roundWinner: string | null = null
      const winners = players.filter((p) => p.currentRound.won)
      if (winners.length > 0) {
        roundWinner = winners[0].id
        room.roundsWon[roundWinner] = (room.roundsWon[roundWinner] || 0) + 1
        room.players[roundWinner].score += 1
        this.updateParticipantInfo(room, roundWinner)
      }

      const winsNeeded = Math.floor(room.bestOf / 2) + 1
      let matchWinner: string | null = null
      for (const [pId, wins] of Object.entries(room.roundsWon)) {
        if (wins >= winsNeeded) {
          matchWinner = pId
          break
        }
      }

      if (matchWinner) {
        room.status = "finished"
        room.winner = matchWinner
        for (const p of players) {
          this.updateParticipantInfo(room, p.id)
        }
      }

      for (const p of players) {
        p.readyForNextRound = false
      }

      this.io.to(room.id).emit("round_ended", {
        room,
        roundWinner,
        matchWinner: room.winner,
      })
    }
  }

  readyNextRound(socket: Socket, data: { roomId: string }) {
    const room = this.rooms.get(data.roomId)
    if (!room || room.status !== "playing") return

    const player = room.players[socket.id]
    if (!player) return

    player.readyForNextRound = true
    const allReady = Object.values(room.players).every((p) => p.readyForNextRound)

    if (allReady) {
      room.currentRound += 1
      room.targetSong = getRandomSong(room.filteredSongs)
      for (const p of Object.values(room.players)) {
        p.currentRound = {
          guesses: [],
          gameOver: false,
          won: false,
          remainingTime: room.settings.timeLimit,
        }
        p.readyForNextRound = false
      }
      this.io.to(room.id).emit("next_round_started", { room })
    } else {
      this.io.to(room.id).emit("player_ready", { room })
    }
  }

  leaveRoom(socket: Socket, data: { roomId: string }) {
    this.handlePlayerLeave(socket.id, data.roomId)
  }

  handleDisconnect(socket: Socket) {
    const roomId = this.socketToRoom.get(socket.id)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    const player = room.players[socket.id]
    if (!player) return

    player.online = false

    // 启动 30 秒断线重连计时器
    const timer = setTimeout(() => {
      this.handlePlayerLeave(socket.id, roomId)
      this.disconnectTimers.delete(socket.id)
    }, RECONNECT_GRACE_MS)

    this.disconnectTimers.set(socket.id, timer)
    this.io.to(roomId).emit("player_disconnected", { room, playerId: socket.id })
  }

  private handlePlayerLeave(socketId: string, roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room) return

    const leavingPlayer = room.players[socketId]
    if (!leavingPlayer) return

    if (room.status === "playing" || room.status === "finished") {
      this.updateParticipantInfo(room, socketId)
    }

    const playerName = leavingPlayer.nickname
    const wasPlaying = room.status === "playing"

    // 清理所有关联映射
    delete room.players[socketId]
    this.socketToRoom.delete(socketId)
    // 清理 sessionToken 映射，防止内存泄漏
    if (leavingPlayer.sessionToken) {
      this.sessionToPlayer.delete(leavingPlayer.sessionToken)
    }

    const remainingPlayerIds = Object.keys(room.players)

    if (remainingPlayerIds.length === 0) {
      this.rooms.delete(roomId)
      this.broadcastRoomStats()
      return
    }

    if (wasPlaying && room.status !== "finished") {
      if (remainingPlayerIds.length === 1) {
        const winnerId = remainingPlayerIds[0]
        room.status = "finished"
        room.winner = winnerId
        room.players[winnerId].score = Math.floor(room.bestOf / 2) + 1
        this.updateParticipantInfo(room, winnerId)

        this.io.to(roomId).emit("round_ended", {
          room,
          roundWinner: winnerId,
          matchWinner: winnerId,
          forfeit: true,
          message: `其他玩家已离开，${room.players[winnerId].nickname} 获得了胜利！`,
        })
      } else {
        this.io.to(roomId).emit("player_left", { room, playerId: socketId, playerName })
        this.checkRoundEnd(room)
      }
    } else {
      this.io.to(roomId).emit("player_left", { room, playerId: socketId, playerName })
    }

    if (socketId === room.host && remainingPlayerIds.length > 0) {
      room.host = remainingPlayerIds[0]
      this.io.to(roomId).emit("host_changed", { room })
    }

    this.broadcastRoomStats()
  }
}
