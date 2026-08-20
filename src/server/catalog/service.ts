import type { Song } from "../../shared/types"
import { buildCatalog, fetchRawCatalogData } from "./fetcher"

class CatalogService {
  private songs: Song[] = []
  private isLoaded = false
  private isFetching = false
  private lastUpdated: number | null = null
  private refreshInterval: NodeJS.Timeout | null = null

  async init(): Promise<void> {
    await this.refreshCatalog()
    // 每小时在后台刷新一次
    this.refreshInterval = setInterval(() => {
      this.refreshCatalog().catch((err) => {
        console.error("Scheduled catalog refresh failed:", err)
      })
    }, 60 * 60 * 1000)
  }

  async refreshCatalog(): Promise<Song[]> {
    if (this.isFetching) {
      return this.songs
    }
    this.isFetching = true
    try {
      console.log("Fetching maimai catalog data from upstream APIs...")
      const { musicData, votesData, aliasesData, tagsData } = await fetchRawCatalogData()
      const newSongs = buildCatalog(musicData, votesData, aliasesData, tagsData)

      if (newSongs.length > 0) {
        this.songs = newSongs
        this.isLoaded = true
        this.lastUpdated = Date.now()
        console.log(`Successfully built catalog with ${newSongs.length} songs.`)
      }
      return this.songs
    } catch (error) {
      console.error("Error updating catalog:", error)
      if (this.isLoaded) {
        console.log(`Using existing catalog with ${this.songs.length} songs as fallback.`)
        return this.songs
      }
      throw error
    } finally {
      this.isFetching = false
    }
  }

  getSongs(): Song[] {
    return this.songs
  }

  getStatus() {
    return {
      loaded: this.isLoaded,
      songCount: this.songs.length,
      lastUpdated: this.lastUpdated ? new Date(this.lastUpdated).toISOString() : null,
    }
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  }
}

export const catalogService = new CatalogService()
