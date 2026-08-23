import { createHmac, randomBytes } from "node:crypto"
import type { GameSettings, Song } from "../../shared/types"
import {
  DAILY_ALGORITHM_VERSION,
  filterSongs,
  getShanghaiDate,
} from "../../shared/domain/game"

const DAILY_SETTINGS: GameSettings = {
  versionRange: { min: "maimai", max: "舞萌DX 2026" },
  genres: [],
  masterLevelRange: { min: "10+", max: "14+" },
  maxGuesses: 6,
  topSongs: 100,
  timeLimit: 0,
}

export function filterDailySongs(songs: readonly Song[]): Song[] {
  return filterSongs(songs, DAILY_SETTINGS)
}

export interface DailyCatalogResult {
  date: string
  algorithmVersion: number
  song: Song
}

export class DailyCatalog {
  private locked: DailyCatalogResult | null = null

  constructor(
    private readonly secret = process.env.DAILY_SECRET?.trim() || randomBytes(32).toString("base64url"),
  ) {}

  getDaily(songs: readonly Song[], now = new Date()): DailyCatalogResult | null {
    const date = getShanghaiDate(now)
    if (this.locked?.date === date) return this.locked

    const target = this.selectSong(filterDailySongs(songs), date)
    if (!target) return null

    this.locked = { date, algorithmVersion: DAILY_ALGORITHM_VERSION, song: target }
    return this.locked
  }

  private selectSong(songs: readonly Song[], date: string): Song | null {
    let selected: Song | null = null
    let highestScore = ""
    for (const song of songs) {
      const score = createHmac("sha256", this.secret).update(`${date}:${song.id}`).digest("hex")
      if (!selected || score > highestScore) {
        selected = song
        highestScore = score
      }
    }
    return selected
  }
}

export const dailyCatalog = new DailyCatalog()
