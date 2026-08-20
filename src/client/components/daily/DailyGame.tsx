import { useState, useEffect } from "react"
import { ArrowLeft, Flag, Share2, ArrowUp, ArrowDown } from "lucide-react"
import { toast } from "sonner"
import type { GameSettings, GameState, Guess, Song } from "../../../shared/types"
import { filterSongs, getDailySong, getShanghaiDate, processGuess } from "../../../shared/domain/game"
import SearchBox from "../game/SearchBox"
import GuessRow from "../game/GuessRow"
import ResultScreen from "../singleplayer/ResultScreen"
import DailyShareModal from "./DailyShareModal"

const DAILY_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2026",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 6,
  topSongs: 100,
  timeLimit: 0,
}

interface DailyGameProps {
  onBack: () => void
  initialSongs: Song[]
}

export default function DailyGame({ onBack, initialSongs }: DailyGameProps) {
  const [todayDate] = useState(() => getShanghaiDate())
  const [songs] = useState<Song[]>(initialSongs)
  const [filteredSongs, setFilteredSongs] = useState<Song[]>([])
  const [reverseOrder, setReverseOrder] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  const [gameState, setGameState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(`maimai_daily_${getShanghaiDate()}`)
      if (saved) {
        return JSON.parse(saved)
      }
    } catch (e) {}
    return {
      targetSong: null,
      guesses: [],
      gameOver: false,
      won: false,
      remainingTime: 0,
    }
  })

  // 初始化今日曲目
  useEffect(() => {
    if (songs.length === 0) return
    const pool = filterSongs(songs, DAILY_SETTINGS).slice(0, DAILY_SETTINGS.topSongs)
    setFilteredSongs(pool)

    const target = getDailySong(pool, todayDate)

    setGameState((prev) => {
      if (prev.targetSong && prev.targetSong.id === target?.id) {
        return prev
      }
      return {
        targetSong: target,
        guesses: prev.guesses || [],
        gameOver: prev.gameOver || false,
        won: prev.won || false,
        remainingTime: 0,
      }
    })
  }, [songs, todayDate])

  // 保存今日挑战进度
  useEffect(() => {
    if (gameState.targetSong && (gameState.guesses.length > 0 || gameState.gameOver)) {
      try {
        localStorage.setItem(`maimai_daily_${todayDate}`, JSON.stringify(gameState))
      } catch (e) {}
    }
  }, [gameState, todayDate])

  const makeGuess = (song: Song) => {
    if (gameState.gameOver || !gameState.targetSong) return

    if (gameState.guesses.some((g) => g.song.id === song.id)) {
      toast.info("你已经猜过这首歌曲了！")
      return
    }

    const newGuess: Guess = processGuess(song, gameState.targetSong)
    const won = newGuess.result.correct
    const newGuesses = [...gameState.guesses, newGuess]
    const gameOver = won || newGuesses.length >= DAILY_SETTINGS.maxGuesses

    setGameState((prev) => ({
      ...prev,
      guesses: newGuesses,
      won,
      gameOver,
    }))

    if (won) {
      toast.success("恭喜你猜对了今日挑战！🎉")
      setShowShareModal(true)
    } else if (gameOver) {
      toast.error("今日挑战机会已用尽")
    }
  }

  return (
    <div className="w-full mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden border border-white/50 animate-in fade-in duration-200">
      {/* 顶栏 */}
      <div className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white flex justify-between items-center shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
          title="返回主菜单"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <h1 className="text-lg font-bold text-center tracking-wide">
          每日一首 <span className="text-xs font-normal opacity-90">({todayDate})</span>
        </h1>

        <div className="w-9" />
      </div>

      <div className="p-4 md:p-6">
        {!gameState.targetSong ? (
          <div className="text-center text-gray-500 py-12">正在加载今日曲目...</div>
        ) : (
          <>
            {/* 状态统计与操作按钮 */}
            <div className="mb-4">
              <div className="text-center text-xs md:text-sm text-gray-700 mb-3">
                <span className="font-semibold text-gray-900">今日机会: </span>
                <strong className="text-teal-600 font-bold">{gameState.guesses.length}</strong> /{" "}
                {DAILY_SETTINGS.maxGuesses}
              </div>

              <div className="flex justify-center gap-3 flex-wrap">
                {!gameState.gameOver && (
                  <button
                    type="button"
                    onClick={() => setGameState((prev) => ({ ...prev, gameOver: true }))}
                    className="flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-red-200"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    投降
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setReverseOrder((prev) => !prev)}
                  className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded-lg transition-colors cursor-pointer border border-gray-200"
                  title={reverseOrder ? "当前最新猜测置顶" : "当前最早猜测置顶"}
                >
                  {reverseOrder ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                  <span>{reverseOrder ? "最新在上" : "最新在下"}</span>
                </button>

                {gameState.gameOver && (
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    分享结果
                  </button>
                )}
              </div>
            </div>

            {/* 浮动搜索栏 */}
            {!gameState.gameOver && (
              <div className="mb-5">
                <SearchBox songs={filteredSongs} onSelect={makeGuess} disabled={gameState.gameOver} />
              </div>
            )}

            {/* 游戏结束结算 */}
            {gameState.gameOver && (
              <ResultScreen
                won={gameState.won}
                targetSong={gameState.targetSong}
                guessCount={gameState.guesses.length}
                maxGuesses={DAILY_SETTINGS.maxGuesses}
                onNewGame={() => {}}
                isDaily={true}
                onShare={() => setShowShareModal(true)}
              />
            )}

            {/* 猜测记录列表 */}
            <div className={`gap-3 flex ${reverseOrder ? "flex-col" : "flex-col-reverse"}`}>
              {gameState.guesses.map((guess, idx) => (
                <GuessRow key={idx} guess={guess} />
              ))}
            </div>
          </>
        )}
      </div>

      {showShareModal && (
        <DailyShareModal
          guesses={gameState.guesses}
          won={gameState.won}
          maxGuesses={DAILY_SETTINGS.maxGuesses}
          date={todayDate}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  )
}
