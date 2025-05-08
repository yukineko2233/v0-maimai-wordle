import axios from "axios"
import type { Song } from "@/types/game"
import type { Tag, TagGroup, TagSong } from "@/types/game"

// Cache for songs and aliases data
let songsCache: Song[] | null = null
let aliasesCache: Record<number, string[]> | null = null
let songsEtag: string | null = null
let aliasesEtag: string | null = null
let tagsCache: { tags: Tag[]; tagGroups: TagGroup[]; tagSongs: TagSong[] } | null = null

// Function to load data from localStorage on app initialization
export function initializeCache() {
  try {
    // Try to load cached data from localStorage
    const cachedSongsData = localStorage.getItem("songsCache")
    const cachedAliasesData = localStorage.getItem("aliasesCache")
    const cachedSongsEtag = localStorage.getItem("songsEtag")
    const cachedAliasesEtag = localStorage.getItem("aliasesEtag")

    if (cachedSongsData && cachedSongsEtag) {
      songsCache = JSON.parse(cachedSongsData)
      songsEtag = cachedSongsEtag
    }

    if (cachedAliasesData && cachedAliasesEtag) {
      aliasesCache = JSON.parse(cachedAliasesData)
      aliasesEtag = cachedAliasesEtag
    }
  } catch (error) {
    console.error("Error loading cache from localStorage:", error)
    // If there's an error, we'll just fetch fresh data
  }
}

// Add this function after the initializeCache function
export function loadTagsData() {
  try {
    if (tagsCache) {
      return tagsCache
    }

    // In browser environment, fetch the tags data
    if (typeof window !== "undefined") {
      return fetch("/combined-tags.json")
          .then((response) => response.json())
          .then((data) => {
            tagsCache = data
            return data
          })
          .catch((error) => {
            console.error("Error loading tags data:", error)
            return { tags: [], tagGroups: [], tagSongs: [] }
          })
    }

    // In server environment, read the file directly
    return { tags: [], tagGroups: [], tagSongs: [] }
  } catch (error) {
    console.error("Error loading tags data:", error)
    return { tags: [], tagGroups: [], tagSongs: [] }
  }
}

// Fix the song data mapping to handle potential missing properties
export async function fetchSongs(): Promise<Song[]> {
  try {
    // If we already have cached data, return it immediately
    if (songsCache) {
      console.log("Using cached songs data")

      // Fetch in the background to update cache if needed
      refreshSongsCache()

      return songsCache
    }

    // If no cache, fetch fresh data
    return await refreshSongsCache()
  } catch (error) {
    console.error("Error fetching songs:", error)

    // If we have cached data and there was an error fetching, use the cache as fallback
    if (songsCache) {
      console.log("Using cached songs data as fallback after fetch error")
      return songsCache
    }

    throw new Error("Failed to fetch songs data")
  }
}

// Function to refresh the songs cache in the background
async function refreshSongsCache(): Promise<Song[]> {
  try {
    const headers: Record<string, string> = {}
    if (songsEtag) {
      headers["If-None-Match"] = songsEtag
    }

    const response = await axios.get("https://www.diving-fish.com/api/maimaidxprober/music_data", {
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    })

    // If we get a 304, the data hasn't changed, so use the cache
    if (response.status === 304) {
      console.log("Songs data not modified (304)")
      return songsCache!
    }

    // Get the new ETag from the response
    const newEtag = response.headers.etag
    if (newEtag) {
      songsEtag = newEtag
      localStorage.setItem("songsEtag", newEtag)
    }

    // Process the new data
    const processedData = response.data.map((song: any) => {
      // 获取原始 genre
      let genre = song.basic_info?.genre || "Unknown"
      let version = song.basic_info?.from || "Unknown"

      // maimai
      if (genre === "maimai") {
        genre = "\u821e\u840c"
      }

      // niconico
      if (genre === "niconico\u30dc\u30fc\u30ab\u30ed\u30a4\u30c9") {
        genre = "niconico & VOCALOID"
      }

      // 东方
      if (genre === "\u6771\u65b9Project") {
        genre = "\u4e1c\u65b9Project"
      }

      // 流行与动漫
      if (genre === "POPS\u30a2\u30cb\u30e1") {
        genre = "\u6d41\u884c&\u52a8\u6f2b"
      }

      // 音击中二
      if (genre === "\u30aa\u30f3\u30b2\u30adCHUNITHM") {
        genre = "\u97f3\u51fb&\u4e2d\u4e8c\u8282\u594f"
      }

      // 其他游戏
      if (genre === "\u30b2\u30fc\u30e0\u30d0\u30e9\u30a8\u30c6\u30a3") {
        genre = "\u5176\u4ed6\u6e38\u620f"
      }

      // MiLK PLUS
      if (version === "MiLK PLUS") {
        version = "maimai MiLK PLUS"
      }

      if (version === "maimai でらっくす") {
        version = "舞萌DX"
      }

      if (version === "maimai でらっくす Splash") {
        version = "舞萌DX 2021"
      }

      if (version === "maimai でらっくす UNiVERSE") {
        version = "舞萌DX 2022"
      }

      if (version === "maimai でらっくす FESTiVAL") {
        version = "舞萌DX 2023"
      }

      if (version === "maimai でらっくす BUDDiES") {
        version = "舞萌DX 2024"
      }

      // Ensure all required properties exist
      return {
        id: song.id || 0,
        title: song.title || "Unknown",
        type: song.type || "Unknown",
        artist: song.basic_info?.artist || "Unknown",
        genre: genre,
        bpm: song.basic_info?.bpm || "0",
        version: version,
        level_master: song.level && song.level.length > 3 ? song.level[3] : "0",
        level_remaster: song.level && song.level.length > 4 ? song.level[4] : "",
        charts: {
          master: {
            designer:
                song.charts && song.charts.length > 3 && song.charts[3]?.charter ? song.charts[3].charter : "未知",
          },
          remaster:
              song.charts && song.charts.length > 4 && song.charts[4]
                  ? {
                    designer: song.charts[4]?.charter || "未知",
                  }
                  : undefined,
        },
      }
    })
    
    const voteResponse = await axios.get("https://www.diving-fish.com/api/maimaidxprober/vote_result")
    const voteArray: { down_vote: number; music_id: string; total_vote: number }[] = voteResponse.data;
    
    const voteData: Record<string, { down_vote: number; total_vote: number }> = {};
    voteArray.forEach(item => {
      voteData[item.music_id] = {
        down_vote: item.down_vote,
        total_vote: item.total_vote
      };
    });

    const mergedData = processedData.map((song) => {
      const songId = String(song.id); 
      const vote = voteData[songId] || { down_vote: 0, total_vote: 0 };
      const win_rate = vote.total_vote > 0 ? 1 - vote.down_vote / vote.total_vote : 0;
      return { ...song, win_rate };
    });

    // Update the cache
    songsCache = mergedData
    localStorage.setItem("songsCache", JSON.stringify(mergedData))

    return mergedData
  } catch (error) {
    console.error("Error refreshing songs cache:", error)

    // If we have cached data and there was an error fetching, use the cache as fallback
    if (songsCache) {
      return songsCache
    }

    throw error
  }
}

export async function fetchAliases(): Promise<Record<number, string[]>> {
  try {
    // If we already have cached data, return it immediately
    if (aliasesCache) {
      console.log("Using cached aliases data")

      // Fetch in the background to update cache if needed
      refreshAliasesCache()

      return aliasesCache
    }

    // If no cache, fetch fresh data
    return await refreshAliasesCache()
  } catch (error) {
    console.error("Error fetching aliases:", error)

    // If we have cached data and there was an error fetching, use the cache as fallback
    if (aliasesCache) {
      console.log("Using cached aliases data as fallback after fetch error")
      return aliasesCache
    }

    throw new Error("Failed to fetch song aliases")
  }
}

// Function to refresh the aliases cache in the background
async function refreshAliasesCache(): Promise<Record<number, string[]>> {
  try {
    const headers: Record<string, string> = {}
    if (aliasesEtag) {
      headers["If-None-Match"] = aliasesEtag
    }

    const response = await axios.get("https://api.yuzuchan.moe/maimaidx/maimaidxalias", {
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    })

    // If we get a 304, the data hasn't changed, so use the cache
    if (response.status === 304) {
      console.log("Aliases data not modified (304)")
      return aliasesCache!
    }

    // Get the new ETag from the response
    const newEtag = response.headers.etag
    if (newEtag) {
      aliasesEtag = newEtag
      localStorage.setItem("aliasesEtag", newEtag)
    }

    // Transform the data into a map of song ID to aliases
    const aliasMap: Record<number, string[]> = {}

    response.data.content.forEach((item: any) => {
      aliasMap[item.SongID] = item.Alias || []
    })

    // Update the cache
    aliasesCache = aliasMap
    localStorage.setItem("aliasesCache", JSON.stringify(aliasMap))

    return aliasMap
  } catch (error) {
    console.error("Error refreshing aliases cache:", error)

    // If we have cached data and there was an error fetching, use the cache as fallback
    if (aliasesCache) {
      return aliasesCache
    }

    throw error
  }
}

// Function to manually clear the cache and force a refresh
export function clearCache() {
  songsCache = null
  aliasesCache = null
  songsEtag = null
  aliasesEtag = null
  localStorage.removeItem("songsCache")
  localStorage.removeItem("aliasesCache")
  localStorage.removeItem("songsEtag")
  localStorage.removeItem("aliasesEtag")
  console.log("Cache cleared")
}

// Add this function to get tags for a song
export function getSongTags(
    songTitle: string,
    songType: string,
    tagsData: { tags: Tag[]; tagGroups: TagGroup[]; tagSongs: TagSong[] },
) {
  if (!tagsData || !tagsData.tagSongs) {
    return []
  }

  // Convert song type to match the format in tagSongs
  const normalizedType = songType.toLowerCase() === "sd" ? "std" : songType.toLowerCase()

  // Find all tag IDs for this song's master difficulty
  const tagIds = tagsData.tagSongs
      .filter(
          (tagSong) =>
              tagSong.song_id === songTitle &&
              tagSong.sheet_type.toLowerCase() === normalizedType &&
              tagSong.sheet_difficulty === "master",
      )
      .map((tagSong) => tagSong.tag_id)

  // Get the full tag objects for these IDs
  return tagsData.tags
      .filter((tag) => tagIds.includes(tag.id))
      .map((tag) => ({
        ...tag,
        groupColor: tagsData.tagGroups.find((group) => group.id === tag.group_id)?.color || "#cccccc",
      }))
}

// Add this function to compare tags between two songs
export function getSharedTags(
    guessSongTitle: string,
    guessSongType: string,
    targetSongTitle: string,
    targetSongType: string,
    tagsData: { tags: Tag[]; tagGroups: TagGroup[]; tagSongs: TagSong[] },
) {
  const guessTags = getSongTags(guessSongTitle, guessSongType, tagsData)
  const targetTags = getSongTags(targetSongTitle, targetSongType, tagsData)

  const guessTagIds = guessTags.map((tag) => tag.id)
  const targetTagIds = targetTags.map((tag) => tag.id)

  // Mark tags as shared if they exist in both songs
  return guessTags.map((tag) => ({
    ...tag,
    shared: targetTagIds.includes(tag.id),
  }))
}
