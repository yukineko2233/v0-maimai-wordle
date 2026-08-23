import { describe, expect, it } from "vitest"
import {
  getGenreSummary,
  haveSameSettings,
  validateSettingsRanges,
} from "../src/client/components/singleplayer/SettingsPanel"
import { DEFAULT_SETTINGS } from "../src/shared/domain/presets"

describe("SettingsPanel state", () => {
  it("describes an empty genre list as all genres", () => {
    expect(getGenreSummary([])).toBe("全部流派")
    expect(getGenreSummary(["舞萌", "东方Project"])).toBe("已选2项")
  })

  it("compares genre selections without depending on their order", () => {
    const left = { ...DEFAULT_SETTINGS, genres: ["舞萌", "东方Project"] }
    const right = { ...DEFAULT_SETTINGS, genres: ["东方Project", "舞萌"] }

    expect(haveSameSettings(left, right)).toBe(true)
    expect(haveSameSettings(left, { ...right, maxGuesses: right.maxGuesses + 1 })).toBe(false)
  })

  it("rejects reversed version and level ranges", () => {
    const errors = validateSettingsRanges({
      ...DEFAULT_SETTINGS,
      versionRange: { min: "舞萌DX 2026", max: "maimai" },
      masterLevelRange: { min: "14+", max: "10+" },
    })

    expect(errors.versionRange).toBe("最低版本不能晚于最高版本")
    expect(errors.masterLevelRange).toBe("最低等级不能高于最高等级")
  })

  it("accepts inclusive version and level ranges", () => {
    expect(validateSettingsRanges(DEFAULT_SETTINGS)).toEqual({
      versionRange: null,
      masterLevelRange: null,
    })
  })
})
