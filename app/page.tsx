"use client"

import { useState, useEffect } from "react"
import GameBoard from "@/components/game-board"
import MultiplayerLobby from "@/components/multiplayer-lobby"
import MultiplayerGame from "@/components/multiplayer-game"
import { Toaster } from "@/components/ui/toaster"
import { Button } from "@/components/ui/button"
import { Users, User, HelpCircle } from "lucide-react"
import { fetchAliases } from "@/lib/api"
import type { MultiplayerRoom } from "@/types/game"
import LoadingScreen from "@/components/loading-screen"
import HelpModal from "@/components/help-modal"

export default function Home() {
    const [mode, setMode] = useState<"menu" | "singleplayer" | "multiplayer-lobby" | "multiplayer-game">("menu")
    const [multiplayerRoom, setMultiplayerRoom] = useState<MultiplayerRoom | null>(null)
    const [songAliases, setSongAliases] = useState<Record<number, string[]>>({})
    const [loading, setLoading] = useState(true)
    const [showHelp, setShowHelp] = useState(false)

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
            <div className="w-full max-w-6xl">
                {mode === "menu" && (
                <div className="absolute right-4 top-4 bg-white px-4 py-2 rounded-full flex items-center gap-4">
                    <a
                        href="https://www.diving-fish.com/maimaidx/prober/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-blue-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M20.485 3.515c-.33-.33-.935-.657-1.61-.905a9 9 0 0 0-2.673-.536c-1.79-.085-3.928.345-5.97 1.92a1 1 0 0 0-.093.04L7.31 5.45a1 1 0 0 0 .169 1.855a11.7 11.7 0 0 0-1.178 4.14c-.075.782-.129 1.93-.185 3.122c-.023.502-.047 1.013-.073 1.507c-.617.05-1.188.109-1.654.184c-.49.08-1.042.177-1.438.503c-.169.14-.436.437-.436.897c0 .923.832 1.777 1.442 2.386c.609.61 1.463 1.442 2.386 1.442c.46 0 .758-.267.897-.436c.326-.396.423-.947.503-1.438a21 21 0 0 0 .184-1.654c.494-.026 1.004-.05 1.507-.073c1.192-.056 2.34-.11 3.122-.185a11.7 11.7 0 0 0 4.14-1.178a1 1 0 0 0 1.855.169l1.414-2.829a1 1 0 0 0 .042-.094c1.574-2.041 2.004-4.179 1.919-5.969a9 9 0 0 0-.536-2.673c-.248-.675-.574-1.28-.905-1.61ZM9.435 15.88c-.452.021-.917.043-1.383.067c.024-.466.046-.931.067-1.382c.053-1.137.101-2.184.173-2.932c.2-2.108 1.054-4.051 2.294-5.29c1.9-1.9 3.912-2.349 5.52-2.272a7 7 0 0 1 2.078.414c.301.111.63.239.885.442l.002.001l.001.002c.203.254.33.584.442.885c.2.544.375 1.261.414 2.077c.077 1.609-.372 3.622-2.271 5.521c-1.24 1.24-3.182 2.094-5.29 2.294c-.75.072-1.796.12-2.933.173Zm-4.469 2.312c.276-.037.594-.07.942-.102c-.03.35-.064.667-.101.942a8 8 0 0 1-.84-.84Zm9.862-9.021A1.5 1.5 0 1 0 16.95 7.05a1.5 1.5 0 0 0-2.122 2.122Z"/></g></svg>
                    </a>
                    <a
                        href="https://space.bilibili.com/91295942"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-blue-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none" fillRule="evenodd"><path d="m12.594 23.258l-.012.002l-.071.035l-.02.004l-.014-.004l-.071-.036q-.016-.004-.024.006l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.016-.018m.264-.113l-.014.002l-.184.093l-.01.01l-.003.011l.018.43l.005.012l.008.008l.201.092q.019.005.029-.008l.004-.014l-.034-.614q-.005-.019-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.003-.011l.018-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M6.445 3.168a1 1 0 0 1 1.387.277L9.535 6h4.93l1.703-2.555a1 1 0 0 1 1.664 1.11L16.87 6H18a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4h1.131l-.963-1.445a1 1 0 0 1 .277-1.387M8.986 8H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2H9.016zM9 11a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1"/></g></svg>
                    </a>
                    <a
                        href="https://github.com/yukineko2233/v0-maimai-wordle"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-black hover:text-blue-500 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><g fill="none"><path d="m12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035q-.016-.005-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427q-.004-.016-.017-.018m.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093q.019.005.029-.008l.004-.014l-.034-.614q-.005-.018-.02-.022m-.715.002a.02.02 0 0 0-.027.006l-.006.014l-.034.614q.001.018.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01z"/><path fill="currentColor" d="M6.315 6.176c-.25-.638-.24-1.367-.129-2.034a6.8 6.8 0 0 1 2.12 1.07c.28.214.647.283.989.18A9.3 9.3 0 0 1 12 5c.961 0 1.874.14 2.703.391c.342.104.709.034.988-.18a6.8 6.8 0 0 1 2.119-1.07c.111.667.12 1.396-.128 2.033c-.15.384-.075.826.208 1.14C18.614 8.117 19 9.04 19 10c0 2.114-1.97 4.187-5.134 4.818c-.792.158-1.101 1.155-.495 1.726c.389.366.629.882.629 1.456v3a1 1 0 0 0 2 0v-3c0-.57-.12-1.112-.334-1.603C18.683 15.35 21 12.993 21 10c0-1.347-.484-2.585-1.287-3.622c.21-.82.191-1.646.111-2.28c-.071-.568-.17-1.312-.57-1.756c-.595-.659-1.58-.271-2.28-.032a9 9 0 0 0-2.125 1.045A11.4 11.4 0 0 0 12 3c-.994 0-1.953.125-2.851.356a9 9 0 0 0-2.125-1.045c-.7-.24-1.686-.628-2.281.031c-.408.452-.493 1.137-.566 1.719l-.005.038c-.08.635-.098 1.462.112 2.283C3.484 7.418 3 8.654 3 10c0 2.992 2.317 5.35 5.334 6.397A4 4 0 0 0 8 17.98l-.168.034c-.717.099-1.176.01-1.488-.122c-.76-.322-1.152-1.133-1.63-1.753c-.298-.385-.732-.866-1.398-1.088a1 1 0 0 0-.632 1.898c.558.186.944 1.142 1.298 1.566c.373.448.869.916 1.58 1.218c.682.29 1.483.393 2.438.276V21a1 1 0 0 0 2 0v-3c0-.574.24-1.09.629-1.456c.607-.572.297-1.568-.495-1.726C6.969 14.187 5 12.114 5 10c0-.958.385-1.881 1.108-2.684c.283-.314.357-.756.207-1.14"/></g></svg>
                    </a>
                </div>
                )}
                {mode === "menu" && (
                    <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                        <div className="relative p-5 bg-gradient-to-r from-pink-500 to-purple-500 text-white flex items-center justify-center">
                            {/* 标题始终位于正中 */}
                            <h1 className="text-xl font-medium">
                                舞萌猜歌之潘一把
                            </h1>

                            {/* 右侧帮助按钮——脱离文档流，固定在最右边 */}
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowHelp(true)}
                                className="absolute right-4 text-white hover:bg-white/20"
                            >
                                <HelpCircle className="h-5 w-5" />
                            </Button>
                        </div>

                        <div className="p-8 flex flex-col md:flex-row gap-4 justify-center text-center">
                            <Button
                                onClick={() => setMode("singleplayer")}
                                className="flex-1 py-8 bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                                size="lg"
                            >
                                <User className="mr-2 h-5 w-5" />
                                单人模式
                            </Button>
                            <Button
                                onClick={() => setMode("multiplayer-lobby")}
                                className="flex-1 py-8 bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                                size="lg"
                            >
                                <Users className="mr-2 h-5 w-5" />
                                双人模式
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
            {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
        </main>
    )
}
