import { describe, expect, it } from "vitest"
import { rankSongSearchResults } from "../src/client/components/game/SearchBox"
import type { Song } from "../src/shared/types"

function song(id: number, title: string, artist = "artist", aliases: string[] = []): Song {
  return {
    id,
    sourceIndex: id,
    title,
    type: "DX",
    artist,
    genre: "舞萌",
    bpm: 120,
    version: "舞萌DX 2026",
    masterDs: 13,
    masterLevel: "13",
    masterDesigner: "designer",
    remasterDs: null,
    remasterLevel: null,
    remasterDesigner: null,
    winRate: 0,
    voteTotal: 0,
    aliases,
    tags: [],
  }
}

describe("song search ranking", () => {
  it("orders exact, prefix, contains, then artist matches", () => {
    const songs = [
      song(1, "unrelated", "target artist"),
      song(2, "a target inside"),
      song(3, "unrelated", "artist", ["target prefix"]),
      song(4, "unrelated", "artist", ["target"]),
      song(5, "target"),
    ]

    expect(rankSongSearchResults(songs, "target").map(({ id }) => id)).toEqual([4, 5, 3, 2, 1])
  })

  it("normalizes full-width text and preserves source order within a rank", () => {
    const songs = [song(1, "ＦＯＯ one"), song(2, "foo two")]

    expect(rankSongSearchResults(songs, "foo").map(({ id }) => id)).toEqual([1, 2])
  })

  it("filters already guessed songs", () => {
    const songs = [song(1, "target one"), song(2, "target two"), song(3, "target three")]

    expect(rankSongSearchResults(songs, "target", [1, 3]).map(({ id }) => id)).toEqual([2])
  })
})
