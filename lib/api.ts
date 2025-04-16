import axios from "axios"
import type { Song } from "@/types/game"

// Fix the song data mapping to handle potential missing properties
export async function fetchSongs(): Promise<Song[]> {
  try {
    const response = await axios.get("https://www.diving-fish.com/api/maimaidxprober/music_data")
    return response.data.map((song: any) => {
      // Ensure all required properties exist
      return {
        id: song.id || 0,
        title: song.title || "Unknown",
        type: song.type || "Unknown",
        artist: song.basic_info?.artist || "Unknown",
        genre: song.basic_info?.genre || "Unknown",
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
