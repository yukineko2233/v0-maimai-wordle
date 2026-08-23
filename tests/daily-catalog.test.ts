import { describe, expect, it } from "vitest"
import { DailyCatalog } from "../src/server/catalog/daily"
import type { Song } from "../src/shared/types"

function song(id: number, title: string): Song {
  return {
    id,
    sourceIndex: id,
    title,
    type: "DX",
    artist: "Artist",
    genre: "舞萌",
    bpm: 180,
    version: "舞萌DX 2024",
    masterDs: 13.7,
    masterLevel: "13+",
    masterDesigner: "Charter",
    remasterDs: null,
    remasterLevel: null,
    remasterDesigner: null,
    winRate: 0.5,
    voteTotal: 100,
    aliases: [],
    tags: [],
  }
}

describe("DailyCatalog", () => {
  it("keeps the authoritative song locked across same-day catalog refreshes", () => {
    const daily = new DailyCatalog("test-secret")
    const first = daily.getDaily([song(1, "First")], new Date("2026-08-20T00:00:00Z"))
    const afterRefresh = daily.getDaily([song(2, "Replacement")], new Date("2026-08-20T15:59:59Z"))

    expect(first?.song.id).toBe(1)
    expect(afterRefresh).toEqual(first)
  })

  it("selects and locks a new song after Shanghai midnight", () => {
    const daily = new DailyCatalog("test-secret")
    daily.getDaily([song(1, "First")], new Date("2026-08-20T15:59:59Z"))
    const nextDay = daily.getDaily([song(2, "Second")], new Date("2026-08-20T16:00:00Z"))

    expect(nextDay?.date).toBe("2026-08-21")
    expect(nextDay?.song.id).toBe(2)
    expect(nextDay?.algorithmVersion).toBe(3)
  })
})
