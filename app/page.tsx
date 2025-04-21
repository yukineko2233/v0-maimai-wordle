"use client"

import { useState, useEffect } from "react"
import GameBoard from "@/components/game-board"
import MultiplayerLobby from "@/components/multiplayer-lobby"
import MultiplayerGame from "@/components/multiplayer-game"
import { Toaster } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Users, User } from "lucide-react"
import { fetchAliases } from "@/lib/api"
import type { MultiplayerRoom } from "@/types/game"
import LoadingScreen from "@/components/loading-screen"

export default function Home() {
    const [mode, setMode] = useState<"menu" | "singleplayer" | "multiplayer-lobby" | "multiplayer-game">("menu")
    const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null)
    const [songAliases, setSongAliases] = useState<Record<number, string[]>>({})
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Load aliases on mount
        const loadAliases = async () => {
            try {
                const aliasesData = await fetchAliases()
                setSongAliases(aliasesData)
                setLoading(false)
            } catch (error) {
                console.error("Failed to load aliases:", error)
            }
        }

        loadAliases()
    }, [])

    const handleStartMultiplayerGame = (room: MultiplayerRoom) => {
        setMultiplayerRoom(room)
        setMode("multiplayer-game")
    }

    if (loading) {
        return (
            <main className="min-h-screen py-12 px-6 bg-[url('/bg.png')] bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center">
                <div className="w-full max-w-6xl min-h-[800px]">
                    <LoadingScreen />
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen py-12 px-6 bg-[url('/bg.png')] bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center">
            <div className="w-full max-w-6xl min-h-[800px]">
                {mode === "menu" && (
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden p-8 text-center">
                        <h1 className="text-3xl font-bold mb-8">舞萌猜歌之潘一把</h1>
                        <div className="flex flex-col md:flex-row gap-4 justify-center max-w-md mx-auto">
                            <Button
                                onClick={() => setMode("singleplayer")}
                                className="py-8 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                size="lg"
                            >
                                <User className="mr-2 h-5 w-5" />
                                单人模式
                            </Button>
                            <Button
                                onClick={() => setMode("multiplayer-lobby")}
                                className="py-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                size="lg"
                            >
                                <Users className="mr-2 h-5 w-5" />
                                多人模式
                            </Button>
                        </div>
                    </div>
                )}

                {mode === "singleplayer" && <GameBoard onBack={() => setMode("menu")} />}

                {mode === "multiplayer-lobby" && (
                    <MultiplayerLobby onStartGame={handleStartMultiplayerGame} onBack={() => setMode("menu")} />
                )}

                {mode === "multiplayer-game" && multiplayerRoom && (
                    <MultiplayerGame initialRoom={multiplayerRoom} songAliases={songAliases} onExit={() => setMode("menu")} />
                )}

                <Toaster />
            </div>
        </main>
    )
}
