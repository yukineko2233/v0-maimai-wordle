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

  it("should handle topSongs >= 2000 as unlimited in filterSongs", () => {
    const songs = [mockSong1, mockSong2]
    const unlimited = filterSongs(songs, {
      versionRange: { min: "maimai", max: "舞萌DX 2026" },
      genres: [],
      masterLevelRange: { min: "10+", max: "14+" },
      maxGuesses: 10,
      topSongs: 2000,
      timeLimit: 0,
    })
    expect(unlimited.length).toBe(2)

    const limited = filterSongs(songs, {
      versionRange: { min: "maimai", max: "舞萌DX 2026" },
      genres: [],
      masterLevelRange: { min: "10+", max: "14+" },
      maxGuesses: 10,
      topSongs: 1,
      timeLimit: 0,
    })
    expect(limited.length).toBe(1)
  })

  it("should build catalog from raw data correctly", async () => {
    const { buildCatalog } = await import("../src/shared/domain/catalog")
    const mockMusicData = [
      {
        id: "100",
        title: "Test Song",
        type: "DX",
        ds: [6.0, 8.5, 11.2, 13.7, 14.8],
        level: ["6", "8+", "11", "13+", "14+"],
        cids: [1, 2, 3, 4, 5],
        charts: [
          { notes: [100] },
          { notes: [200] },
          { notes: [300] },
          { notes: [400], charter: "MasterCharter" },
          { notes: [500], charter: "RemasterCharter" },
        ],
        basic_info: {
          title: "Test Song",
          artist: "Artist",
          genre: "POPSアニメ",
          bpm: 180,
          release_date: "2024-01-01",
          from: "舞萌DX 2024",
          is_new: false,
        },
      },
    ]

    const catalog = buildCatalog(mockMusicData)
    expect(catalog.length).toBe(1)
    expect(catalog[0].id).toBe(100)
    expect(catalog[0].genre).toBe("流行&动漫")
    expect(catalog[0].version).toBe("舞萌DX 2024")
    expect(catalog[0].masterLevel).toBe("13+")
    expect(catalog[0].masterDesigner).toBe("MasterCharter")
    expect(catalog[0].remasterLevel).toBe("14+")
    expect(catalog[0].remasterDesigner).toBe("RemasterCharter")
  })
})

