import { describe, expect, it } from "vitest"
import { DailySessionError, DailySessionManager } from "../src/server/catalog/daily-session"
import { dailyCatalog } from "../src/server/catalog/daily"
import { dailySchemas } from "../src/server/validation"
import type { Song } from "../src/shared/types"

function song(id: number): Song {
  return {
    id,
    sourceIndex: id,
    title: `Song ${id}`,
    type: "DX",
    artist: `Artist ${id}`,
    genre: "舞萌",
    bpm: 150 + id,
    version: "舞萌DX 2024",
    masterDs: 13.7,
    masterLevel: "13+",
    masterDesigner: `Charter ${id}`,
    remasterDs: null,
    remasterLevel: null,
    remasterDesigner: null,
    winRate: 1 - id / 100,
    voteTotal: 100,
    aliases: [],
    tags: [],
  }
}

const songs = Array.from({ length: 8 }, (_, index) => song(index + 1))
const now = new Date("2026-08-20T08:00:00Z")

function manager() {
  let sequence = 0
  return new DailySessionManager(() => `test_token_${String(++sequence).padStart(32, "0")}`)
}

describe("DailySessionManager", () => {
  it("creates and restores a session without exposing the answer", () => {
    const sessions = manager()
    const created = sessions.getOrCreate(songs, undefined, now)
    const restored = sessions.getOrCreate(songs, created.sessionToken, now)

    expect(created).not.toHaveProperty("answer")
    expect(created.guesses).toEqual([])
    expect(restored).toEqual(created)
    expectSessionError(() => sessions.getOrCreate(songs, "missing_token_000000000000000000000000", now), 401, "INVALID_SESSION")
  })

  it("starts a fresh session when a saved token was lost after a server restart", () => {
    const firstServer = manager()
    const saved = firstServer.getOrCreate(songs, undefined, now)
    const restartedServer = new DailySessionManager(() => "restarted_token_000000000000000000000000")

    const restored = restartedServer.restoreOrCreate(songs, saved.sessionToken, now)

    expect(restored.sessionToken).not.toBe(saved.sessionToken)
    expect(restored.guesses).toEqual([])
    expect(restored).not.toHaveProperty("answer")
  })

  it("rejects invalid and duplicate guesses with useful status codes", () => {
    const sessions = manager()
    const created = sessions.getOrCreate(songs, undefined, now)
    const targetId = dailyCatalog.getDaily(songs, now)!.song.id
    const miss = songs.find((candidate) => candidate.id !== targetId)!

    const first = sessions.guess(created.sessionToken, miss.id, now)
    expect(first.gameOver).toBe(false)
    expect(first).not.toHaveProperty("answer")

    expectSessionError(() => sessions.guess(created.sessionToken, miss.id, now), 409, "DUPLICATE_GUESS")
    expectSessionError(() => sessions.guess(created.sessionToken, 999999, now), 422, "INVALID_SONG")
    expectSessionError(() => sessions.guess("unknown", miss.id, now), 401, "INVALID_SESSION")
  })

  it("reveals the answer only after a correct guess", () => {
    const sessions = manager()
    const created = sessions.getOrCreate(songs, undefined, now)
    const target = dailyCatalog.getDaily(songs, now)!.song
    const result = sessions.guess(created.sessionToken, target.id, now)

    expect(result.won).toBe(true)
    expect(result.gameOver).toBe(true)
    expect(result.answer?.id).toBe(target.id)
    expect(sessions.getOrCreate(songs, created.sessionToken, now).answer?.id).toBe(target.id)
    expectSessionError(() => sessions.guess(created.sessionToken, songs[0].id, now), 409, "GAME_OVER")
  })

  it("ends after six misses and does not reveal the answer earlier", () => {
    const sessions = manager()
    const created = sessions.getOrCreate(songs, undefined, now)
    const targetId = dailyCatalog.getDaily(songs, now)!.song.id
    const misses = songs.filter((candidate) => candidate.id !== targetId).slice(0, 6)

    misses.forEach((candidate, index) => {
      const result = sessions.guess(created.sessionToken, candidate.id, now)
      expect(result.gameOver).toBe(index === 5)
      expect(result.answer?.id).toBe(index === 5 ? targetId : undefined)
    })
  })

  it("reveals the answer on give-up and expires sessions at Shanghai midnight", () => {
    const sessions = manager()
    const beforeMidnight = new Date("2026-08-20T15:59:59Z")
    const created = sessions.getOrCreate(songs, undefined, beforeMidnight)
    expect(sessions.giveUp(created.sessionToken, beforeMidnight).answer).toBeDefined()

    const another = sessions.getOrCreate(songs, undefined, beforeMidnight)
    expectSessionError(
      () => sessions.giveUp(another.sessionToken, new Date("2026-08-20T16:00:00Z")),
      410,
      "SESSION_EXPIRED",
    )
  })
})

describe("daily request schemas", () => {
  const token = "A".repeat(43)

  it("accepts strict valid requests", () => {
    expect(dailySchemas.restore.safeParse({ sessionToken: token }).success).toBe(true)
    expect(dailySchemas.guess.safeParse({ sessionToken: token, songId: 12 }).success).toBe(true)
    expect(dailySchemas.giveUp.safeParse({ sessionToken: token }).success).toBe(true)
  })

  it("rejects malformed tokens, song IDs, and unknown fields", () => {
    expect(dailySchemas.restore.safeParse({ sessionToken: "short" }).success).toBe(false)
    expect(dailySchemas.guess.safeParse({ sessionToken: token, songId: -1 }).success).toBe(false)
    expect(dailySchemas.giveUp.safeParse({ sessionToken: token, extra: true }).success).toBe(false)
  })
})

function expectSessionError(action: () => unknown, status: number, code: string) {
  try {
    action()
    throw new Error("Expected DailySessionError")
  } catch (error) {
    expect(error).toBeInstanceOf(DailySessionError)
    expect((error as DailySessionError).status).toBe(status)
    expect((error as DailySessionError).code).toBe(code)
  }
}
