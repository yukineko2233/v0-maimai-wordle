"use client"

import { useState, useEffect } from "react"
import type { MultiplayerRoom, Song } from "@/types/game"
import { Button } from "@/components/ui/button"
import { RefreshCw, Flag, ArrowLeft } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import SearchBox from "@/components/search-box"
import GuessRow from "@/components/guess-row"
import { socket } from "@/lib/socket"
import MultiplayerResultScreen from "@/components/multiplayer-result-screen"

interface MultiplayerGameProps {
    initialRoom: MultiplayerRoom
    songAliases: Record<number, string[]>
    onExit: () => void
}

export default function MultiplayerGame({ initialRoom, songAliases, onExit }: MultiplayerGameProps) {
    const [room, setRoom] = useState<MultiplayerRoom>(initialRoom)
    const [remainingTime, setRemainingTime] = useState(initialRoom.settings.timeLimit)
    const { toast } = useToast()

    // Get current player
    const currentPlayer = room.players[socket.id]
    const opponent = Object.values(room.players).find((player) => player.id !== socket.id)

    useEffect(() => {
        // Set up socket event listeners
        socket.on("game_updated", ({ room }) => {
            setRoom(room)
        })

        socket.on("round_ended", ({ room, roundWinner, matchWinner, forfeit, message }) => {
            setRoom(room)

            if (forfeit) {
                toast({
                    title: "对手已离开",
                    description: message || "对手已离开游戏，你获得了胜利！",
                })
            } else if (roundWinner) {
                const winnerName = room.players[roundWinner].nickname
                toast({
                    title: `第${room.currentRound}轮结束`,
                    description: `${winnerName} 赢得了这一轮！`,
                })
            } else {
                toast({
                    title: `第${room.currentRound}轮结束`,
                    description: "平局！",
                })
            }

            if (matchWinner) {
                const winnerName = room.players[matchWinner].nickname
                toast({
                    title: "比赛结束",
                    description: `${winnerName} 赢得了比赛！`,
                })
            }
        })

        socket.on("next_round_started", ({ room }) => {
            setRoom(room)
            setRemainingTime(room.settings.timeLimit)
            toast({
                title: `第${room.currentRound}轮开始`,
                description: "新的一轮开始了！",
            })
        })

        socket.on("player_ready", ({ room }) => {
            setRoom(room)
            const readyPlayer = Object.values(room.players).find((p) => p.readyForNextRound)
            if (readyPlayer && readyPlayer.id !== socket.id) {
                toast({
                    title: "对手已准备好",
                    description: "等待你准备开始下一轮",
                })
            }
        })

        socket.on("guess_error", ({ message }) => {
            toast({
                title: "猜测错误",
                description: message,
                variant: "destructive",
            })
        })

        // Clean up listeners on unmount
        return () => {
            socket.off("game_updated")
            socket.off("round_ended")
            socket.off("next_round_started")
            socket.off("player_ready")
            socket.off("guess_error")
        }
    }, [toast])

    // Timer effect
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null

        if (
            room.settings.timeLimit > 0 &&
            remainingTime > 0 &&
            !currentPlayer.currentRound.gameOver &&
            room.status === "playing"
        ) {
            timer = setTimeout(() => {
                setRemainingTime((prev) => {
                    const newTime = prev - 1
                    if (newTime <= 0) {
                        // Time's up, give up automatically
                        socket.emit("give_up", { roomId: room.id })
                    }
                    return newTime
                })
            }, 1000)
        }

        return () => {
            if (timer) clearTimeout(timer)
        }
    }, [remainingTime, currentPlayer, room])

    const makeGuess = (song: Song) => {
        socket.emit("make_guess", {
            roomId: room.id,
            song,
        })
    }

    const giveUp = () => {
        socket.emit("give_up", {
            roomId: room.id,
        })
    }

    const readyForNextRound = () => {
        socket.emit("ready_next_round", {
            roomId: room.id,
        })
    }

    const exitGame = () => {
        socket.emit("leave_room", {
            roomId: room.id,
        })
        onExit()
    }

    // Check if round is over but match is not finished
    const isRoundOver = Object.values(room.players).every((p) => p.currentRound.gameOver) && room.status === "playing"

    // Check if match is finished
    const isMatchFinished = room.status === "finished"

    return (
        <div className="w-full mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 text-white p-4">
                <div className="flex justify-between items-center">
                    <Button variant="ghost" size="sm" onClick={exitGame} className="text-white hover:bg-white/20">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        退出
                    </Button>
                    <div className="text-center">
                        <h2 className="text-xl font-medium">
                            第{room.currentRound}轮
                        </h2>
                        <div className="text-sm">
                            {currentPlayer.nickname} {currentPlayer.score} : {opponent?.score || 0}{" "}
                            {opponent?.nickname || "等待中..."}
                        </div>
                    </div>
                    <div className="w-24"></div> {/* Spacer for alignment */}
                </div>
            </div>
            <div className="p-6">
                {/* Game status */}
                <div className="mb-4 flex justify-center gap-4 items-center">
                    <div className="flex-1 text-center">
                        <span className="font-medium">已猜测: </span>
                        <span>
              {currentPlayer.currentRound.guesses.length}/{room.settings.maxGuesses}
            </span>
                    </div>
                    <div className="flex-1 text-center">
                        {room.settings.timeLimit > 0 ? (
                            <>
                                <span className="font-medium">剩余时间: </span>
                                <span>{remainingTime}秒</span>
                            </>
                        ) : (
                            <span>无限时间</span>
                        )}
                    </div>
                </div>

                {/* Game controls */}
                {!currentPlayer.currentRound.gameOver && !isRoundOver && !isMatchFinished && (
                    <div className="mb-6 flex justify-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={giveUp}
                            className="flex-1 flex items-center justify-center gap-1 max-w-40"
                        >
                            <Flag className="h-4 w-4" />
                            投降
                        </Button>
                    </div>
                )}

                {/* Search box */}
                {!currentPlayer.currentRound.gameOver && !isRoundOver && !isMatchFinished && (
                    <div className="mb-5">
                        <SearchBox
                            songs={room.filteredSongs}
                            aliases={songAliases}
                            onSelect={makeGuess}
                            disabled={currentPlayer.currentRound.gameOver}
                        />
                    </div>
                )}

                {/* Round result */}
                {isRoundOver && !isMatchFinished && (
                    <div className="mb-5 p-3 bg-gray-50 rounded-lg text-center">
                        <h3 className="text-xl font-bold mb-2">
                            {currentPlayer.currentRound.won ? "你赢了这一轮！" : "你输了这一轮"}
                        </h3>
                        <h3 className="font-medium mb-1">正确答案是：</h3>
                        <div className="mb-2">
                            <div className="text-lg font-bold">{room.targetSong.title}</div>
                            <div className="text-sm text-gray-600">{room.targetSong.artist}</div>
                        </div>
                        <div className="flex items-center gap-5 mb-5 w-full justify-center">
                            {" "}
                            {/* Increased spacing */}
                            <img
                                src={`https://www.diving-fish.com/covers/${String(room.targetSong.id).padStart(5, "0")}.png` || "/placeholder.png"}
                                alt={room.targetSong.title}
                                className="w-24 h-24 object-cover rounded-lg shadow-md" /* Increased from w-24 h-24 */
                                onError={(e) => {
                                    ;(e.target as HTMLImageElement).src = "/placeholder.png?height=160&width=160"
                                }}
                            />
                            <div className="text-left">
                                <div className="text-sm mt-1">
                                    {room.targetSong.type} | {room.targetSong.genre} | <span className="font-medium">BPM: </span> {room.targetSong.bpm}
                                </div>
                                <div className="text-sm">
                                    <span className="font-medium">Master:</span> {room.targetSong.level_master} |
                                    <span className="font-medium"> Re:Master:</span> {room.targetSong.level_remaster || "无"}
                                </div>
                                <div className="text-sm">
                                    {room.targetSong.version}
                                </div>
                            </div>
                        </div>
                        <Button
                            onClick={readyForNextRound}
                            disabled={currentPlayer.readyForNextRound}
                            className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                        >
                            {currentPlayer.readyForNextRound ? "等待对手准备..." : "准备下一轮"}
                            <RefreshCw className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}

                {/* Match result */}
                {isMatchFinished && <MultiplayerResultScreen room={room} currentPlayerId={socket.id} onExit={exitGame} />}

                {/* Guesses */}
                <div className="mt-5 space-y-3">
                    {currentPlayer.currentRound.guesses.map((guess, index) => (
                        <GuessRow key={index} guess={guess} targetSong={room.targetSong} />
                    ))}
                </div>

                {/* Opponent status */}
                {opponent && (
                    <div className="mt-8 p-4 border rounded-lg">
                        <h3 className="text-lg font-medium mb-2 flex items-center">对手状态: {opponent.nickname}</h3>
                        <div className="flex items-center gap-4">
                            <div>
                                <span className="font-medium">已猜测: </span>
                                <span>
                  {opponent.currentRound.guesses.length}/{room.settings.maxGuesses}
                </span>
                            </div>
                            {opponent.currentRound.gameOver && (
                                <div className="text-sm px-2 py-1 rounded bg-gray-100">
                                    {opponent.currentRound.won ? "已猜出正确答案" : "已结束猜测"}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
