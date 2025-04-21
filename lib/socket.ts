import { io } from "socket.io-client"

// Create a socket instance
export const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001")

// Add connection event listeners
socket.on("connect", () => {
    console.log("Connected to server with ID:", socket.id)
})

socket.on("disconnect", () => {
    console.log("Disconnected from server")
})

socket.on("connect_error", (error) => {
    console.error("Connection error:", error)
})
