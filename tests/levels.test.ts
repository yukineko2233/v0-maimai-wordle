import { describe, it, expect } from "vitest"
import {
  dsToLevel,
  parseLevelBand,
  compareLevelBands,
  isLevelInRange,
} from "../src/shared/domain/levels"
import {
  compareVersions,
  normalizeVersion,
  VERSION_ORDER,
} from "../src/shared/domain/versions"
import { BEGINNER_PRESET } from "../src/shared/domain/presets"

describe("Level & Rating System (.6+ Rule & Half-level Close)", () => {
  it("should convert ds to level correctly with .6+ rule", () => {
    // Levels >= 7
    expect(dsToLevel(12.0)).toBe("12")
    expect(dsToLevel(12.5)).toBe("12")
    expect(dsToLevel(12.6)).toBe("12+")
    expect(dsToLevel(12.7)).toBe("12+")
    expect(dsToLevel(12.9)).toBe("12+")
    expect(dsToLevel(14.0)).toBe("14")
    expect(dsToLevel(14.6)).toBe("14+")
    expect(dsToLevel(14.9)).toBe("14+")
    expect(dsToLevel(7.0)).toBe("7")
    expect(dsToLevel(7.5)).toBe("7")
    expect(dsToLevel(7.6)).toBe("7+")

    // Levels < 7 (no + levels)
    expect(dsToLevel(6.0)).toBe("6")
    expect(dsToLevel(6.6)).toBe("6")
    expect(dsToLevel(1.0)).toBe("1")
  })

  it("should calculate level bands correctly", () => {
    expect(parseLevelBand("12")).toBe(24)
    expect(parseLevelBand("12+")).toBe(25)
    expect(parseLevelBand("13")).toBe(26)
    expect(parseLevelBand("13+")).toBe(27)
    expect(parseLevelBand("14")).toBe(28)
    expect(parseLevelBand("14+")).toBe(29)
    expect(parseLevelBand("15")).toBe(30)
  })

  it("should correctly evaluate half-level close differences", () => {
    // Target is 12+ (Band 25)
    const target = "12+"

    // Guess 12+ -> exact
    const res12Plus = compareLevelBands("12+", target)
    expect(res12Plus.status).toBe("exact")
    expect(res12Plus.direction).toBe("equal")

    // Guess 12 -> 1 half-level below -> close & lower (meaning guess < target)
    const res12 = compareLevelBands("12", target)
    expect(res12.status).toBe("close")
    expect(res12.direction).toBe("lower")

    // Guess 13 -> 1 half-level above -> close & higher (meaning guess > target)
    const res13 = compareLevelBands("13", target)
    expect(res13.status).toBe("close")
    expect(res13.direction).toBe("higher")

    // Guess 11+ -> 2 half-levels below -> miss
    const res11Plus = compareLevelBands("11+", target)
    expect(res11Plus.status).toBe("miss")
    expect(res11Plus.direction).toBe("lower")

    // Guess 13+ -> 2 half-levels above -> miss
    const res13Plus = compareLevelBands("13+", target)
    expect(res13Plus.status).toBe("miss")
    expect(res13Plus.direction).toBe("higher")
  })

  it("should test isLevelInRange", () => {
    expect(isLevelInRange("10+", "10+", "15")).toBe(true)
    expect(isLevelInRange("12+", "10+", "14+")).toBe(true)
    expect(isLevelInRange("15", "10+", "14+")).toBe(false)
    expect(isLevelInRange("10", "10+", "14+")).toBe(false)
  })
})

describe("Version Management & Presets", () => {
  it("should include 舞萌DX 2026 in version order", () => {
    expect(VERSION_ORDER).toContain("舞萌DX 2026")
    expect(VERSION_ORDER[VERSION_ORDER.length - 1]).toBe("舞萌DX 2026")
    expect(normalizeVersion("maimai でらっくす PRiSM PLUS")).toBe("舞萌DX 2026")
  })

  it("should compare versions for close distance", () => {
    const target = "舞萌DX 2026"
    expect(compareVersions("舞萌DX 2026", target).status).toBe("exact")
    expect(compareVersions("舞萌DX 2025", target).status).toBe("close")
    expect(compareVersions("舞萌DX 2024", target).status).toBe("miss")
  })

  it("should have correct beginner preset", () => {
    expect(BEGINNER_PRESET.versionRange.min).toBe("maimai")
    expect(BEGINNER_PRESET.versionRange.max).toBe("舞萌DX 2026")
    expect(BEGINNER_PRESET.masterLevelRange.min).toBe("10+")
    expect(BEGINNER_PRESET.masterLevelRange.max).toBe("15")
    expect(BEGINNER_PRESET.topSongs).toBe(100)
  })
})
