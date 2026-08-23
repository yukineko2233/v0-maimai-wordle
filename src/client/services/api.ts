import type { Guess, Song } from "../../shared/types"
import { buildCatalog, fetchRawCatalogData } from "../../shared/domain/catalog"
import { DAILY_ALGORITHM_VERSION } from "../../shared/domain/game"

const SONGS_CACHE_KEY = "maimai_wordle_songs_v2"
const CACHE_TIME_KEY = "maimai_wordle_songs_time_v2"
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const CACHE_VERSION = 2
const API_TIMEOUT_MS = 10000

let inMemorySongs: Song[] | null = null
let inMemoryIsDegraded = false
let songsRequest: Promise<FetchSongsResult> | null = null

export interface FetchSongsResult {
  songs: Song[]
  /** 是否使用了已过期的本地历史缓存（离线模式） */
  isOfflineCache: boolean
}

function isSong(value: unknown): value is Song {
  if (!value || typeof value !== "object") return false
  const song = value as Song
  return Boolean(
    Number.isFinite(song.id) &&
      Number.isFinite(song.sourceIndex) &&
      typeof song.title === "string" &&
      (song.type === "SD" || song.type === "DX") &&
      typeof song.artist === "string" &&
      typeof song.genre === "string" &&
      Number.isFinite(song.bpm) &&
      typeof song.version === "string" &&
      Number.isFinite(song.masterDs) &&
      typeof song.masterLevel === "string" &&
      typeof song.masterDesigner === "string" &&
      (song.remasterDs === null || Number.isFinite(song.remasterDs)) &&
      (song.remasterLevel === null || typeof song.remasterLevel === "string") &&
      (song.remasterDesigner === null || typeof song.remasterDesigner === "string") &&
      Number.isFinite(song.winRate) &&
      Number.isFinite(song.voteTotal) &&
      Array.isArray(song.aliases) &&
      song.aliases.every((alias) => typeof alias === "string") &&
      Array.isArray(song.tags) &&
      song.tags.every(
        (tag) =>
          tag &&
          Number.isFinite(tag.id) &&
          typeof tag.name === "string" &&
          typeof tag.description === "string" &&
          Number.isFinite(tag.groupId) &&
          typeof tag.groupName === "string" &&
          typeof tag.color === "string",
      ),
  )
}

function isSongList(value: unknown): value is Song[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(isSong)
  )
}

async function fetchJsonWithTimeout(url: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), API_TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
    return await response.json()
  } finally {
    window.clearTimeout(timeout)
  }
}

function readSongsCache(): { songs: Song[]; savedAt: number; complete: boolean } | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(SONGS_CACHE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (parsed && typeof parsed === "object" && "version" in parsed && "songs" in parsed) {
      const cache = parsed as { version: unknown; songs: unknown; savedAt?: unknown; complete?: unknown }
      if ((cache.version !== 1 && cache.version !== CACHE_VERSION) || !isSongList(cache.songs)) return null
      return {
        songs: cache.songs,
        savedAt: typeof cache.savedAt === "number" ? cache.savedAt : 0,
        complete: cache.version === 1 || cache.complete === true,
      }
    }
    // v2 stored the array and timestamp separately.
    if (isSongList(parsed)) {
      return { songs: parsed, savedAt: Number(localStorage.getItem(CACHE_TIME_KEY)) || 0, complete: true }
    }
  } catch (e) {
    console.warn("Failed to load songs from localStorage:", e)
  }
  return null
}

export function fetchSongs(forceRefresh = false): Promise<FetchSongsResult> {
  if (songsRequest) return songsRequest
  const request = fetchSongsInternal(forceRefresh)
  songsRequest = request
  void request.finally(() => {
    if (songsRequest === request) songsRequest = null
  }).catch(() => {})
  return request
}

async function fetchSongsInternal(forceRefresh: boolean): Promise<FetchSongsResult> {
  const persistedCache = readSongsCache()
  const fallbackSongs = inMemorySongs && inMemorySongs.length > 0 ? inMemorySongs : persistedCache?.songs
  if (!forceRefresh && inMemorySongs && inMemorySongs.length > 0) {
    return { songs: inMemorySongs, isOfflineCache: inMemoryIsDegraded }
  }

  // 1. 尝试从 localStorage 恢复（仍在 TTL 内）
  if (!forceRefresh && persistedCache && Date.now() - persistedCache.savedAt < CACHE_TTL_MS) {
    inMemorySongs = persistedCache.songs
    inMemoryIsDegraded = !persistedCache.complete
    return { songs: persistedCache.songs, isOfflineCache: inMemoryIsDegraded }
  }

  // 2. 尝试从同源服务端 API 拉取
  try {
    const songs = await fetchJsonWithTimeout("/api/songs")
    if (isSongList(songs)) {
      saveSongsToCache(songs, true)
      return { songs, isOfflineCache: false }
    }
  } catch (e) {
    console.warn("Failed to fetch songs from /api/songs, falling back to direct upstream fetch:", e)
  }

  // 3. 服务端若不可达，降级由客户端直连上游接口
  try {
    const { musicData, votesData, aliasesData, tagsData } = await fetchRawCatalogData()
    const hasCompleteAuxiliaryData =
      votesData.length > 0 &&
      aliasesData.content.length > 0 &&
      tagsData.tags.length > 0 &&
      tagsData.tagGroups.length > 0 &&
      tagsData.tagSongs.length > 0
    if (!hasCompleteAuxiliaryData && fallbackSongs) {
      inMemorySongs = fallbackSongs
      inMemoryIsDegraded = true
      return { songs: fallbackSongs, isOfflineCache: true }
    }
    const songs = buildCatalog(musicData, votesData, aliasesData, tagsData)
    if (isSongList(songs)) {
      saveSongsToCache(songs, hasCompleteAuxiliaryData)
      return { songs, isOfflineCache: !hasCompleteAuxiliaryData }
    }
  } catch (err) {
    console.error("Direct fetch failed:", err)
  }

  // 4. 全部失败但有历史缓存 → 离线模式（已过期缓存）
  if (fallbackSongs) {
    inMemorySongs = fallbackSongs
    inMemoryIsDegraded = true
    return { songs: fallbackSongs, isOfflineCache: true }
  }

  throw new Error("无法加载曲目数据，请检查网络连接")
}

function saveSongsToCache(songs: Song[], complete: boolean) {
  inMemorySongs = songs
  inMemoryIsDegraded = !complete
  if (typeof window !== "undefined") {
    try {
      const savedAt = Date.now()
      localStorage.setItem(SONGS_CACHE_KEY, JSON.stringify({ version: CACHE_VERSION, savedAt, complete, songs }))
      localStorage.setItem(CACHE_TIME_KEY, String(savedAt))
    } catch (e) {
      console.warn("Failed to save songs to localStorage:", e)
    }
  }
}

export function clearClientCache() {
  inMemorySongs = null
  inMemoryIsDegraded = false
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(SONGS_CACHE_KEY)
      localStorage.removeItem(CACHE_TIME_KEY)
    } catch (e) {}
  }
}

function isGuess(value: unknown): value is Guess {
  if (!value || typeof value !== "object") return false
  const guess = value as Guess
  if (!isSong(guess.song) || !guess.result || typeof guess.result !== "object") return false
  const result = guess.result as unknown as Record<string, unknown>
  const feedbackKeys = [
    "title",
    "type",
    "artist",
    "bpm",
    "genre",
    "masterLevel",
    "masterDesigner",
    "remasterLevel",
    "remasterDesigner",
    "version",
  ]
  const validFeedback = feedbackKeys.every((key) => {
    const feedback = result[key]
    if (!feedback || typeof feedback !== "object") return false
    const field = feedback as Record<string, unknown>
    return (
      ["exact", "close", "miss", "absent"].includes(String(field.status)) &&
      ["higher", "lower", "equal"].includes(String(field.direction))
    )
  })
  return (
    validFeedback &&
    typeof result.correct === "boolean" &&
    isSong(result.song) &&
    Array.isArray(result.tags) &&
    result.tags.every((tag) => tag && typeof tag === "object" && typeof (tag as { shared?: unknown }).shared === "boolean")
  )
}

export interface DailySessionResult {
  date: string
  algorithmVersion: number
  sessionToken: string
  guesses: Guess[]
  gameOver: boolean
  won: boolean
  answer?: Song
}

function parseDailySession(value: unknown): DailySessionResult {
  if (!value || typeof value !== "object") throw new Error("Invalid daily session response")
  const session = value as Record<string, unknown>
  if (
    typeof session.date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(session.date) ||
    session.algorithmVersion !== DAILY_ALGORITHM_VERSION ||
    typeof session.sessionToken !== "string" ||
    !Array.isArray(session.guesses) ||
    !session.guesses.every(isGuess) ||
    typeof session.gameOver !== "boolean" ||
    typeof session.won !== "boolean" ||
    (session.answer !== undefined && !isSong(session.answer)) ||
    (session.gameOver ? !isSong(session.answer) : session.answer !== undefined)
  ) {
    throw new Error("Invalid daily session response")
  }
  return session as unknown as DailySessionResult
}

export async function fetchDailySession(sessionToken?: string): Promise<DailySessionResult> {
  const value = await fetchJsonWithTimeout("/api/daily/session", {
    headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
  })
  return parseDailySession(value)
}

export interface DailyGuessResult {
  guess: Guess
  gameOver: boolean
  won: boolean
  answer?: Song
}

function dailyPost(path: string, body: object): Promise<unknown> {
  return fetchJsonWithTimeout(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

export async function submitDailyGuess(sessionToken: string, songId: number): Promise<DailyGuessResult> {
  const value = await dailyPost("/api/daily/guess", { sessionToken, songId })
  if (!value || typeof value !== "object") throw new Error("Invalid daily guess response")
  const result = value as Record<string, unknown>
  if (
    !isGuess(result.guess) ||
    typeof result.gameOver !== "boolean" ||
    typeof result.won !== "boolean" ||
    (result.answer !== undefined && !isSong(result.answer)) ||
    (result.gameOver ? !isSong(result.answer) : result.answer !== undefined)
  ) {
    throw new Error("Invalid daily guess response")
  }
  return result as unknown as DailyGuessResult
}

export async function giveUpDaily(sessionToken: string): Promise<DailySessionResult> {
  return parseDailySession(await dailyPost("/api/daily/give-up", { sessionToken }))
}
