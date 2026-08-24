import { randomBytes } from "node:crypto"
import type { Guess, Song } from "../../shared/types"
import { processGuess, getShanghaiDate } from "../../shared/domain/game"
import { dailyCatalog, filterDailySongs } from "./daily"

const MAX_GUESSES = 6
const MAX_SESSIONS = 10000

interface DailySession {
  token: string
  date: string
  algorithmVersion: number
  target: Song
  guesses: Guess[]
  guessedIds: Set<number>
  gameOver: boolean
  won: boolean
  expiresAt: number
}

export interface DailySessionView {
  date: string
  algorithmVersion: number
  sessionToken: string
  guesses: Guess[]
  gameOver: boolean
  won: boolean
  answer?: Song
}

export interface DailyGuessView {
  guess: Guess
  gameOver: boolean
  won: boolean
  answer?: Song
}

export class DailySessionError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
  }
}

function nextShanghaiMidnight(now: Date): number {
  const shanghaiNow = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return (
    Date.UTC(
      shanghaiNow.getUTCFullYear(),
      shanghaiNow.getUTCMonth(),
      shanghaiNow.getUTCDate() + 1,
    ) -
    8 * 60 * 60 * 1000
  )
}

export class DailySessionManager {
  private sessions = new Map<string, DailySession>()
  private catalogSnapshot: { date: string; songsById: Map<number, Song> } | null = null

  constructor(private readonly createToken = () => randomBytes(32).toString("base64url")) {}

  getOrCreate(songs: readonly Song[], token?: string, now = new Date()): DailySessionView {
    this.cleanup(now)
    if (token) {
      const restored = this.sessions.get(token)
      if (restored) return this.toView(restored)
      throw new DailySessionError("Daily session was not found", 401, "INVALID_SESSION")
    }

    const daily = dailyCatalog.getDaily(songs, now)
    if (!daily) throw new DailySessionError("Catalog is not ready", 503, "CATALOG_NOT_READY")
    this.ensureCatalogSnapshot(daily.date, songs)
    if (this.sessions.size >= MAX_SESSIONS) {
      const oldestToken = this.sessions.keys().next().value
      if (oldestToken) this.sessions.delete(oldestToken)
    }

    let newToken = this.createToken()
    while (this.sessions.has(newToken)) newToken = this.createToken()
    const session: DailySession = {
      token: newToken,
      date: daily.date,
      algorithmVersion: daily.algorithmVersion,
      target: daily.song,
      guesses: [],
      guessedIds: new Set(),
      gameOver: false,
      won: false,
      expiresAt: nextShanghaiMidnight(now),
    }
    this.sessions.set(session.token, session)
    return this.toView(session)
  }

  restoreOrCreate(songs: readonly Song[], token?: string, now = new Date()): DailySessionView {
    try {
      return this.getOrCreate(songs, token, now)
    } catch (error) {
      if (token && error instanceof DailySessionError && error.code === "INVALID_SESSION") {
        return this.getOrCreate(songs, undefined, now)
      }
      throw error
    }
  }

  guess(token: string, songId: number, now = new Date()): DailyGuessView {
    const session = this.requireSession(token, now)
    if (session.gameOver) throw new DailySessionError("Daily challenge is already over", 409, "GAME_OVER")
    if (session.guessedIds.has(songId)) throw new DailySessionError("Song was already guessed", 409, "DUPLICATE_GUESS")

    const song = this.catalogSnapshot?.date === session.date ? this.catalogSnapshot.songsById.get(songId) : undefined
    if (!song) throw new DailySessionError("Song is not in the daily catalog", 422, "INVALID_SONG")

    const guess = processGuess(song, session.target)
    session.guesses.push(guess)
    session.guessedIds.add(songId)
    session.won = guess.result.correct
    session.gameOver = session.won || session.guesses.length >= MAX_GUESSES
    return {
      guess,
      gameOver: session.gameOver,
      won: session.won,
      ...(session.gameOver ? { answer: session.target } : {}),
    }
  }

  giveUp(token: string, now = new Date()): DailySessionView {
    const session = this.requireSession(token, now)
    if (!session.gameOver) session.gameOver = true
    return this.toView(session)
  }

  private requireSession(token: string, now: Date): DailySession {
    const session = this.sessions.get(token)
    if (!session) {
      this.cleanup(now)
      throw new DailySessionError("Daily session was not found", 401, "INVALID_SESSION")
    }
    if (session.expiresAt <= now.getTime() || session.date !== getShanghaiDate(now)) {
      this.sessions.delete(token)
      throw new DailySessionError("Daily session has expired", 410, "SESSION_EXPIRED")
    }
    this.cleanup(now)
    return session
  }

  private ensureCatalogSnapshot(date: string, songs: readonly Song[]) {
    if (this.catalogSnapshot?.date === date) return
    this.catalogSnapshot = {
      date,
      songsById: new Map(filterDailySongs(songs).map((song) => [song.id, song])),
    }
  }

  private cleanup(now: Date) {
    const date = getShanghaiDate(now)
    for (const [token, session] of this.sessions) {
      if (session.expiresAt <= now.getTime() || session.date !== date) this.sessions.delete(token)
    }
    if (this.catalogSnapshot?.date !== date) this.catalogSnapshot = null
  }

  private toView(session: DailySession): DailySessionView {
    return {
      date: session.date,
      algorithmVersion: session.algorithmVersion,
      sessionToken: session.token,
      guesses: [...session.guesses],
      gameOver: session.gameOver,
      won: session.won,
      ...(session.gameOver ? { answer: session.target } : {}),
    }
  }
}

export const dailySessionManager = new DailySessionManager()
