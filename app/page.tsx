import GameBoard from "@/components/game-board"
import { Toaster } from "@/components/ui/toaster"

export default function Home() {
    return (
        <main className="min-h-screen py-12 px-6 bg-[url('/bg.png')] bg-cover bg-center bg-fixed bg-no-repeat flex flex-col items-center justify-center">
            <div className="w-full max-w-6xl min-h-[800px]">
                <GameBoard />
                <Toaster />
            </div>
        </main>
    )
}
