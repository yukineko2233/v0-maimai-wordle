import type {
  Direction,
  FieldFeedback,
  GameSettings,
  Guess,
  GuessFeedback,
  Song,
  SongType,
} from "../types"
import { compareLevelBands, isLevelInRange } from "./levels"
import { compareVersions, versionIndex } from "./versions"

function exact<T>(value: T, matches: boolean): FieldFeedback<T> {
  return {
    value,
    status: matches ? "exact" : "miss",
    direction: "equal",
  }
}

function compareBPM(guess: number, target: number): FieldFeedback<number> {
  if (guess === target) {
    return { value: guess, status: "exact", direction: "equal" }
  }
  const diff = guess - target
  const isClose = Math.abs(diff) <= 20
  const direction: Direction = diff > 0 ? "higher" : "lower"
  return {
    value: guess,
    status: isClose ? "close" : "miss",
    direction,
  }
}

export function evaluateGuess(song: Song, target: Song): GuessFeedback {
  const isTitleMatch = song.title === target.title
  const isTypeMatch = song.type === target.type
  const isArtistMatch = song.artist === target.artist
  const isGenreMatch = song.genre === target.genre
  const isMasterDesignerMatch = song.masterDesigner === target.masterDesigner

  const bpmFeedback = compareBPM(song.bpm, target.bpm)
  const masterLevelFeedback = compareLevelBands(song.masterLevel, target.masterLevel)
  const remasterLevelFeedback = compareLevelBands(song.remasterLevel, target.remasterLevel)
  const versionFeedback = compareVersions(song.version, target.version)

  let remasterDesignerFeedback: FieldFeedback<string | null>
  if (!song.remasterDesigner && !target.remasterDesigner) {
    remasterDesignerFeedback = { value: null, status: "absent", direction: "equal" }
  } else {
    remasterDesignerFeedback = exact(
      song.remasterDesigner,
      Boolean(song.remasterDesigner && song.remasterDesigner === target.remasterDesigner),
    )
  }

  const targetTagIds = new Set(target.tags.map((t) => t.id))
  const tagsWithShared = song.tags.map((tag) => ({
    ...tag,
    shared: targetTagIds.has(tag.id),
  }))

  const hasTargetRemaster = Boolean(target.remasterLevel)
  const isRemasterMatch = hasTargetRemaster
    ? remasterLevelFeedback.status === "exact" && remasterDesignerFeedback.status === "exact"
    : true

  const isAllCorrect =
    isTitleMatch &&
    isTypeMatch &&
    isArtistMatch &&
    isGenreMatch &&
    bpmFeedback.status === "exact" &&
    masterLevelFeedback.status === "exact" &&
    isMasterDesignerMatch &&
    versionFeedback.status === "exact" &&
    isRemasterMatch

  return {
    song,
    correct: isAllCorrect || song.id === target.id,
    title: exact(song.title, isTitleMatch),
    type: exact(song.type, isTypeMatch),
    artist: exact(song.artist, isArtistMatch),
    bpm: bpmFeedback,
    genre: exact(song.genre, isGenreMatch),
    masterLevel: { ...masterLevelFeedback, value: song.masterLevel },
    masterDesigner: exact(song.masterDesigner, isMasterDesignerMatch),
    remasterLevel: remasterLevelFeedback,
    remasterDesigner: remasterDesignerFeedback,
    version: versionFeedback,
    tags: tagsWithShared,
  }
}

export function processGuess(song: Song, targetSong: Song): Guess {
  const result = evaluateGuess(song, targetSong)
  return { song, result }
}

export function isGuessCorrect(guess: Guess | GuessFeedback): boolean {
  if ("result" in guess) {
    return guess.result.correct
  }
  return guess.correct
}

export function filterSongs(songs: readonly Song[], settings: GameSettings): Song[] {
  const minVersion = versionIndex(settings.versionRange.min)
  const maxVersion = versionIndex(settings.versionRange.max)
  if (minVersion === -1 || maxVersion === -1 || minVersion > maxVersion) return []

  const filtered = songs.filter((song) => {
    const vIdx = versionIndex(song.version)
    if (vIdx < minVersion || vIdx > maxVersion) return false
    if (settings.genres.length > 0 && !settings.genres.includes(song.genre)) return false
    if (!isLevelInRange(song.masterLevel, settings.masterLevelRange.min, settings.masterLevelRange.max)) {
      return false
    }
    return true
  })

  // 按胜率降序排序，平分时按原始顺序保序
  const sorted = filtered.sort((a, b) => {
    if (b.winRate !== a.winRate) return b.winRate - a.winRate
    return a.sourceIndex - b.sourceIndex
  })

  if (settings.topSongs && settings.topSongs < 2000) {
    return sorted.slice(0, settings.topSongs)
  }
  return sorted
}

export function getRandomSong(songs: readonly Song[]): Song {
  if (songs.length === 0) {
    throw new Error("Cannot get random song from an empty list")
  }
  const randomIndex = Math.floor(Math.random() * songs.length)
  return songs[randomIndex]
}

/**
 * 获取上海时区 (Asia/Shanghai) 的当前日期字符串 YYYY-MM-DD
 */
export function getShanghaiDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/**
 * 每日一首确定性选题算法
 */
export function getDailySong(songs: readonly Song[], dateString: string): Song | null {
  if (songs.length === 0) return null
  let seed = 0
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed * 31 + dateString.charCodeAt(i)) % 1000000
  }
  return songs[seed % songs.length]
}
