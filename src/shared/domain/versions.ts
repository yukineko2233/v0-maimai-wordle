import type { Direction, FieldFeedback, VersionName } from "../types"

export const VERSION_ORDER: readonly VersionName[] = [
  "maimai",
  "maimai PLUS",
  "maimai GreeN",
  "maimai GreeN PLUS",
  "maimai ORANGE",
  "maimai ORANGE PLUS",
  "maimai PiNK",
  "maimai PiNK PLUS",
  "maimai MURASAKi",
  "maimai MURASAKi PLUS",
  "maimai MiLK",
  "maimai MiLK PLUS",
  "maimai FiNALE",
  "舞萌DX",
  "舞萌DX 2021",
  "舞萌DX 2022",
  "舞萌DX 2023",
  "舞萌DX 2024",
  "舞萌DX 2025",
  "舞萌DX 2026",
] as const

export const VERSION_SHORT_NAME: Record<VersionName, string> = {
  "maimai": "maimai 真",
  "maimai PLUS": "maimai+ 真",
  "maimai GreeN": "GreeN 超",
  "maimai GreeN PLUS": "GreeN+ 檄",
  "maimai ORANGE": "ORANGE 橙",
  "maimai ORANGE PLUS": "ORANGE+ 晓",
  "maimai PiNK": "PiNK 桃",
  "maimai PiNK PLUS": "PiNK+ 樱",
  "maimai MURASAKi": "MURASAKi 紫",
  "maimai MURASAKi PLUS": "MURASAKi+ 菫",
  "maimai MiLK": "MiLK 白",
  "maimai MiLK PLUS": "MiLK+ 雪",
  "maimai FiNALE": "FiNALE 辉",
  "舞萌DX": "DX 熊/华",
  "舞萌DX 2021": "DX 2021 爽/煌",
  "舞萌DX 2022": "DX 2022 宙/星",
  "舞萌DX 2023": "DX 2023 祭/祝",
  "舞萌DX 2024": "DX 2024 双/宴",
  "舞萌DX 2025": "DX 2025 镜",
  "舞萌DX 2026": "DX 2026 彩",
}

const SOURCE_VERSION_MAP: Record<string, VersionName> = {
  "maimai": "maimai",
  "maimai PLUS": "maimai PLUS",
  "maimai GreeN": "maimai GreeN",
  "maimai GreeN PLUS": "maimai GreeN PLUS",
  "maimai ORANGE": "maimai ORANGE",
  "maimai ORANGE PLUS": "maimai ORANGE PLUS",
  "maimai PiNK": "maimai PiNK",
  "maimai PiNK PLUS": "maimai PiNK PLUS",
  "maimai MURASAKi": "maimai MURASAKi",
  "maimai MURASAKi PLUS": "maimai MURASAKi PLUS",
  "maimai MiLK": "maimai MiLK",
  "MiLK PLUS": "maimai MiLK PLUS",
  "maimai MiLK PLUS": "maimai MiLK PLUS",
  "maimai FiNALE": "maimai FiNALE",
  "maimai でらっくす": "舞萌DX",
  "maimai でらっくす Splash": "舞萌DX 2021",
  "maimai でらっくす UNiVERSE": "舞萌DX 2022",
  "maimai でらっくす FESTiVAL": "舞萌DX 2023",
  "maimai でらっくす BUDDiES": "舞萌DX 2024",
  "maimai でらっくす PRiSM": "舞萌DX 2025",
  "maimai でらっくす PRiSM PLUS": "舞萌DX 2026",
  "舞萌DX": "舞萌DX",
  "舞萌DX 2021": "舞萌DX 2021",
  "舞萌DX 2022": "舞萌DX 2022",
  "舞萌DX 2023": "舞萌DX 2023",
  "舞萌DX 2024": "舞萌DX 2024",
  "舞萌DX 2025": "舞萌DX 2025",
  "舞萌DX 2026": "舞萌DX 2026",
}

export function normalizeVersion(source: string): VersionName | null {
  return SOURCE_VERSION_MAP[source] ?? null
}

export function versionIndex(version: VersionName): number {
  return VERSION_ORDER.indexOf(version)
}

export function compareVersions(guess: VersionName, target: VersionName): FieldFeedback<VersionName> {
  const gIdx = versionIndex(guess)
  const tIdx = versionIndex(target)

  if (gIdx === -1 || tIdx === -1) {
    return {
      value: guess,
      status: guess === target ? "exact" : "miss",
      direction: "equal",
    }
  }

  if (gIdx === tIdx) {
    return {
      value: guess,
      status: "exact",
      direction: "equal",
    }
  }

  const diff = gIdx - tIdx
  const isClose = Math.abs(diff) === 1
  const direction: Direction = diff > 0 ? "higher" : "lower"

  return {
    value: guess,
    status: isClose ? "close" : "miss",
    direction,
  }
}
