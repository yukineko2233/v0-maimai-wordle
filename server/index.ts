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

// Socket.IO connection handling
io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    // Create a new room
    socket.on("create_room", ({ nickname, settings, bestOf, songs }) => {
        const roomId = generateRoomId()
        const filteredSongs = filterSongs(songs, settings)

        if (filteredSongs.length === 0) {
            socket.emit("room_error", { message: "当前设置下没有可用的歌曲，请调整设置。" })
            return
        }

        const targetSong = getRandomSong(filteredSongs)

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
        }

        socket.join(roomId)
        socket.emit("room_created", { roomId, room: rooms[roomId] })
        console.log(`Room created: ${roomId} by ${nickname}`)
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

        if (Object.keys(room.players).length >= 2) {
            socket.emit("room_error", { message: "房间已满" })
            return
        }

        // Add player to room
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
        }

        socket.join(roomId)
        socket.emit("room_joined", { room })
        io.to(roomId).emit("player_joined", { room })
        console.log(`Player ${nickname} joined room: ${roomId}`)
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

        room.status = "playing"
        io.to(roomId).emit("game_started", { room })
        console.log(`Game started in room: ${roomId}`)
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

        if (correct || player.currentRound.guesses.length >= room.settings.maxGuesses) {
            player.currentRound.gameOver = true
            player.currentRound.won = correct

            // Check if round is over (both players finished)
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
        "maimai でらっくす": 14,
        "maimai でらっくす PLUS": 15,
        "maimai でらっくす Splash": 16,
        "maimai でらっくす Splash PLUS": 17,
        "maimai でらっくす UNiVERSE": 18,
        "maimai でらっくす UNiVERSE PLUS": 19,
        "maimai でらっくす FESTiVAL": 20,
        "maimai でらっくす FESTiVAL PLUS": 21,
        "maimai でらっくす BUDDiES": 22,
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

// Check if the round is over and update scores
function checkRoundEnd(room: MultiplayerRoom) {
    const players = Object.values(room.players)
    const allFinished = players.every((player) => player.currentRound.gameOver)

    if (allFinished) {
        // Determine round winner
        let roundWinner: string | null = null

        // First check if anyone won
        const winners = players.filter((player) => player.currentRound.won)

        if (winners.length === 1) {
            // One player won
            roundWinner = winners[0].id
        } else if (winners.length > 1) {
            // Both won, compare number of guesses
            winners.sort((a, b) => a.currentRound.guesses.length - b.currentRound.guesses.length)

            if (winners[0].currentRound.guesses.length < winners[1].currentRound.guesses.length) {
                roundWinner = winners[0].id
            } else if (winners[0].currentRound.guesses.length === winners[1].currentRound.guesses.length) {
                // If same number of guesses, compare time (not implemented here)
                // For now, just pick the first player
                roundWinner = winners[0].id
            }
        }

        // Update scores
        if (roundWinner) {
            room.roundsWon[roundWinner] = (room.roundsWon[roundWinner] || 0) + 1
            room.players[roundWinner].score += 1
        }

        // Check if match is over
        const matchWinner = Object.entries(room.roundsWon).find(([_, wins]) => wins >= Math.ceil(room.maxRounds / 2))

        if (matchWinner) {
            room.status = "finished"
            room.winner = matchWinner[0]
        }

        // Reset readyForNextRound for all players
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

// Start the next round
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

// Handle a player leaving a room
function leaveRoom(socket: any, roomId: string) {
    const room = rooms[roomId]

    if (!room) {
        return
    }

    // Store player info before removing them
    const leavingPlayer = room.players[socket.id]
    const isInProgress = room.status === "playing"

    // Remove player from room
    delete room.players[socket.id]
    socket.leave(roomId)

    // If the game was in progress, end it and declare the remaining player as winner
    if (isInProgress) {
        const remainingPlayers = Object.keys(room.players)

        if (remainingPlayers.length > 0) {
            // Get the remaining player's ID
            const remainingPlayerId = remainingPlayers[0]

            // Set the remaining player as the winner
            room.status = "finished"
            room.winner = remainingPlayerId

            // Update the score for the remaining player
            room.roundsWon[remainingPlayerId] = Math.ceil(room.maxRounds / 2) // Enough to win
            room.players[remainingPlayerId].score = Math.ceil(room.maxRounds / 2)

            // Notify the remaining player
            io.to(roomId).emit("round_ended", {
                room,
                roundWinner: remainingPlayerId,
                matchWinner: remainingPlayerId,
                forfeit: true,
                message: `${leavingPlayer.nickname} 已离开游戏，你获得了胜利！`,
            })

            return
        }
    }

    // If host left, assign a new host or close the room
    if (socket.id === room.host) {
        const remainingPlayers = Object.keys(room.players)

        if (remainingPlayers.length > 0) {
            room.host = remainingPlayers[0]
            io.to(roomId).emit("host_changed", { room })
        } else {
            // No players left, delete the room
            delete rooms[roomId]
            return
        }
    }

    // Notify remaining players
    io.to(roomId).emit("player_left", { room })
}

// Start the server
const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})
