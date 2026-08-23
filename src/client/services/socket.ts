import { io } from "socket.io-client"
import type { MultiplayerRoom } from "../../shared/types"
import { SessionChannel } from "./session-channel"

const TOKEN_KEY = "maimai_multi_token"
const PLAYER_KEY = "maimai_multi_player_id"
const SESSION_RETRY_WINDOW_MS = 65_000
const SESSION_RETRY_DELAY_MS = 1_000

export type SocketConnectionState = "connecting" | "connected" | "reconnecting" | "disconnected"

export interface SocketActionResult {
  ok: boolean
  message?: string
}

export interface RestoredMultiplayerSession {
  room: MultiplayerRoom
  sessionToken: string
  playerId: string
}

let sessionRetryDeadline = 0
let sessionRetryTimer: number | undefined
let connectionState: SocketConnectionState = "connecting"
const restoredSessions = new SessionChannel<RestoredMultiplayerSession>()
const lostSessions = new SessionChannel<string>()
const connectionListeners = new Set<(state: SocketConnectionState) => void>()

// 自动连接当前同源服务器或环境变量指定的地址
export const socket = io(import.meta.env.VITE_SOCKET_URL || "", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
})

function setConnectionState(state: SocketConnectionState) {
  if (connectionState === state) return
  connectionState = state
  for (const listener of connectionListeners) listener(state)
}

function readSessionToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function requestSessionRestore() {
  const sessionToken = readSessionToken()
  if (sessionToken && socket.connected) socket.emit("reconnect_session", { sessionToken })
}

function onSocketConnect() {
  setConnectionState("connected")
  socket.emit("get_room_count")
  if (readSessionToken()) {
    sessionRetryDeadline = Date.now() + SESSION_RETRY_WINDOW_MS
    requestSessionRestore()
  }
}

function onSocketDisconnect(reason: string) {
  setConnectionState(reason === "io client disconnect" ? "disconnected" : "reconnecting")
}

function onReconnectAttempt() {
  setConnectionState("reconnecting")
}

function onManagerReconnectFailed() {
  setConnectionState("disconnected")
  if (readSessionToken()) notifyMultiplayerSessionLost("网络重连失败，多人会话已断开")
}

socket.on("connect", onSocketConnect)
socket.on("disconnect", onSocketDisconnect)
socket.io.on("reconnect_attempt", onReconnectAttempt)
socket.io.on("reconnect_failed", onManagerReconnectFailed)

export function saveMultiplayerSession(sessionToken: string, playerId: string) {
  try {
    sessionStorage.setItem(TOKEN_KEY, sessionToken)
    sessionStorage.setItem(PLAYER_KEY, playerId)
  } catch {}
}

export function clearMultiplayerSession() {
  if (sessionRetryTimer !== undefined) window.clearTimeout(sessionRetryTimer)
  sessionRetryTimer = undefined
  sessionRetryDeadline = 0
  restoredSessions.clear()
  lostSessions.clear()
  try {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(PLAYER_KEY)
  } catch {}
}

export function getMultiplayerPlayerId() {
  try {
    return sessionStorage.getItem(PLAYER_KEY) || ""
  } catch {
    return ""
  }
}

export function onMultiplayerSessionRestored(listener: (session: RestoredMultiplayerSession) => void) {
  return restoredSessions.subscribe(listener)
}

export function onMultiplayerSessionLost(listener: (message: string) => void) {
  return lostSessions.subscribe(listener)
}

export function onSocketConnectionState(listener: (state: SocketConnectionState) => void) {
  connectionListeners.add(listener)
  listener(connectionState)
  return () => {
    connectionListeners.delete(listener)
  }
}

export function getSocketConnectionState() {
  return connectionState
}

export function emitSocketRequest<T>(event: string, data: T, timeoutMs = 9_000): Promise<SocketActionResult> {
  if (!socket.connected) return Promise.resolve({ ok: false, message: "服务器连接已断开，请等待重连" })
  return new Promise((resolve) => {
    socket.volatile.timeout(timeoutMs).emit(event, data, (error: Error | null, result?: SocketActionResult) => {
      if (error) {
        resolve({ ok: false, message: "请求超时，请检查连接后重试" })
        return
      }
      resolve(result || { ok: true })
    })
  })
}

function notifyMultiplayerSessionLost(message: string) {
  clearMultiplayerSession()
  lostSessions.publish(message)
}

function onRoomCreated({ sessionToken, playerId }: { sessionToken?: string; playerId?: string }) {
  if (sessionToken && playerId) saveMultiplayerSession(sessionToken, playerId)
}

function onRoomJoined({ sessionToken, playerId }: { sessionToken?: string; playerId?: string }) {
  if (sessionToken && playerId) saveMultiplayerSession(sessionToken, playerId)
}

function onSessionReconnected(session: RestoredMultiplayerSession) {
  if (!session.sessionToken || !session.playerId) return
  if (sessionRetryTimer !== undefined) window.clearTimeout(sessionRetryTimer)
  sessionRetryTimer = undefined
  sessionRetryDeadline = 0
  saveMultiplayerSession(session.sessionToken, session.playerId)
  restoredSessions.publish(session)
}

function onSessionReconnectFailed({ message }: { message?: string }) {
  if (!String(message).includes("仍在线")) {
    notifyMultiplayerSessionLost(message || "多人会话已失效")
    return
  }
  if (Date.now() >= sessionRetryDeadline) {
    notifyMultiplayerSessionLost("无法恢复多人会话，请重新加入房间")
    return
  }
  if (sessionRetryTimer !== undefined) window.clearTimeout(sessionRetryTimer)
  sessionRetryTimer = window.setTimeout(requestSessionRestore, SESSION_RETRY_DELAY_MS)
}

function onPlayerRemoved({ playerId }: { playerId?: string }) {
  if (playerId === getMultiplayerPlayerId()) clearMultiplayerSession()
}

function onRoomExpired({ message }: { message?: string }) {
  notifyMultiplayerSessionLost(message || "房间已过期")
}

socket.on("room_created", onRoomCreated)
socket.on("room_joined", onRoomJoined)
socket.on("reconnected", onSessionReconnected)
socket.on("reconnect_failed", onSessionReconnectFailed)
socket.on("player_removed", onPlayerRemoved)
socket.on("room_expired", onRoomExpired)
