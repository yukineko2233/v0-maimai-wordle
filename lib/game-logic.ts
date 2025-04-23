import type { GameSettings, Song, Guess } from "@/types/game"

// Update the DEFAULT_SETTINGS for single player mode
export const DEFAULT_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2024",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 10,
  timeLimit: 0, // No time limit for single player
}

// Add multiplayer default settings
export const MULTIPLAYER_DEFAULT_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2024",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
  maxGuesses: 10,
  timeLimit: 90, // 90 seconds for multiplayer
}

// Create preset base settings without time limit and guess count
const PRESET_BASE = {
  versionRange: {
    min: "maimai",
    max: "舞萌DX 2024",
  },
  genres: [],
  masterLevelRange: {
    min: "10+",
    max: "14+",
  },
}

// Keep the existing presets but without time limit and guess count
export const BEGINNER_PRESET = {
  ...PRESET_BASE,
  masterLevelRange: {
    min: "14",
    max: "14+",
  },
  genres: [], // All genres
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
    min: "maimai",
    max: "maimai FiNALE",
  },
}

export const DX_VERSION_PRESET = {
  ...PRESET_BASE,
  versionRange: {
    min: "舞萌DX",
    max: "舞萌DX 2024",
  },
}

// Helper function to apply preset while preserving time limit and guess count
export function applyPresetSettings(currentSettings: GameSettings, preset: any): GameSettings {
  return {
    ...preset,
    maxGuesses: currentSettings.maxGuesses,
    timeLimit: currentSettings.timeLimit,
  }
}

export function getRandomSong(songs: Song[]): Song {
  const randomIndex = Math.floor(Math.random() * songs.length)
  return songs[randomIndex]
}

// Updated to properly handle Re:Master level
export function isGuessCorrect(guess: Guess): boolean {
  if (!guess || !guess.result) {
    return false
  }

  // Check if target song has Re:Master level
  const hasRemaster = !!guess.song.level_remaster && guess.song.level_remaster !== ""

  return (
      guess.result.title &&
      guess.result.type &&
      guess.result.artist &&
      guess.result.bpm.value &&
      guess.result.genre &&
      guess.result.masterLevel.value &&
      guess.result.masterDesigner &&
      // If the target song has a remaster level, check if it matches
      (hasRemaster ? guess.result.remasterLevel.value && guess.result.remasterDesigner : true) &&
      guess.result.version.value
  )
}
