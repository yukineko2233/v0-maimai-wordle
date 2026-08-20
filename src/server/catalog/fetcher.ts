import type { Song, SongTag, SongType } from "../../shared/types"
import { dsToLevel } from "../../shared/domain/levels"
import { normalizeVersion } from "../../shared/domain/versions"

export interface DivingFishSong {
  id: string
  title: string
  type: string
  ds: number[]
  level: string[]
  cids: number[]
  charts: Array<{ notes: number[]; charter?: string }>
  basic_info: {
    title: string
    artist: string
    genre: string
    bpm: number
    release_date: string
    from: string
    is_new: boolean
  }
}

export interface DivingFishVote {
  music_id: string
  total_vote: number
  down_vote: number
}

export interface YuzuChanAliasResponse {
  content: Array<{
    SongID: number
    Name: string
    Alias: string[]
  }>
}

export interface DxRatingTag {
  id: number
  localized_name: Record<string, string>
  localized_description: Record<string, string>
  group_id: number
}

export interface DxRatingTagGroup {
  id: number
  localized_name: Record<string, string>
  color: string
}

export interface DxRatingTagSong {
  song_id: string
  sheet_type: string
  sheet_difficulty: string
  tag_id: number
}

export interface DxRatingTagsResponse {
  tags: DxRatingTag[]
  tagGroups: DxRatingTagGroup[]
  tagSongs: DxRatingTagSong[]
}

function localized(val: Record<string, string> | undefined): string {
  if (!val) return ""
  return val["zh-Hans"] || val.en || val.ja || Object.values(val)[0] || ""
}

function normalizeGenre(genre: string): string {
  if (genre === "maimai") return "舞萌"
  if (genre === "niconicoボーカロイド") return "niconico & VOCALOID"
  if (genre === "東方Project") return "东方Project"
  if (genre === "POPSアニメ") return "流行&动漫"
  if (genre === "オンゲキCHUNITHM") return "音击&中二节奏"
  if (genre === "ゲームバラエティ") return "其他游戏"
  return genre
}

export async function fetchWithTimeout<T>(url: string, timeoutMs = 15000): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: controller.signal })
    if (!res.ok) {
      throw new Error(`HTTP error ${res.status} fetching ${url}`)
    }
    return (await res.json()) as T
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function fetchRawCatalogData() {
  const [musicData, votesData, aliasesData, tagsData] = await Promise.all([
    fetchWithTimeout<DivingFishSong[]>("https://www.diving-fish.com/api/maimaidxprober/music_data"),
    fetchWithTimeout<DivingFishVote[]>("https://www.diving-fish.com/api/maimaidxprober/vote_result").catch(
      (err) => {
        console.warn("Failed to fetch votes, defaulting to empty:", err.message)
        return [] as DivingFishVote[]
      },
    ),
    fetchWithTimeout<YuzuChanAliasResponse>("https://www.yuzuchan.moe/api/maimaidx/maimaidxalias").catch(
      (err) => {
        console.warn("Failed to fetch aliases, defaulting to empty:", err.message)
        return { content: [] } as YuzuChanAliasResponse
      },
    ),
    fetchWithTimeout<DxRatingTagsResponse>("https://miruku.dxrating.net/api/v1/tags").catch(
      (err) => {
        console.warn("Failed to fetch tags, defaulting to empty:", err.message)
        return { tags: [], tagGroups: [], tagSongs: [] } as DxRatingTagsResponse
      },
    ),
  ])

  return { musicData, votesData, aliasesData, tagsData }
}

export function buildCatalog(
  musicData: DivingFishSong[],
  votesData: DivingFishVote[] = [],
  aliasesData: YuzuChanAliasResponse = { content: [] },
  tagsData: DxRatingTagsResponse = { tags: [], tagGroups: [], tagSongs: [] },
): Song[] {
  // 1. 建立投票索引
  const voteMap = new Map<string, { total: number; down: number }>()
  for (const v of votesData) {
    voteMap.set(String(v.music_id), { total: v.total_vote, down: v.down_vote })
  }

  // 2. 建立别名索引 (按 SongID)
  const aliasMap = new Map<number, string[]>()
  if (aliasesData && Array.isArray(aliasesData.content)) {
    for (const item of aliasesData.content) {
      if (item && item.SongID && Array.isArray(item.Alias)) {
        aliasMap.set(Number(item.SongID), item.Alias.map((a) => a.trim()).filter(Boolean))
      }
    }
  }

  // 3. 建立 Master 标签字典 (按 song_id(title) + sheet_type(std/dx))
  const tagGroupMap = new Map<number, { name: string; color: string }>()
  for (const group of tagsData.tagGroups || []) {
    tagGroupMap.set(group.id, {
      name: localized(group.localized_name),
      color: group.color || "#cccccc",
    })
  }

  const tagDefMap = new Map<number, SongTag>()
  for (const tag of tagsData.tags || []) {
    const group = tagGroupMap.get(tag.group_id)
    tagDefMap.set(tag.id, {
      id: tag.id,
      name: localized(tag.localized_name),
      description: localized(tag.localized_description),
      groupId: tag.group_id,
      groupName: group?.name || "",
      color: group?.color || "#cccccc",
    })
  }

  // key = `${song_id}\0${sheet_type}`
  const songTagsMap = new Map<string, SongTag[]>()
  for (const ts of tagsData.tagSongs || []) {
    // 9. 仅考虑 Master 难度标签
    if (ts.sheet_difficulty?.toLowerCase() !== "master") continue
    const sheetType = ts.sheet_type?.toLowerCase() === "sd" ? "std" : ts.sheet_type?.toLowerCase()
    if (sheetType !== "std" && sheetType !== "dx") continue

    const tagDef = tagDefMap.get(ts.tag_id)
    if (!tagDef) continue

    const key = `${ts.song_id}\0${sheetType}`
    const current = songTagsMap.get(key) || []
    if (!current.some((t) => t.id === tagDef.id)) {
      current.push(tagDef)
    }
    songTagsMap.set(key, current)
  }

  const songs: Song[] = []

  musicData.forEach((item, sourceIndex) => {
    const numId = Number(item.id)
    // 7. 当前没有，也不需要考虑曲目id为6位数的宴谱
    if (numId >= 100000 || /^\d{6}$/.test(item.id) || item.basic_info?.genre === "宴会場") {
      return
    }

    const type: SongType = item.type?.toUpperCase() === "DX" ? "DX" : "SD"
    const genre = normalizeGenre(item.basic_info?.genre || "其他游戏")
    const version = normalizeVersion(item.basic_info?.from || "")

    // Master chart (index 3)
    const masterDs = item.ds && item.ds.length > 3 ? item.ds[3] : 0
    const masterLevel = dsToLevel(masterDs) || (item.level && item.level[3]) || "0"
    const masterDesigner = item.charts && item.charts[3]?.charter ? item.charts[3].charter : "未知"

    // Re:Master chart (index 4)
    const hasRemaster = Boolean(item.ds && item.ds.length > 4 && item.charts && item.charts.length > 4)
    const remasterDs = hasRemaster ? item.ds[4] : null
    const remasterLevel = hasRemaster ? dsToLevel(item.ds[4]) || item.level[4] : null
    const remasterDesigner = hasRemaster && item.charts[4]?.charter ? item.charts[4].charter : null

    // 胜率计算
    const vote = voteMap.get(String(item.id))
    const totalVote = vote?.total || 0
    const winRate = totalVote > 0 ? 1 - (vote?.down || 0) / totalVote : 0

    // 别名
    const aliases = aliasMap.get(numId) || []

    // 标签匹配
    const tagSheetType = type === "SD" ? "std" : "dx"
    const tags = songTagsMap.get(`${item.title}\0${tagSheetType}`) || []

    songs.push({
      id: numId,
      sourceIndex,
      title: item.title || "未知曲目",
      type,
      artist: item.basic_info?.artist || "未知曲师",
      genre,
      bpm: Number(item.basic_info?.bpm) || 0,
      version,
      masterDs,
      masterLevel,
      masterDesigner,
      remasterDs,
      remasterLevel,
      remasterDesigner,
      winRate,
      voteTotal: totalVote,
      aliases,
      tags,
    })
  })

  return songs
}
