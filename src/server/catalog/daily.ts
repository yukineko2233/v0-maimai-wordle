import type { GameSettings, Song } from "../../shared/types"
import {
  DAILY_ALGORITHM_VERSION,
  filterSongs,
  getDailySong,
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

  getDaily(songs: readonly Song[], now = new Date()): DailyCatalogResult | null {
    const date = getShanghaiDate(now)
    if (this.locked?.date === date) return this.locked

    const target = getDailySong(filterDailySongs(songs), date)
    if (!target) return null

    this.locked = { date, algorithmVersion: DAILY_ALGORITHM_VERSION, song: target }
    return this.locked
  }
}

export const dailyCatalog = new DailyCatalog()
