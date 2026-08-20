import express from "express"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import cors from "cors"
import path from "path"
import { fileURLToPath } from "url"
import { catalogService } from "./catalog/service"
import { RoomManager } from "./multiplayer/room-manager"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(cors())
app.use(express.json())

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  pingTimeout: 20000,
  pingInterval: 10000,
})

const roomManager = new RoomManager(io, () => catalogService.getSongs())

// API 路由
app.get("/api/songs", (_req, res) => {
  const songs = catalogService.getSongs()
  res.json(songs)
})

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    catalog: catalogService.getStatus(),
    rooms: roomManager.getRoomStats(),
  })
})

app.get("/api/room-stats", (_req, res) => {
  res.json(roomManager.getRoomStats())
})

app.post("/api/refresh", async (_req, res) => {
  try {
    const songs = await catalogService.refreshCatalog()
    res.json({ success: true, count: songs.length })
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// 生产环境静态文件托管 (Vite 编译产物)
const clientDistPath = path.resolve(__dirname, "../client")
app.use(express.static(clientDistPath))

// SPA fallback
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io")) {
    return next()
  }
  res.sendFile(path.join(clientDistPath, "index.html"), (err) => {
    if (err) {
      res.status(200).send("maimai Wordle API Server is running.")
    }
  })
})

// WebSocket 事件处理
io.on("connection", (socket) => {
  // 发送当前房间统计给新连接的客户端
  socket.emit("room_count_update", roomManager.getRoomStats())

  socket.on("get_room_count", () => {
    socket.emit("room_count_update", roomManager.getRoomStats())
  })

  socket.on("create_room", (data) => {
    roomManager.createRoom(socket, data)
  })

  socket.on("join_room", (data) => {
    roomManager.joinRoom(socket, data)
  })

  socket.on("reconnect_session", (data) => {
    roomManager.reconnectSession(socket, data)
  })

  socket.on("join_random_room", (data) => {
    roomManager.joinRandomRoom(socket, data)
  })

  socket.on("toggle_ready", (data) => {
    roomManager.toggleReady(socket, data)
  })

  socket.on("remove_player", (data) => {
    roomManager.removePlayer(socket, data)
  })

  socket.on("start_game", (data) => {
    roomManager.startGame(socket, data)
  })

  socket.on("make_guess", (data) => {
    roomManager.makeGuess(socket, data)
  })

  socket.on("give_up", (data) => {
    roomManager.giveUp(socket, data)
  })

  socket.on("ready_next_round", (data) => {
    roomManager.readyNextRound(socket, data)
  })

  socket.on("leave_room", (data) => {
    roomManager.leaveRoom(socket, data)
  })

  socket.on("disconnect", () => {
    roomManager.handleDisconnect(socket)
  })
})

const PORT = process.env.PORT || 3001

async function startServer() {
  try {
    await catalogService.init()
  } catch (err) {
    console.error("Failed to load initial catalog on startup:", err)
  }

  server.listen(PORT, () => {
    console.log(`maimai Wordle server listening on port ${PORT}`)
  })
}

startServer()
