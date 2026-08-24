export type SongType = "SD" | "DX"

export type VersionName =
  | "maimai"
  | "maimai PLUS"
  | "maimai GreeN"
  | "maimai GreeN PLUS"
  | "maimai ORANGE"
  | "maimai ORANGE PLUS"
  | "maimai PiNK"
  | "maimai PiNK PLUS"
  | "maimai MURASAKi"
  | "maimai MURASAKi PLUS"
  | "maimai MiLK"
  | "maimai MiLK PLUS"
  | "maimai FiNALE"
  | "舞萌DX"
  | "舞萌DX 2021"
  | "舞萌DX 2022"
  | "舞萌DX 2023"
  | "舞萌DX 2024"
  | "舞萌DX 2025"
  | "舞萌DX 2026"

export interface SongTag {
  id: number
  name: string
  description: string
  groupId: number
  groupName: string
  color: string
}

export interface Song {
  id: number
  sourceIndex: number
  title: string
  type: SongType
  artist: string
  genre: string
  bpm: number
  version: VersionName
  masterDs: number
  masterLevel: string
  masterDesigner: string
  remasterDs: number | null
  remasterLevel: string | null
  remasterDesigner: string | null
  winRate: number
  voteTotal: number
  aliases: string[]
  tags: SongTag[]
}

export interface GameSettings {
  versionRange: {
    min: VersionName
    max: VersionName
  }
  genres: string[]
  masterLevelRange: {
    min: string
    max: string
  }
  maxGuesses: number
  topSongs: number
  timeLimit: number // in seconds, 0 = unlimited
}

export type FeedbackStatus = "exact" | "close" | "miss" | "absent"
export type Direction = "higher" | "lower" | "equal"

export interface FieldFeedback<T> {
  value: T
  status: FeedbackStatus
  direction: Direction
}

export interface GuessFeedback {
  song: Song
  correct: boolean
  title: FieldFeedback<string>
  type: FieldFeedback<SongType>
  artist: FieldFeedback<string>
  bpm: FieldFeedback<number>
  genre: FieldFeedback<string>
  masterLevel: FieldFeedback<string>
  masterDesigner: FieldFeedback<string>
  remasterLevel: FieldFeedback<string | null>
  remasterDesigner: FieldFeedback<string | null>
  version: FieldFeedback<VersionName>
  tags: Array<SongTag & { shared: boolean }>
}

export interface Guess {
  song: Song
  result: GuessFeedback
}

export interface GameState {
  targetSong: Song | null
  guesses: Guess[]
  gameOver: boolean
  won: boolean
  remainingTime: number
}

export type BestOf = 1 | 3 | 5 | 7 | 9

export interface PlayerRoundState {
  guesses: Guess[]
  gameOver: boolean
  won: boolean
  remainingTime: number
}

export interface PlayerState {
  id: string
  nickname: string
  score: number
  online: boolean
  currentRound: PlayerRoundState
  isReady: boolean
  readyForNextRound: boolean
}

export interface MultiplayerRoom {
  id: string
  host: string
  players: Record<string, PlayerState>
  settings: GameSettings
  bestOf: BestOf
  currentRound: number
  maxRounds: number
  roundsWon: Record<string, number>
  targetSong: Song | null
  /** Server timestamp in milliseconds. Null when the round has no time limit or is not active. */
  roundDeadline: number | null
  /** Server timestamp captured when this room snapshot was created. */
  serverTime: number
  /** Server timestamp for automatic next-round start. */
  nextRoundDeadline: number | null
  /** Server timestamp for the unlimited-match safety limit. */
  matchDeadline: number | null
  filteredSongs: Song[]
  status: "waiting" | "playing" | "finished"
  /** 当前回合是否已经结算过，防止断线等边缘情况触发重复计分 */
  roundSettled: boolean
  winner?: string
  isPublic: boolean
  playerAvatars: Record<string, number>
  allParticipants: Record<
    string,
    {
      id: string
      nickname: string
      score: number
      avatarId: number
    }
  >
}
