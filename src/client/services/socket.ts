import { io } from "socket.io-client"

// 自动连接当前同源服务器或环境变量指定的地址
export const socket = io(import.meta.env.VITE_SOCKET_URL || "", {
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
})

socket.on("connect", () => {
  socket.emit("get_room_count")
})
