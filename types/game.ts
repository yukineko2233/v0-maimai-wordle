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

// New interfaces for multiplayer

export interface PlayerState {
  id: string
  nickname: string
  score: number
  currentRound: {
    guesses: Guess[]
    gameOver: boolean
    won: boolean
    remainingTime: number
  }
  readyForNextRound?: boolean
  isReady?: boolean // 新增：玩家是否准备好开始游戏
}

export interface MultiplayerRoom {
  id: string
  host: string
  players: Record<string, PlayerState>
  settings: GameSettings
  bestOf: number
  currentRound: number
  maxRounds: number
  roundsWon: Record<string, number>
  targetSong: Song
  filteredSongs: Song[]
  status: "waiting" | "playing" | "finished"
  winner?: string
  isPublic: boolean // 新增：是否为公开房间
  playerAvatars: Record<string, number> // 新增：玩家头像映射
}

export interface Tag {
  id: number
  localized_name: {
    [key: string]: string
  }
  localized_description: {
    [key: string]: string
  }
  group_id: number
  groupColor?: string
  shared?: boolean
}

export interface TagGroup {
  id: number
  localized_name: {
    [key: string]: string
  }
  color: string
}

export interface TagSong {
  song_id: string
  sheet_type: string
  sheet_difficulty: string
  tag_id: number
}
