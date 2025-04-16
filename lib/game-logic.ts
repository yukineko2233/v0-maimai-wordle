import type { GameSettings, Song, Guess } from "@/types/game"

export const DEFAULT_SETTINGS: GameSettings = {
  versionRange: {
    min: "maimai",
    max: "maimai でらっくす BUDDiES",
  },
  genres: ["流行&动漫", "niconico & VOCALOID", "东方Project", "音击&中二节奏", "其他游戏", "舞萌"],
  masterLevelRange: {
    min: "1",
    max: "14+",
  },
  maxGuesses: 10,
  timeLimit: 0, // 0 means no time limit
}

export const BEGINNER_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  masterLevelRange: {
    min: "14",
    max: "14+",
  },
  genres: [], // All genres
}

export const ANIME_EXPERT_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  genres: ["niconico & VOCALOID"],
}

export const TOUHOU_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  genres: ["东方Project"],
}

export const CASUAL_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  masterLevelRange: {
    min: "8+",
    max: "13+",
  },
}

export const OLD_VERSION_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  versionRange: {
    min: "maimai",
    max: "maimai FiNALE",
  },
}

export const DX_VERSION_PRESET: GameSettings = {
  ...DEFAULT_SETTINGS,
  versionRange: {
    min: "maimai でらっくす",
    max: "maimai でらっくす BUDDiES",
  },
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
