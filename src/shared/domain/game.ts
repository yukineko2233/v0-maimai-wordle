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

export const DAILY_ALGORITHM_VERSION = 3

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

const DESIGNER_SEPARATOR_PATTERN = /[\p{P}\p{Z}\s]+/gu
const UNKNOWN_DESIGNERS = new Set(["未知", "不明", "unknown", "na"])

function normalizeDesigner(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null
  const normalized = value
    .normalize("NFKC")
    .toLowerCase()
    .replace(DESIGNER_SEPARATOR_PATTERN, "")
  return normalized || null
}

function hasCommonDesignerRun(guess: string, target: string, minimumLength = 4): boolean {
  const guessCharacters = Array.from(guess)
  const targetCharacters = Array.from(target)
  if (guessCharacters.length < minimumLength || targetCharacters.length < minimumLength) return false

  for (let guessIndex = 0; guessIndex <= guessCharacters.length - minimumLength; guessIndex++) {
    for (let targetIndex = 0; targetIndex <= targetCharacters.length - minimumLength; targetIndex++) {
      let runLength = 0
      while (
        guessCharacters[guessIndex + runLength] !== undefined &&
        guessCharacters[guessIndex + runLength] === targetCharacters[targetIndex + runLength]
      ) {
        runLength++
        if (runLength >= minimumLength) return true
      }
    }
  }

  return false
}

function compareChartDesigner<T extends string | null>(
  guess: T,
  target: string | null,
  absentWhenBothEmpty = false,
): FieldFeedback<T> {
  const normalizedGuess = normalizeDesigner(guess)
  const normalizedTarget = normalizeDesigner(target)

  if (absentWhenBothEmpty && !normalizedGuess && !normalizedTarget) {
    return { value: guess, status: "absent", direction: "equal" }
  }
  if (guess === target) {
    return { value: guess, status: "exact", direction: "equal" }
  }
  if (
    !normalizedGuess ||
    !normalizedTarget ||
    UNKNOWN_DESIGNERS.has(normalizedGuess) ||
    UNKNOWN_DESIGNERS.has(normalizedTarget)
  ) {
    return { value: guess, status: "miss", direction: "equal" }
  }

  return {
    value: guess,
    status: hasCommonDesignerRun(normalizedGuess, normalizedTarget) ? "close" : "miss",
    direction: "equal",
  }
}

export function evaluateGuess(song: Song, target: Song): GuessFeedback {
  const isTitleMatch = song.title === target.title
  const isTypeMatch = song.type === target.type
  const isArtistMatch = song.artist === target.artist
  const isGenreMatch = song.genre === target.genre

  const bpmFeedback = compareBPM(song.bpm, target.bpm)
  const masterLevelFeedback = compareLevelBands(song.masterLevel, target.masterLevel)
  const masterDesignerFeedback = compareChartDesigner(song.masterDesigner, target.masterDesigner)
  const remasterLevelFeedback = compareLevelBands(song.remasterLevel, target.remasterLevel)
  const versionFeedback = compareVersions(song.version, target.version)
  const remasterDesignerFeedback = compareChartDesigner(
    song.remasterDesigner,
    target.remasterDesigner,
    true,
  )

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
    masterDesignerFeedback.status === "exact" &&
    versionFeedback.status === "exact" &&
    isRemasterMatch

  return {
    song,
    correct: isAllCorrect,
    title: exact(song.title, isTitleMatch),
    type: exact(song.type, isTypeMatch),
    artist: exact(song.artist, isArtistMatch),
    bpm: bpmFeedback,
    genre: exact(song.genre, isGenreMatch),
    masterLevel: { ...masterLevelFeedback, value: song.masterLevel },
    masterDesigner: masterDesignerFeedback,
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

function dailyScore(dateString: string, songId: number): number {
  // FNV-1a over the rendezvous key. Each song has an independent, stable score.
  const key = `${dateString}:${songId}`
  let hash = 0x811c9dc5
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/**
 * 使用 rendezvous hashing 确定每日曲目。顺序不影响结果，曲库变化时只有新增/删除
 * 候选胜出才会重映射，避免 length modulo 导致几乎所有日期漂移。
 */
export function getDailySong(songs: readonly Song[], dateString: string): Song | null {
  if (songs.length === 0) return null
  let selected = songs[0]
  let selectedScore = dailyScore(dateString, selected.id)
  for (let i = 1; i < songs.length; i++) {
    const score = dailyScore(dateString, songs[i].id)
    if (score > selectedScore || (score === selectedScore && songs[i].id < selected.id)) {
      selected = songs[i]
      selectedScore = score
    }
  }
  return selected
}
