export interface Song {
  id: number
  title: string
  type: string
  artist: string
  genre: string
  bpm: string
  version: string
  level_master: string
  level_remaster: string
  charts: {
    master: {
      designer: string
    }
    remaster?: {
      designer: string
    }
  }
}

export interface GameSettings {
  versionRange: {
    min: string
    max: string
  }
  genres: string[]
  masterLevelRange: {
    min: string
    max: string
  }
  maxGuesses: number
  timeLimit: number // in seconds, 0 means no limit
}

export interface GuessResult {
  title: boolean
  type: boolean
  artist: boolean
  bpm: {
    value: boolean
    direction: "higher" | "lower" | "equal"
    close: boolean
  }
  genre: boolean
  masterLevel: {
    value: boolean
    direction: "higher" | "lower" | "equal"
    close: boolean
  }
  masterDesigner: boolean
  remasterLevel: {
    value: boolean
    direction: "higher" | "lower" | "equal"
    close: boolean
  }
  remasterDesigner: boolean
  version: {
    value: boolean
    direction: "newer" | "older" | "equal"
    close: boolean
  }
}

export interface Guess {
  song: Song
  result: GuessResult
}

export interface GameState {
  targetSong: Song | null
  guesses: Guess[]
  gameOver: boolean
  won: boolean
  remainingTime: number
}
