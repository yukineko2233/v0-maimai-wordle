import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import { getRandomSong } from "../lib/game-logic"
import type { GameSettings, Song, Guess, MultiplayerRoom } from "../types/game"

const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
})

// Store rooms data
const rooms: Record<string, MultiplayerRoom> = {}

// Helper function to filter songs based on settings
function filterSongs(songs: Song[], settings: GameSettings): Song[] {
    return songs.filter((song) => {
        // Filter by version
        const versionValue = getVersionValue(song.version)
        const minVersionValue = getVersionValue(settings.versionRange.min)
        const maxVersionValue = getVersionValue(settings.versionRange.max)

        if (versionValue < minVersionValue || versionValue > maxVersionValue) {
            return false
        }

        // Filter by genre
        if (settings.genres.length > 0 && !settings.genres.includes(song.genre)) {
            return false
        }

        // Safely handle level_master that might be undefined
        if (!song.level_master) {
            return false
        }

        // Filter by master level
        try {
            const masterLevel = Number.parseFloat(song.level_master.replace("+", ".7"))
            const minMasterLevel = Number.parseFloat(settings.masterLevelRange.min.replace("+", ".7"))
            const maxMasterLevel = Number.parseFloat(settings.masterLevelRange.max.replace("+", ".7"))

            if (masterLevel < minMasterLevel || masterLevel > maxMasterLevel) {
                return false
            }
        } catch (error) {
            console.error("Error parsing master level:", error, song)
            return false
        }

        return true
    })
}

// Helper function to get version value
function getVersionValue(version: string): number {
    const versionMap: Record<string, number> = {
        "maimai": 1,
        "maimai PLUS": 2,
        "maimai GreeN": 3,
        "maimai GreeN PLUS": 4,
        "maimai ORANGE": 5,
        "maimai ORANGE PLUS": 6,
        "maimai PiNK": 7,
        "maimai PiNK PLUS": 8,
        "maimai MURASAKi": 9,
        "maimai MURASAKi PLUS": 10,
        "maimai MiLK": 11,
        "maimai MiLK PLUS": 12,
        "maimai FiNALE": 13,
        "舞萌DX": 14,
        "舞萌DX 2021": 15,
        "舞萌DX 2022": 16,
        "舞萌DX 2023": 17,
        "舞萌DX 2024": 18,
    }

    return versionMap[version] || 0
}

// Helper function to generate a room ID
function generateRoomId(): string {
    // Generate a 6-character alphanumeric room ID
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let result = ""
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    // Make sure it's unique
    if (rooms[result]) {
        return generateRoomId()
    }

    return result
}

// Process a guess and return the result
function processGuess(song: Song, targetSong: Song): Guess {
    // Compare BPM values
    const compareBPM = (
        guessBPM: string,
        targetBPM: string,
    ): {
        value: boolean
        direction: "higher" | "lower" | "equal"
        close: boolean
    } => {
        if (!guessBPM || !targetBPM) {
            return { value: false, direction: "equal", close: false }
        }

        try {
            const guessValue = Number.parseInt(guessBPM, 10)
            const targetValue = Number.parseInt(targetBPM, 10)

            return {
                value: guessValue === targetValue,
                direction: guessValue > targetValue ? "higher" : guessValue < targetValue ? "lower" : "equal",
                close: Math.abs(guessValue - targetValue) <= 20, // BPM within 20 is considered close
            }
        } catch (error) {
            console.error("Error comparing BPM values:", error, { guessBPM, targetBPM })
            return { value: false, direction: "equal", close: false }
        }
    }

    const versionResult = compareVersions(song.version, targetSong.version)

    return {
        song,
        result: {
            title: song.title === targetSong.title,
            type: song.type === targetSong.type,
            artist: song.artist === targetSong.artist,
            bpm: compareBPM(song.bpm, targetSong.bpm),
            genre: song.genre === targetSong.genre,
            masterLevel: {
                value: song.level_master === targetSong.level_master,
                direction: compareValues(song.level_master, targetSong.level_master),
                close: isClose(song.level_master, targetSong.level_master),
            },
            masterDesigner: song.charts.master.designer === targetSong.charts.master.designer,
            remasterLevel: {
                value: song.level_remaster === targetSong.level_remaster,
                direction: compareValues(song.level_remaster, targetSong.level_remaster),
                close: isClose(song.level_remaster, targetSong.level_remaster),
            },
            remasterDesigner: song.charts.remaster?.designer === targetSong.charts.remaster?.designer,
            version: {
                value: song.version === targetSong.version,
                direction: versionResult.direction,
                close: versionResult.close,
            },
        },
    }
}

// Helper function to compare values
function compareValues(guess: string, target: string): "higher" | "lower" | "equal" {
    if (!guess || !target) {
        return "equal"
    }

    try {
        const guessValue = Number.parseFloat(guess.replace("+", ".7"))
        const targetValue = Number.parseFloat(target.replace("+", ".7"))

        if (guessValue > targetValue) return "higher"
        if (guessValue < targetValue) return "lower"
        return "equal"
    } catch (error) {
        console.error("Error comparing values:", error, { guess, target })
        return "equal"
    }
}

// Helper function to check if values are close
function isClose(guess: string, target: string): boolean {
    if (!guess || !target) {
        return false
    }

    try {
        const guessValue = Number.parseFloat(guess.replace("+", ".7"))
        const targetValue = Number.parseFloat(target.replace("+", ".7"))

        return Math.abs(guessValue - targetValue) <= 0.7
    } catch (error) {
        console.error("Error checking if values are close:", error, { guess, target })
        return false
    }
}

// Helper function to compare versions
function compareVersions(guess: string, target: string): { direction: "newer" | "older" | "equal"; close: boolean } {
    const guessValue = getVersionValue(guess)
    const targetValue = getVersionValue(target)

    const isClose = Math.abs(guessValue - targetValue) === 1

    if (guessValue > targetValue) return { direction: "newer", close: isClose }
    if (guessValue < targetValue) return { direction: "older", close: isClose }
    return { direction: "equal", close: false }
}

// Helper function to check if a guess is correct
function isGuessCorrect(guess: Guess): boolean {
    if (!guess || !guess.result) {
        return false
    }

    // Check if target song has Re:Master level
    const hasRemaster = !!guess.song.level_remaster && guess.song.level_remaster !== ""

    return (
        guess.result.title &&
        guess.result.type &&
        guess.result.artist &&
        guess.result.bpm.value &&
        guess.result.genre &&
        guess.result.masterLevel.value &&
        guess.result.masterDesigner &&
        // If the target song has a remaster level, check if it matches
        (hasRemaster ? guess.result.remasterLevel.value && guess.result.remasterDesigner : true) &&
        guess.result.version.value
    )
}

// 更新玩家在allParticipants中的信息
function updateParticipantInfo(room: MultiplayerRoom, playerId: string) {
    if (!room.players[playerId]) return

    const player = room.players[playerId]
    room.allParticipants[playerId] = {
        id: player.id,
        nickname: player.nickname,
        score: player.score,
        avatarId: room.playerAvatars[playerId] || 1,
    }
}

// Fix the checkRoundEnd function to properly handle scoring
function checkRoundEnd(room: MultiplayerRoom) {
    const players = Object.values(room.players)
    const allFinished = players.every((player) => player.currentRound.gameOver)

    if (allFinished) {
        // 确定回合胜利者 - 猜对的玩家获胜
        let roundWinner: string | null = null

        // 找到猜对的玩家
        const winners = players.filter((player) => player.currentRound.won)

        if (winners.length > 0) {
            // 猜对的玩家是胜利者
            roundWinner = winners[0].id
        }

        // 更新分数
        if (roundWinner) {
            room.roundsWon[roundWinner] = (room.roundsWon[roundWinner] || 0) + 1
            room.players[roundWinner].score += 1

            // 更新allParticipants中的信息
            updateParticipantInfo(room, roundWinner)
        }

        // 检查比赛是否结束
        let matchWinner = null
        for (const [playerId, wins] of Object.entries(room.roundsWon)) {
            if (wins >= Math.ceil(room.maxRounds / 2)) {
                matchWinner = playerId
                break
            }
        }

        if (matchWinner) {
            room.status = "finished"
            room.winner = matchWinner

            // 确保所有玩家的最终分数都被记录
            Object.keys(room.players).forEach((playerId) => {
                updateParticipantInfo(room, playerId)
            })
        }

        // 重置所有玩家的准备状态
        Object.values(room.players).forEach((player) => {
            player.readyForNextRound = false
        })

        io.to(room.id).emit("round_ended", {
            room,
            roundWinner,
            matchWinner: room.winner,
        })
    }
}

// Fix the startNextRound function to ensure proper round initialization
function startNextRound(room: MultiplayerRoom) {
    room.currentRound += 1

    // Get a new target song
    room.targetSong = getRandomSong(room.filteredSongs)

    // Reset player states for the new round
    Object.values(room.players).forEach((player) => {
        player.currentRound = {
            guesses: [],
            gameOver: false,
            won: false,
            remainingTime: room.settings.timeLimit,
        }
        player.readyForNextRound = false
    })
}

// 修改 leaveRoom 函数，确保 remainingPlayers 变量在使用前被声明
function leaveRoom(socket: any, roomId: string) {
    const room = rooms[roomId]

    if (!room) {
        return
    }

    // 保存玩家信息
    const leavingPlayer = room.players[socket.id]
    if (!leavingPlayer) return

    // 如果游戏正在进行或已结束，确保将离开的玩家信息保存到allParticipants
    if (room.status === "playing" || room.status === "finished") {
        updateParticipantInfo(room, socket.id)
    }

    const playerName = leavingPlayer.nickname
    const isInProgress = room.status === "playing"

    // 从房间中移除玩家
    delete room.players[socket.id]
    socket.leave(roomId)

    // 获取剩余玩家列表
    const remainingPlayers = Object.keys(room.players)

    // 如果游戏正在进行，检查是否只剩一名玩家
    if (isInProgress && room.status !== "finished") {
        if (remainingPlayers.length === 1) {
            // 只剩一名玩家，结束游戏并宣布该玩家为胜利者
            const remainingPlayerId = remainingPlayers[0]

            // 设置剩余玩家为胜利者
            room.status = "finished"
            room.winner = remainingPlayerId

            // 更新剩余玩家的分数
            room.roundsWon[remainingPlayerId] = Math.ceil(room.maxRounds / 2) // 足够获胜的分数
            room.players[remainingPlayerId].score = Math.ceil(room.maxRounds / 2)

            // 更新allParticipants中的信息
            updateParticipantInfo(room, remainingPlayerId)

            // 通知剩余玩家
            io.to(roomId).emit("round_ended", {
                room,
                roundWinner: remainingPlayerId,
                matchWinner: remainingPlayerId,
                forfeit: true,
                message: `所有其他玩家已离开游戏，${room.players[remainingPlayerId].nickname} 获得了胜利！`,
            })
        } else if (remainingPlayers.length > 1) {
            // 仍有多名玩家，游戏继续
            io.to(roomId).emit("player_left", {
                room,
                playerId: socket.id,
                playerName,
            })
        }
    } else if (remainingPlayers.length > 0) {
        // 游戏未开始或已结束，但房间不为空
        io.to(roomId).emit("player_left", {
            room,
            playerId: socket.id,
            playerName,
        })
    }

    // 检查房间是否为空
    if (remainingPlayers.length === 0) {
        delete rooms[roomId]
        // 广播更新房间数量
        broadcastRoomCount()
        return
    }

    // 如果房主离开，分配新房主
    if (socket.id === room.host) {
        room.host = remainingPlayers[0]
        io.to(roomId).emit("host_changed", { room })
    }
}

// 获取公开房间数量
function getPublicRoomCount() {
    // 只计算状态为"waiting"的公开房间
    return Object.values(rooms).filter((room) => room.isPublic && room.status === "waiting").length
}
// Function to get active room count
function getActiveRoomCount() {
    return Object.keys(rooms).length
}

// Function to broadcast room count to all clients
function broadcastRoomCount() {
    io.emit("room_count_update", {
        count: getActiveRoomCount(),
        publicCount: getPublicRoomCount(),
    })
}

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id)
    // Send current room count to newly connected client
    socket.emit("room_count_update", { count: getActiveRoomCount() })

    // Client can request room count update
    socket.on("get_room_count", () => {
        socket.emit("room_count_update", {
            count: getActiveRoomCount(),
            publicCount: getPublicRoomCount(),
        })
    })

    // Create a new room
    socket.on("create_room", ({ nickname, settings, bestOf, songs, isPublic }) => {
        // 检查是否达到房间上限
        if (getActiveRoomCount() >= 200) {
            socket.emit("room_error", { message: "服务器房间已满，请稍后再试。" })
            return
        }

        const roomId = generateRoomId()
        const filteredSongs = filterSongs(songs, settings)

        if (filteredSongs.length === 0) {
            socket.emit("room_error", { message: "当前设置下没有可用的歌曲，请调整设置。" })
            return
        }

        const targetSong = getRandomSong(filteredSongs)

        // 为玩家分配头像ID (1-6)
        const playerAvatars = {
            [socket.id]: Math.floor(Math.random() * 6) + 1,
        }

        rooms[roomId] = {
            id: roomId,
            host: socket.id,
            players: {
                [socket.id]: {
                    id: socket.id,
                    nickname,
                    score: 0,
                    currentRound: {
                        guesses: [],
                        gameOver: false,
                        won: false,
                        remainingTime: settings.timeLimit,
                    },
                    isReady: false, // 房主不需要准备
                },
            },
            settings,
            bestOf,
            currentRound: 1,
            maxRounds: bestOf,
            roundsWon: {},
            targetSong,
            filteredSongs,
            status: "waiting", // waiting, playing, finished
            isPublic: isPublic || false, // 新增：是否为公开房间
            playerAvatars, // 新增：玩家头像映射
            allParticipants: {}, // 初始化所有参与者记录
        }

        socket.join(roomId)
        socket.emit("room_created", { roomId, room: rooms[roomId] })
        console.log(`multiplayer: Room created: ${roomId} by ${nickname}, public: ${isPublic}`)

        // 广播更新房间数量
        broadcastRoomCount()
    })

    // Join an existing room
    socket.on("join_room", ({ roomId, nickname }) => {
        const room = rooms[roomId]

        if (!room) {
            socket.emit("room_error", { message: "房间不存在" })
            return
        }

        if (room.status !== "waiting") {
            socket.emit("room_error", { message: "游戏已经开始，无法加入" })
            return
        }

        if (Object.keys(room.players).length >= 6) {
            socket.emit("room_error", { message: "房间已满" })
            return
        }

        // 分配一个未使用的头像ID
        const usedAvatarIds = Object.values(room.playerAvatars)
        let avatarId = 1
        while (usedAvatarIds.includes(avatarId) && avatarId <= 6) {
            avatarId++
        }
        if (avatarId > 6) avatarId = 1 // 如果所有头像都被使用，使用默认头像

        // 更新玩家头像映射
        room.playerAvatars[socket.id] = avatarId

        // 添加玩家到房间
        room.players[socket.id] = {
            id: socket.id,
            nickname,
            score: 0,
            currentRound: {
                guesses: [],
                gameOver: false,
                won: false,
                remainingTime: room.settings.timeLimit,
            },
            isReady: false,
        }

        socket.join(roomId)
        socket.emit("room_joined", { room })
        io.to(roomId).emit("player_joined", { room, playerId: socket.id })
        console.log(`multiplayer: Player ${nickname} joined room: ${roomId}`)

        // 添加：广播更新房间数量
        broadcastRoomCount()
    })

    // 添加随机加入公开房间的处理函数
    socket.on("join_random_room", ({ nickname }) => {
        // 查找所有公开且等待中的房间
        const availableRooms = Object.values(rooms).filter(
            (room) => room.isPublic && room.status === "waiting" && Object.keys(room.players).length < 6,
        )

        if (availableRooms.length === 0) {
            socket.emit("room_error", { message: "当前没有可用的公开房间，请创建一个新房间或稍后再试。" })
            return
        }

        // 随机选择一个房间
        const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)]

        // 分配一个未使用的头像ID
        const usedAvatarIds = Object.values(randomRoom.playerAvatars)
        let avatarId = 1
        while (usedAvatarIds.includes(avatarId) && avatarId <= 6) {
            avatarId++
        }
        if (avatarId > 6) avatarId = 1 // 如果所有头像都被使用，使用默认头像

        // 更新玩家头像映射
        randomRoom.playerAvatars[socket.id] = avatarId

        // 添加玩家到房间
        randomRoom.players[socket.id] = {
            id: socket.id,
            nickname,
            score: 0,
            currentRound: {
                guesses: [],
                gameOver: false,
                won: false,
                remainingTime: randomRoom.settings.timeLimit,
            },
            isReady: false,
        }

        socket.join(randomRoom.id)
        socket.emit("room_joined", { room: randomRoom })
        io.to(randomRoom.id).emit("player_joined", { room: randomRoom, playerId: socket.id })
        console.log(`multiplayer: Player ${nickname} randomly joined room: ${randomRoom.id}`)

        // 添加：广播更新房间数量
        broadcastRoomCount()
    })

    // 添加玩家准备状态切换的处理函数
    socket.on("toggle_ready", ({ roomId }) => {
        const room = rooms[roomId]

        if (!room || room.status !== "waiting") {
            return
        }

        const player = room.players[socket.id]
        if (!player || socket.id === room.host) {
            return
        }

        // 切换准备状态
        player.isReady = !player.isReady

        // 通知所有玩家
        io.to(roomId).emit("player_ready", { room, playerId: socket.id })
    })

    // 添加房主移除玩家的处理函数
    socket.on("remove_player", ({ roomId, playerId }) => {
        const room = rooms[roomId]

        if (!room || socket.id !== room.host) {
            return
        }

        const playerToRemove = room.players[playerId]
        if (!playerToRemove) {
            return
        }

        // 保存玩家名称以便通知
        const playerName = playerToRemove.nickname

        // 从房间中移除玩家
        delete room.players[playerId]
        delete room.playerAvatars[playerId]

        // 通知被移除的玩家
        io.to(playerId).emit("player_removed", { room, playerId, playerName })

        // 通知房间中的所有玩家（包括房主）
        io.to(roomId).emit("player_removed", { room, playerId, playerName })

        // 让被移除的玩家离开房间
        io.sockets.sockets.get(playerId)?.leave(roomId)
    })

    // Start the game
    socket.on("start_game", ({ roomId }) => {
        const room = rooms[roomId]

        if (!room) {
            socket.emit("room_error", { message: "房间不存在" })
            return
        }

        if (socket.id !== room.host) {
            socket.emit("room_error", { message: "只有房主可以开始游戏" })
            return
        }

        if (Object.keys(room.players).length < 2) {
            socket.emit("room_error", { message: "需要至少两名玩家才能开始游戏" })
            return
        }

        // 检查除房主外的所有玩家是否都已准备
        const allPlayersReady = Object.values(room.players).every((player) => player.id === room.host || player.isReady)

        if (!allPlayersReady) {
            socket.emit("room_error", { message: "等待所有玩家准备就绪" })
            return
        }

        room.status = "playing"

        // 游戏开始时，将所有玩家添加到allParticipants
        Object.keys(room.players).forEach((playerId) => {
            updateParticipantInfo(room, playerId)
        })

        io.to(roomId).emit("game_started", { room })
        console.log(`multiplayer: Game started in room: ${roomId}`)

        // 添加：广播更新房间数量，因为游戏开始后公开房间数量会减少
        broadcastRoomCount()
    })

    // Make a guess
    socket.on("make_guess", ({ roomId, song }) => {
        const room = rooms[roomId]

        if (!room || room.status !== "playing") {
            return
        }

        const player = room.players[socket.id]
        if (!player || player.currentRound.gameOver) {
            return
        }

        // Check if song was already guessed
        if (player.currentRound.guesses.some((g) => g.song.id === song.id)) {
            socket.emit("guess_error", { message: "你已经猜过这首歌了！" })
            return
        }

        // Process the guess (similar to the client-side logic)
        const guess = processGuess(song, room.targetSong)
        const correct = isGuessCorrect(guess)

        player.currentRound.guesses.push(guess)

        // If the guess is correct, immediately end the round and declare this player the winner
        if (correct) {
            player.currentRound.gameOver = true
            player.currentRound.won = true

            // End the round for all other players
            Object.values(room.players).forEach((p) => {
                if (p.id !== player.id) {
                    p.currentRound.gameOver = true
                    p.currentRound.won = false
                }
            })

            // Check round end will handle scoring and notifications
            checkRoundEnd(room)
        } else if (player.currentRound.guesses.length >= room.settings.maxGuesses) {
            // If player runs out of guesses
            player.currentRound.gameOver = true
            player.currentRound.won = false

            // Check if round is over
            checkRoundEnd(room)
        }

        // Update room state
        io.to(roomId).emit("game_updated", { room })
    })

    // Player gives up
    socket.on("give_up", ({ roomId }) => {
        const room = rooms[roomId]

        if (!room || room.status !== "playing") {
            return
        }

        const player = room.players[socket.id]
        if (!player || player.currentRound.gameOver) {
            return
        }

        player.currentRound.gameOver = true
        player.currentRound.won = false

        // Check if round is over
        checkRoundEnd(room)

        // Update room state
        io.to(roomId).emit("game_updated", { room })
    })

    // Ready for next round
    socket.on("ready_next_round", ({ roomId }) => {
        const room = rooms[roomId]

        if (!room || room.status !== "playing") {
            return
        }

        const player = room.players[socket.id]
        if (!player) {
            return
        }

        player.readyForNextRound = true

        // Check if all players are ready
        const allReady = Object.values(room.players).every((p) => p.readyForNextRound)

        if (allReady) {
            startNextRound(room)
            io.to(roomId).emit("next_round_started", { room })
        } else {
            io.to(roomId).emit("player_ready", { room })
        }
    })

    // Leave room
    socket.on("leave_room", ({ roomId }) => {
        leaveRoom(socket, roomId)
    })

    // Disconnect handling
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)

        // Find and leave all rooms the user is in
        Object.keys(rooms).forEach((roomId) => {
            if (rooms[roomId].players[socket.id]) {
                leaveRoom(socket, roomId)
            }
        })
    })
})

// Start the server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
