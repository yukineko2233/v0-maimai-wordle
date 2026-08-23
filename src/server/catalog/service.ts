import type { Song } from "../../shared/types"
import { buildCatalog, fetchRawCatalogData } from "./fetcher"

class CatalogService {
  private songs: Song[] = []
  private isLoaded = false
  private isFetching = false
  private refreshPromise: Promise<Song[]> | null = null
  private lastUpdated: number | null = null
  private lastError: string | null = null
  private refreshInterval: NodeJS.Timeout | null = null

  async init(): Promise<void> {
    // 每小时在后台刷新一次
    this.refreshInterval = setInterval(() => {
      this.refreshCatalog().catch((err) => {
        console.error("Scheduled catalog refresh failed:", err)
      })
    }, 60 * 60 * 1000)
    await this.refreshCatalog()
  }

  refreshCatalog(): Promise<Song[]> {
    if (this.refreshPromise) return this.refreshPromise
    this.isFetching = true
    const refresh = this.fetchCatalog()
    this.refreshPromise = refresh
    void refresh.finally(() => {
      if (this.refreshPromise === refresh) this.refreshPromise = null
      this.isFetching = false
    }).catch(() => {})
    return refresh
  }

  private async fetchCatalog(): Promise<Song[]> {
    try {
      console.log("Fetching maimai catalog data from upstream APIs...")
      const { musicData, votesData, aliasesData, tagsData } = await fetchRawCatalogData()
      const newSongs = buildCatalog(musicData, votesData, aliasesData, tagsData)

      if (newSongs.length === 0) {
        throw new Error("Upstream catalog produced no supported songs")
      }

      this.songs = newSongs
      this.isLoaded = true
      this.lastUpdated = Date.now()
      this.lastError = null
      console.log(`Successfully built catalog with ${newSongs.length} songs.`)
      return this.songs
    } catch (error) {
      this.lastError = error instanceof Error ? error.message : "Unknown catalog error"
      console.error("Error updating catalog:", error)
      if (this.isLoaded) {
        console.log(`Using existing catalog with ${this.songs.length} songs as fallback.`)
        return this.songs
      }
      throw error
    }
  }

  getSongs(): Song[] {
    return this.songs
  }

  getStatus() {
    return {
      ready: this.isLoaded && this.songs.length > 0,
      loaded: this.isLoaded,
      fetching: this.isFetching,
      songCount: this.songs.length,
      lastUpdated: this.lastUpdated ? new Date(this.lastUpdated).toISOString() : null,
      lastError: this.lastError,
    }
  }

  destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval)
    }
  }
}

export const catalogService = new CatalogService()
