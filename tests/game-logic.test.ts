import { describe, it, expect } from "vitest"
import {
  evaluateGuess,
  filterSongs,
  getShanghaiDate,
  getDailySong,
} from "../src/shared/domain/game"
import type { Song } from "../src/shared/types"

const mockSong1: Song = {
  id: 100,
  sourceIndex: 1,
  title: "Garakuta Doll Play",
  type: "SD",
  artist: "t+pazolite",
  genre: "舞萌",
  bpm: 256,
  version: "maimai GreeN",
  masterDs: 14.8,
  masterLevel: "14+",
  masterDesigner: "チャン@DP-NCS",
  remasterDs: 14.9,
  remasterLevel: "14+",
  remasterDesigner: "Jack",
  winRate: 0.85,
  voteTotal: 1000,
  aliases: ["垃圾人", "Garakuta"],
  tags: [
    { id: 1, name: "纵连", description: "", groupId: 1, groupName: "配置", color: "#7dd3fc" },
  ],
}

const mockSong2: Song = {
  id: 101,
  sourceIndex: 2,
  title: "Fragrance",
  type: "SD",
  artist: "Daisuke Anayama",
  genre: "舞萌",
  bpm: 240,
  version: "maimai ORANGE",
  masterDs: 13.9,
  masterLevel: "13+",
  masterDesigner: "ニャイン",
  remasterDs: 14.6,
  remasterLevel: "14+",
  remasterDesigner: "ロシェ@ペンギン",
  winRate: 0.75,
  voteTotal: 500,
  aliases: ["气味"],
  tags: [
    { id: 1, name: "纵连", description: "", groupId: 1, groupName: "配置", color: "#7dd3fc" },
  ],
}

describe("Game Logic & Guess Evaluation", () => {
  it("should evaluate exact match correctly", () => {
    const feedback = evaluateGuess(mockSong1, mockSong1)
    expect(feedback.correct).toBe(true)
    expect(feedback.title.status).toBe("exact")
    expect(feedback.bpm.status).toBe("exact")
    expect(feedback.masterLevel.status).toBe("exact")
    expect(feedback.version.status).toBe("exact")
    expect(feedback.tags[0].shared).toBe(true)
  })

  it("should evaluate close BPM and level", () => {
    const feedback = evaluateGuess(mockSong2, mockSong1)
    expect(feedback.correct).toBe(false)
    expect(feedback.title.status).toBe("miss")
    // BPM: 240 vs 256 -> diff 16 <= 20 -> close
    expect(feedback.bpm.status).toBe("close")
    expect(feedback.bpm.direction).toBe("lower") // 240 < 256
    // Master Level: 13+ vs 14+ -> band diff = 27 - 29 = -2 -> miss
    expect(feedback.masterLevel.status).toBe("miss")
    // Version: ORANGE vs GreeN -> index diff = 4 - 2 = 2 -> miss
    expect(feedback.version.status).toBe("miss")
  })

  it("should filter songs by version, genre, and level range", () => {
    const songs = [mockSong1, mockSong2]
    const filtered = filterSongs(songs, {
      versionRange: { min: "maimai", max: "舞萌DX 2026" },
      genres: ["舞萌"],
      masterLevelRange: { min: "14", max: "15" },
      maxGuesses: 10,
      topSongs: 100,
      timeLimit: 0,
    })
    expect(filtered.length).toBe(1)
    expect(filtered[0].id).toBe(100)
  })

  it("should get consistent daily song for same date", () => {
    const songs = [mockSong1, mockSong2]
    const song1 = getDailySong(songs, "2026-08-20")
    const song2 = getDailySong(songs, "2026-08-20")
    expect(song1).toEqual(song2)
  })

  it("should format Shanghai date correctly", () => {
    const dateStr = getShanghaiDate(new Date())
    expect(/^\d{4}-\d{2}-\d{2}$/.test(dateStr)).toBe(true)
  })
})
