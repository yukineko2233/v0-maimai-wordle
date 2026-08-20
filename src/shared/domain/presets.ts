import type { GameSettings } from "../types"

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
  topSongs: 2000,
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
  topSongs: 200,
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
 * 6. “入门”难度预设：版本 maimai 至 舞萌DX 2026，等级 10+ 到 15，前 100 首热门歌曲
 */
export const BEGINNER_PRESET = {
  ...PRESET_BASE,
  masterLevelRange: {
    min: "10+",
    max: "15",
  },
  genres: [],
  topSongs: 100,
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

export function applyPresetSettings(
  currentSettings: GameSettings,
  preset: Partial<GameSettings>,
): GameSettings {
  return {
    ...currentSettings,
    ...preset,
    // 保留玩家已设置的游戏规则参数，若 preset 明确覆盖某项则采用 preset
    maxGuesses: preset.maxGuesses ?? currentSettings.maxGuesses,
    topSongs: preset.topSongs ?? currentSettings.topSongs,
    timeLimit: preset.timeLimit ?? currentSettings.timeLimit,
  }
}
