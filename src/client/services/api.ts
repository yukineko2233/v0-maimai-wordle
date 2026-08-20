import type { Song } from "../../shared/types"
import { buildCatalog, fetchRawCatalogData } from "../../server/catalog/fetcher"

const SONGS_CACHE_KEY = "maimai_wordle_songs_v2"
const CACHE_TIME_KEY = "maimai_wordle_songs_time_v2"
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

let inMemorySongs: Song[] | null = null

export async function fetchSongs(forceRefresh = false): Promise<Song[]> {
  if (!forceRefresh && inMemorySongs && inMemorySongs.length > 0) {
    return inMemorySongs
  }

  // 1. 尝试从 localStorage 恢复
  if (!forceRefresh && typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SONGS_CACHE_KEY)
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY)
      if (cached && cachedTime && Date.now() - Number(cachedTime) < CACHE_TTL_MS) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemorySongs = parsed
          return parsed
        }
      }
    } catch (e) {
      console.warn("Failed to load songs from localStorage:", e)
    }
  }

  // 2. 尝试从同源服务端 API 拉取
  try {
    const res = await fetch("/api/songs")
    if (res.ok) {
      const songs = (await res.json()) as Song[]
      if (Array.isArray(songs) && songs.length > 0) {
        saveSongsToCache(songs)
        return songs
      }
    }
  } catch (e) {
    console.warn("Failed to fetch songs from /api/songs, falling back to direct upstream fetch:", e)
  }

  // 3. 服务端若不可达，降级由客户端直连上游接口
  try {
    const { musicData, votesData, aliasesData, tagsData } = await fetchRawCatalogData()
    const songs = buildCatalog(musicData, votesData, aliasesData, tagsData)
    if (songs.length > 0) {
      saveSongsToCache(songs)
      return songs
    }
  } catch (err) {
    console.error("Direct fetch failed:", err)
  }

  // 4. 若全部失败但有历史缓存，使用历史缓存
  if (typeof window !== "undefined") {
    try {
      const cached = localStorage.getItem(SONGS_CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed) && parsed.length > 0) {
          inMemorySongs = parsed
          return parsed
        }
      }
    } catch (e) {}
  }

  throw new Error("无法加载曲目数据，请检查网络连接")
}

function saveSongsToCache(songs: Song[]) {
  inMemorySongs = songs
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(SONGS_CACHE_KEY, JSON.stringify(songs))
      localStorage.setItem(CACHE_TIME_KEY, String(Date.now()))
    } catch (e) {
      console.warn("Failed to save songs to localStorage:", e)
    }
  }
}

export function clearClientCache() {
  inMemorySongs = null
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SONGS_CACHE_KEY)
      localStorage.removeItem(CACHE_TIME_KEY)
    } catch (e) {}
  }
}
