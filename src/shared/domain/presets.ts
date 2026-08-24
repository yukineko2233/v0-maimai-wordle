import type { GameSettings } from "../types"

export const UNLIMITED_TOP_SONGS = 2000
export const TOP_SONGS_OPTIONS = [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 2000] as const

export const DEFAULT_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2026",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 10,
  timeLimit: 0,
  topSongs: UNLIMITED_TOP_SONGS, // 单人模式默认无限制
}

export const MULTIPLAYER_DEFAULT_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2026",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 10,
  topSongs: 200, // 多人模式默认 200 首
  timeLimit: 90,
}

const PRESET_BASE: Pick<GameSettings, "versionRange" | "genres" | "masterLevelRange"> = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2026",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
}

/**
 * 入门推荐预设：版本全范围，等级 10+ 到 14+，前 100 首热门歌曲
 */
export const BEGINNER_PRESET = {
  ...PRESET_BASE,
  topSongs: 100, // 入门预设无论单人还是多人均固定为 100 首
}

export const VOCALOID_EXPERT_PRESET = {
  ...PRESET_BASE,
  genres: ["niconico & VOCALOID"],
}

export const TOUHOU_PRESET = {
  ...PRESET_BASE,
  genres: ["东方Project"],
}

export const CASUAL_PRESET = {
  ...PRESET_BASE,
  masterLevelRange: {
    min: "10+",
    max: "13+",
  },
}

export const OLD_VERSION_PRESET = {
  ...PRESET_BASE,
  versionRange: {
    min: "maimai" as const,
    max: "maimai FiNALE" as const,
  },
}

export const DX_VERSION_PRESET = {
  ...PRESET_BASE,
  versionRange: {
    min: "舞萌DX" as const,
    max: "舞萌DX 2026" as const,
  },
}

export const GENRE_LIST = [
  "流行&动漫",
  "niconico & VOCALOID",
  "东方Project",
  "音击&中二节奏",
  "其他游戏",
  "舞萌",
] as const

/**
 * 应用预设设置：
 * - 入门预设：固定 100 首
 * - 其他预设：单人模式默认为无限制 (2000)，多人模式默认为 200 首
 */
export function applyPresetSettings(
  currentSettings: GameSettings,
  preset: Partial<GameSettings>,
  isMultiplayer = false,
): GameSettings {
  const defaultTopSongs = isMultiplayer ? 200 : UNLIMITED_TOP_SONGS
  return {
    ...currentSettings,
    ...preset,
    maxGuesses: preset.maxGuesses ?? currentSettings.maxGuesses,
    topSongs: preset.topSongs ?? defaultTopSongs,
    timeLimit: preset.timeLimit ?? currentSettings.timeLimit,
  }
}
