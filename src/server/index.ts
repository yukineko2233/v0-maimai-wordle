import express from "express"
import http from "http"
import { Server as SocketIOServer } from "socket.io"
import cors from "cors"
import helmet from "helmet"
import path from "path"
import { fileURLToPath } from "url"
import type { ZodType } from "zod"
import { catalogService } from "./catalog/service"
import { dailySessionManager, DailySessionError } from "./catalog/daily-session"
import { RoomManager, type SocketActionResult } from "./multiplayer/room-manager"
import { dailySchemas, socketSchemas } from "./validation"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configuredOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
const allowedOrigins = new Set(
  configuredOrigins.length > 0
    ? configuredOrigins
    : process.env.NODE_ENV === "production"
      ? []
      : ["http://localhost:5173", "http://127.0.0.1:5173"],
)
const allowOrigin = (origin: string | undefined) => !origin || allowedOrigins.has(origin)
const corsOrigin: cors.CorsOptions["origin"] = (origin, callback) => {
  callback(null, allowOrigin(origin))
}
const allowSocketRequest = (origin: string | undefined, host: string | undefined) => {
  if (allowOrigin(origin)) return true
  try {
    return Boolean(origin && host && new URL(origin).host === host)
  } catch {
    return false
  }
}

const app = express()
app.disable("x-powered-by")
app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: corsOrigin, methods: ["GET", "POST"] }))
app.use(express.json({ limit: "32kb" }))

const server = http.createServer(app)
const io = new SocketIOServer(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST"],
  },
  allowRequest: (req, callback) => callback(null, allowSocketRequest(req.headers.origin, req.headers.host)),
  pingTimeout: 20000,
  pingInterval: 10000,
})

const roomManager = new RoomManager(io, () => catalogService.getSongs())

// API 路由
app.get("/api/songs", (_req, res) => {
  const songs = catalogService.getSongs()
  res.json(songs)
})

app.get("/api/daily/session", (req, res, next) => {
  const authorization = req.header("authorization")
  if (authorization && !authorization.startsWith("Bearer ")) {
    res.status(400).json({ success: false, error: "Invalid authorization scheme" })
    return
  }
  const sessionToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined
  const parsed = dailySchemas.restore.safeParse({ sessionToken })
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid daily session token" })
    return
  }
  try {
    res.setHeader("Cache-Control", "no-store")
    res.json(dailySessionManager.getOrCreate(catalogService.getSongs(), parsed.data.sessionToken))
  } catch (error) {
    next(error)
  }
})

app.post("/api/daily/guess", (req, res, next) => {
  const parsed = dailySchemas.guess.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid daily guess request" })
    return
  }
  try {
    res.setHeader("Cache-Control", "no-store")
    res.json(dailySessionManager.guess(parsed.data.sessionToken, parsed.data.songId))
  } catch (error) {
    next(error)
  }
})

app.post("/api/daily/give-up", (req, res, next) => {
  const parsed = dailySchemas.giveUp.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ success: false, error: "Invalid daily give-up request" })
    return
  }
  try {
    res.setHeader("Cache-Control", "no-store")
    res.json(dailySessionManager.giveUp(parsed.data.sessionToken))
  } catch (error) {
    next(error)
  }
})

app.get("/api/health", (_req, res) => {
  const catalog = catalogService.getStatus()
  res.status(catalog.ready ? 200 : 503).json({
    status: catalog.ready ? "ready" : "not_ready",
    catalog,
    rooms: roomManager.getRoomStats(),
  })
})

app.get("/api/room-stats", (_req, res) => {
  res.json(roomManager.getRoomStats())
})

const refreshToken = process.env.ADMIN_REFRESH_TOKEN
const configuredCooldown = Number(process.env.REFRESH_COOLDOWN_MS || 60000)
const refreshCooldownMs = Number.isFinite(configuredCooldown) && configuredCooldown >= 0 ? configuredCooldown : 60000
let nextRefreshAt = 0

app.post("/api/refresh", async (req, res, next) => {
  if (!refreshToken) {
    res.status(403).json({ success: false, error: "Catalog refresh is disabled" })
    return
  }

  const authorization = req.header("authorization")
  const providedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : req.header("x-admin-token")
  if (providedToken !== refreshToken) {
    res.status(401).json({ success: false, error: "Unauthorized" })
    return
  }

  const now = Date.now()
  if (now < nextRefreshAt) {
    res.setHeader("Retry-After", Math.ceil((nextRefreshAt - now) / 1000))
    res.status(429).json({ success: false, error: "Catalog refresh is cooling down" })
    return
  }
  nextRefreshAt = now + refreshCooldownMs

  try {
    const songs = await catalogService.refreshCatalog()
    res.json({ success: true, count: songs.length })
  } catch (error) {
    next(error)
  }
})

app.use("/api", (_req, res) => {
  res.status(404).json({ success: false, error: "API endpoint not found" })
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
  const runProtected = (handler: () => void, emitError = true) => {
    try {
      handler()
    } catch (error) {
      console.error("Socket event handler failed:", error)
      if (emitError) socket.emit("room_error", { message: "服务器处理请求失败" })
    }
  }
  const onValidated = <T>(schema: ZodType<T>, handler: (data: T) => void) => (data: unknown) => {
    const result = schema.safeParse(data)
    if (!result.success) {
      socket.emit("room_error", { message: "请求参数无效" })
      return
    }
    runProtected(() => handler(result.data))
  }
  const onValidatedWithAck = <T>(schema: ZodType<T>, handler: (data: T) => SocketActionResult) => (
    data: unknown,
    acknowledge?: (result: SocketActionResult) => void,
  ) => {
    const result = schema.safeParse(data)
    if (!result.success) {
      socket.emit("room_error", { message: "请求参数无效" })
      acknowledge?.({ ok: false, message: "请求参数无效" })
      return
    }
    try {
      acknowledge?.(handler(result.data))
    } catch (error) {
      console.error("Socket event handler failed:", error)
      socket.emit("room_error", { message: "服务器处理请求失败" })
      acknowledge?.({ ok: false, message: "服务器处理请求失败" })
    }
  }

  // 发送当前房间统计给新连接的客户端
  runProtected(() => socket.emit("room_count_update", roomManager.getRoomStats()))

  socket.on("get_room_count", () => {
    runProtected(() => socket.emit("room_count_update", roomManager.getRoomStats()))
  })

  socket.on("create_room", onValidatedWithAck(socketSchemas.createRoom, (data) => roomManager.createRoom(socket, data)))

  socket.on("join_room", onValidatedWithAck(socketSchemas.joinRoom, (data) => roomManager.joinRoom(socket, data)))

  socket.on("reconnect_session", onValidated(socketSchemas.reconnectSession, (data) => roomManager.reconnectSession(socket, data)))

  socket.on("join_random_room", onValidatedWithAck(socketSchemas.joinRandomRoom, (data) => roomManager.joinRandomRoom(socket, data)))

  socket.on("toggle_ready", onValidated(socketSchemas.room, (data) => roomManager.toggleReady(socket, data)))

  socket.on("remove_player", onValidated(socketSchemas.removePlayer, (data) => roomManager.removePlayer(socket, data)))

  socket.on("start_game", onValidated(socketSchemas.room, (data) => roomManager.startGame(socket, data)))

  socket.on("make_guess", onValidatedWithAck(socketSchemas.makeGuess, (data) => roomManager.makeGuess(socket, data)))

  socket.on("give_up", onValidatedWithAck(socketSchemas.room, (data) => roomManager.giveUp(socket, data)))

  socket.on("round_time_expired", onValidatedWithAck(socketSchemas.room, (data) => roomManager.roundTimeExpired(socket, data)))

  socket.on("ready_next_round", onValidated(socketSchemas.room, (data) => roomManager.readyNextRound(socket, data)))

  socket.on("leave_room", onValidated(socketSchemas.room, (data) => roomManager.leaveRoom(socket, data)))

  socket.on("disconnect", () => {
    runProtected(() => roomManager.handleDisconnect(socket), false)
  })
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("HTTP request failed:", error)
  if (res.headersSent) return
  const errorStatus = error instanceof DailySessionError
    ? error.status
    : typeof error === "object" && error && "status" in error
      ? Number(error.status)
      : NaN
  const status = error instanceof SyntaxError ? 400 : errorStatus >= 400 && errorStatus < 500 ? errorStatus : 500
  const message = error instanceof DailySessionError
    ? error.message
    : status === 400
      ? "Invalid JSON body"
      : status === 413
        ? "Request body is too large"
        : "Internal server error"
  res.status(status).json({ success: false, error: message, ...(error instanceof DailySessionError ? { code: error.code } : {}) })
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
