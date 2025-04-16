import GameBoard from "@/components/game-board"

export default function Home() {
  return (
    <main className="min-h-screen py-12 px-6 bg-gradient-to-b from-pink-50 to-purple-50 flex flex-col items-center justify-center">
      <div className="w-full max-w-6xl min-h-[800px]">
        {/* Increased height with min-h-[800px] */}
        <GameBoard />
      </div>
    </main>
  )
}
