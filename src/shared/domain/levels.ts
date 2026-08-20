import type { Direction, FeedbackStatus, FieldFeedback } from "../types"

const LEVEL_PATTERN = /^(\d+)(\+)?$/

/**
 * 将谱面定数转化为带有 .6+ 规则的显示等级
 * 7级及以上定数 >= X.6 的谱面标记为 X+
 */
export function dsToLevel(ds: number): string {
  if (typeof ds !== "number" || isNaN(ds) || ds <= 0) return ""
  const base = Math.floor(ds)
  const decimal = Math.round((ds - base) * 10) / 10
  if (base >= 7 && decimal >= 0.6 - 1e-6) {
    return `${base}+`
  }
  return `${base}`
}

/**
 * 解析等级字符串为半级线性序号 (Rank)
 * 例如: 12 -> 24, 12+ -> 25, 13 -> 26, 13+ -> 27
 */
export function parseLevelBand(level: string): number {
  if (!level) return -1
  const trimmed = level.trim()
  const match = LEVEL_PATTERN.exec(trimmed)
  if (!match) return -1
  const base = parseInt(match[1], 10)
  const isPlus = Boolean(match[2])
  return base * 2 + (isPlus ? 1 : 0)
}

/**
 * 比对猜测等级与目标等级
 * 差值绝对值为 1 时判定为接近 (close)
 * 如目标为 12+ (25)，猜 12 (24) 或 13 (26) 差值绝对值为 1，判定为 close!
 */
export function compareLevelBands(
  guessLevel: string | null | undefined,
  targetLevel: string | null | undefined,
): FieldFeedback<string | null> {
  const gStr = guessLevel ? guessLevel.trim() : null
  const tStr = targetLevel ? targetLevel.trim() : null

  if (!gStr && !tStr) {
    return { value: null, status: "absent", direction: "equal" }
  }
  if (!gStr || !tStr) {
    return { value: gStr, status: "miss", direction: "equal" }
  }

  const gBand = parseLevelBand(gStr)
  const tBand = parseLevelBand(tStr)

  if (gBand === -1 || tBand === -1) {
    return {
      value: gStr,
      status: gStr === tStr ? "exact" : "miss",
      direction: "equal",
    }
  }

  if (gBand === tBand) {
    return { value: gStr, status: "exact", direction: "equal" }
  }

  const isClose = Math.abs(gBand - tBand) === 1
  const direction: Direction = gBand > tBand ? "higher" : "lower"

  return {
    value: gStr,
    status: isClose ? "close" : "miss",
    direction,
  }
}

/**
 * 判断指定等级是否处于 min 与 max 的范围内
 */
export function isLevelInRange(level: string, min: string, max: string): boolean {
  const band = parseLevelBand(level)
  const minBand = parseLevelBand(min)
  const maxBand = parseLevelBand(max)
  if (band === -1 || minBand === -1 || maxBand === -1) return true
  return band >= minBand && band <= maxBand
}

export const ALL_LEVEL_OPTIONS = [
  "10+",
  "11",
  "11+",
  "12",
  "12+",
  "13",
  "13+",
  "14",
  "14+",
  "15",
] as const
