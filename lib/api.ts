import axios from "axios"
import type { Song } from "@/types/game"

// Fix the song data mapping to handle potential missing properties
export async function fetchSongs(): Promise<Song[]> {
  try {
    const response = await axios.get("https://www.diving-fish.com/api/maimaidxprober/music_data")
    return response.data.map((song: any) => {
      // 获取原始 genre
      let genre = song.basic_info?.genre || "Unknown"

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
      if (genre === "\u97f3\u51fb&\u4e2d\u4e8c\u8282\u594f") {
        genre = "\u97f3\u51fb&\u4e2d\u4e8c\u8282\u594f"
      }

      // 其他游戏
      if (genre === "\u30b2\u30fc\u30e0\u30d0\u30e9\u30a8\u30c6\u30a3") {
        genre = "\u5176\u4ed6\u6e38\u620f"
      }

      // Ensure all required properties exist
      return {
        id: song.id || 0,
        title: song.title || "Unknown",
        type: song.type || "Unknown",
        artist: song.basic_info?.artist || "Unknown",
        genre: genre,
        bpm: song.basic_info?.bpm || "0",
        version: song.basic_info?.from || "Unknown",
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
  } catch (error) {
    console.error("Error fetching songs:", error)
    throw new Error("Failed to fetch songs data")
  }
}

export async function fetchAliases(): Promise<Record<number, string[]>> {
  try {
    const response = await axios.get("https://api.yuzuchan.moe/maimaidx/maimaidxalias")

    // Transform the data into a map of song ID to aliases
    const aliasMap: Record<number, string[]> = {}

    response.data.content.forEach((item: any) => {
      aliasMap[item.SongID] = item.Alias || []
    })

    return aliasMap
  } catch (error) {
    console.error("Error fetching aliases:", error)
    throw new Error("Failed to fetch song aliases")
  }
}
