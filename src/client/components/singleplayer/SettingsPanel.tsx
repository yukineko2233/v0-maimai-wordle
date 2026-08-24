import { useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Check, X, RotateCcw } from "lucide-react"
import type { GameSettings, VersionName } from "../../../shared/types"
import { VERSION_ORDER } from "../../../shared/domain/versions"
import { ALL_LEVEL_OPTIONS, parseLevelBand } from "../../../shared/domain/levels"
import {
  DEFAULT_SETTINGS,
  MULTIPLAYER_DEFAULT_SETTINGS,
  BEGINNER_PRESET,
  VOCALOID_EXPERT_PRESET,
  TOUHOU_PRESET,
  CASUAL_PRESET,
  OLD_VERSION_PRESET,
  DX_VERSION_PRESET,
  GENRE_LIST,
  TOP_SONGS_OPTIONS,
  UNLIMITED_TOP_SONGS,
  applyPresetSettings,
} from "../../../shared/domain/presets"

interface SettingsPanelProps {
  settings: GameSettings
  onApply: (settings: GameSettings) => void
  onClose: () => void
  isMultiplayer?: boolean
}

export function validateSettingsRanges(settings: GameSettings) {
  const minVersionIndex = VERSION_ORDER.indexOf(settings.versionRange.min)
  const maxVersionIndex = VERSION_ORDER.indexOf(settings.versionRange.max)
  const minLevelBand = parseLevelBand(settings.masterLevelRange.min)
  const maxLevelBand = parseLevelBand(settings.masterLevelRange.max)

  return {
    versionRange:
      minVersionIndex === -1 || maxVersionIndex === -1
        ? "请选择有效的版本范围"
        : minVersionIndex > maxVersionIndex
          ? "最低版本不能晚于最高版本"
          : null,
    masterLevelRange:
      minLevelBand === -1 || maxLevelBand === -1
        ? "请选择有效的等级范围"
        : minLevelBand > maxLevelBand
          ? "最低等级不能高于最高等级"
          : null,
  }
}

export function haveSameSettings(left: GameSettings, right: GameSettings) {
  const leftGenres = new Set(left.genres)
  const rightGenres = new Set(right.genres)

  return (
    left.versionRange.min === right.versionRange.min &&
    left.versionRange.max === right.versionRange.max &&
    leftGenres.size === rightGenres.size &&
    [...leftGenres].every((genre) => rightGenres.has(genre)) &&
    left.masterLevelRange.min === right.masterLevelRange.min &&
    left.masterLevelRange.max === right.masterLevelRange.max &&
    left.maxGuesses === right.maxGuesses &&
    left.topSongs === right.topSongs &&
    left.timeLimit === right.timeLimit
  )
}

export function getGenreSummary(genres: readonly string[]) {
  return genres.length === 0 ? "全部流派" : `已选${genres.length}项`
}

export default function SettingsPanel({
  settings,
  onApply,
  onClose,
  isMultiplayer = false,
}: SettingsPanelProps) {
  const [current, setCurrent] = useState<GameSettings>({ ...settings })
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  const rangeErrors = validateSettingsRanges(current)
  const hasRangeErrors = Boolean(rangeErrors.versionRange || rangeErrors.masterLevelRange)
  const hasUnappliedChanges = !haveSameSettings(current, settings)
  const allGenres = current.genres.length === 0

  const handleApply = () => {
    if (!hasRangeErrors) onApply(current)
  }

  const applyPreset = (preset: Partial<GameSettings>) => {
    setCurrent(applyPresetSettings(current, preset, isMultiplayer))
  }

  const restoreDefaults = () => {
    if (isMultiplayer) {
      setCurrent({ ...MULTIPLAYER_DEFAULT_SETTINGS })
    } else {
      setCurrent({ ...DEFAULT_SETTINGS })
    }
  }

  // 计算当前热度滑块索引
  const currentTopSongsIndex = (() => {
    const foundIdx = TOP_SONGS_OPTIONS.indexOf(current.topSongs as (typeof TOP_SONGS_OPTIONS)[number])
    if (foundIdx !== -1) return foundIdx
    if (current.topSongs >= 500) return TOP_SONGS_OPTIONS.length - 1
    return 0
  })()

  const requestClose = () => {
    if (hasUnappliedChanges && !window.confirm("设置尚未应用，确定放弃这些更改吗？")) return
    onClose()
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && requestClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-dialog-overlay fixed inset-0 z-[99998] bg-black/60 backdrop-blur-xs" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
          }}
          className="motion-dialog fixed left-1/2 top-1/2 z-[99999] flex h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl focus:outline-none sm:h-auto sm:max-h-[90vh] sm:w-[calc(100%-2rem)]"
        >
        <Dialog.Description className="sr-only">调整歌曲范围、难度、猜测次数与时间限制。</Dialog.Description>
        <div className="z-10 flex shrink-0 items-center justify-between border-b bg-gray-50 p-3 pl-4 sm:p-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Dialog.Title className="shrink-0 text-lg font-bold text-gray-900">游戏设置</Dialog.Title>
            <span
              className={`truncate rounded-full px-2 py-1 text-3xs font-medium ${
                hasUnappliedChanges ? "bg-amber-100 text-amber-800" : "bg-gray-200 text-gray-500"
              }`}
              aria-live="polite"
            >
              {hasUnappliedChanges ? "有未应用更改" : "当前设置已应用"}
            </span>
          </div>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="关闭"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 text-sm text-gray-800 sm:p-6">
          {/* 预设快速选择 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2.5">预设</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(BEGINNER_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-pink-300 bg-pink-50 text-pink-700 font-medium hover:bg-pink-100 transition-colors cursor-pointer text-xs"
                title="前100首热门"
              >
                🌱 入门
              </button>
              <button
                type="button"
                onClick={() => applyPreset(VOCALOID_EXPERT_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 font-medium hover:bg-teal-100 transition-colors cursor-pointer text-xs"
                title="流派: niconico & VOCALOID"
              >
                🎵 术力口高手
              </button>
              <button
                type="button"
                onClick={() => applyPreset(TOUHOU_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors cursor-pointer text-xs"
                title="流派: 东方Project"
              >
                ⛩️ 车万人
              </button>
              <button
                type="button"
                onClick={() => applyPreset(CASUAL_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors cursor-pointer text-xs"
                title="等级: 10+ 至 13+"
              >
                🍰 只猜小歌
              </button>
              <button
                type="button"
                onClick={() => applyPreset(OLD_VERSION_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors cursor-pointer text-xs"
                title="版本: maimai 至 maimai FiNALE"
              >
                📼 仅旧框
              </button>
              <button
                type="button"
                onClick={() => applyPreset(DX_VERSION_PRESET)}
                className="min-h-11 px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors cursor-pointer text-xs"
                title="版本: 舞萌DX 至 舞萌DX 2026"
              >
                ✨ 仅DX框
              </button>
            </div>
          </div>

          {/* 版本范围 */}
          <div className="space-y-2" aria-describedby={rangeErrors.versionRange ? "settings-version-error" : undefined}>
            <h3 className="font-semibold text-gray-900">版本范围 (国服)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-min-version" className="text-xs text-gray-500 block mb-1">最低版本</label>
                <select
                  id="settings-min-version"
                  value={current.versionRange.min}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      versionRange: { ...current.versionRange, min: e.target.value as VersionName },
                    })
                  }
                  aria-invalid={Boolean(rangeErrors.versionRange)}
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-xs focus:outline-none focus:ring-2 ${
                    rangeErrors.versionRange
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-pink-500"
                  }`}
                >
                  {VERSION_ORDER.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="settings-max-version" className="text-xs text-gray-500 block mb-1">最高版本</label>
                <select
                  id="settings-max-version"
                  value={current.versionRange.max}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      versionRange: { ...current.versionRange, max: e.target.value as VersionName },
                    })
                  }
                  aria-invalid={Boolean(rangeErrors.versionRange)}
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-xs focus:outline-none focus:ring-2 ${
                    rangeErrors.versionRange
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-pink-500"
                  }`}
                >
                  {VERSION_ORDER.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {rangeErrors.versionRange && (
              <p id="settings-version-error" role="alert" className="text-xs font-medium text-red-600">
                {rangeErrors.versionRange}
              </p>
            )}
          </div>

          {/* 流派选择 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-gray-900">流派</h3>
              <span id="settings-genre-summary" className="shrink-0 rounded-full bg-pink-50 px-2.5 py-1 text-xs font-semibold text-pink-700" aria-live="polite">
                {getGenreSummary(current.genres)}
              </span>
            </div>
            <button
              type="button"
              aria-pressed={allGenres}
              onClick={() => setCurrent({ ...current, genres: [] })}
              className={`flex min-h-11 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                allGenres
                  ? "border-pink-500 bg-pink-50 text-pink-900"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${allGenres ? "border-pink-500 bg-pink-500 text-white" : "border-gray-300"}`}>
                {allGenres && <Check aria-hidden="true" className="h-3.5 w-3.5" />}
              </span>
              <span>
                <span className="block text-xs font-semibold">全部流派</span>
              </span>
            </button>
            <p className="text-xs text-gray-500">或只勾选想猜的流派</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GENRE_LIST.map((genre) => {
                const isChecked = current.genres.includes(genre)
                return (
                  <label
                    key={genre}
                    className={`min-h-11 flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked ? "border-pink-500 bg-pink-50 text-pink-900 font-medium" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      aria-describedby="settings-genre-summary"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCurrent({ ...current, genres: [...current.genres, genre] })
                        } else {
                          setCurrent({ ...current, genres: current.genres.filter((g) => g !== genre) })
                        }
                      }}
                      className="rounded text-pink-500 focus:ring-pink-500"
                    />
                    <span className="text-xs truncate">{genre}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Master 等级范围 */}
          <div className="space-y-2" aria-describedby={rangeErrors.masterLevelRange ? "settings-level-error" : undefined}>
            <h3 className="font-semibold text-gray-900">Master 等级范围</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="settings-min-master-level" className="text-xs text-gray-500 block mb-1">最低等级</label>
                <select
                  id="settings-min-master-level"
                  value={current.masterLevelRange.min}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      masterLevelRange: { ...current.masterLevelRange, min: e.target.value },
                    })
                  }
                  aria-invalid={Boolean(rangeErrors.masterLevelRange)}
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-xs focus:outline-none focus:ring-2 ${
                    rangeErrors.masterLevelRange
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-pink-500"
                  }`}
                >
                  {ALL_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="settings-max-master-level" className="text-xs text-gray-500 block mb-1">最高等级</label>
                <select
                  id="settings-max-master-level"
                  value={current.masterLevelRange.max}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      masterLevelRange: { ...current.masterLevelRange, max: e.target.value },
                    })
                  }
                  aria-invalid={Boolean(rangeErrors.masterLevelRange)}
                  className={`h-10 w-full rounded-lg border bg-white px-3 text-xs focus:outline-none focus:ring-2 ${
                    rangeErrors.masterLevelRange
                      ? "border-red-400 focus:ring-red-400"
                      : "border-gray-300 focus:ring-pink-500"
                  }`}
                >
                  {ALL_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {rangeErrors.masterLevelRange && (
              <p id="settings-level-error" role="alert" className="text-xs font-medium text-red-600">
                {rangeErrors.masterLevelRange}
              </p>
            )}
          </div>

          {/* 歌曲热度 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <label htmlFor="settings-top-songs" className="font-semibold text-gray-900">歌曲热度范围</label>
              <span id="settings-top-songs-value" className="text-pink-600 font-semibold">
                {current.topSongs >= UNLIMITED_TOP_SONGS
                  ? "无限制"
                  : `前 ${current.topSongs} 首热门歌曲`}
              </span>
            </div>
            <input
              id="settings-top-songs"
              type="range"
              min={0}
              max={TOP_SONGS_OPTIONS.length - 1}
              step={1}
              value={currentTopSongsIndex}
              aria-describedby="settings-top-songs-value"
              aria-valuetext={
                current.topSongs >= UNLIMITED_TOP_SONGS
                  ? "无限制，所有符合条件的歌曲"
                  : `前 ${current.topSongs} 首热门歌曲`
              }
              onChange={(e) => {
                const idx = Number(e.target.value)
                setCurrent({ ...current, topSongs: TOP_SONGS_OPTIONS[idx] })
              }}
              className="min-h-11 w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* 猜测次数与时间限制 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="settings-max-guesses" className="font-semibold text-gray-900">最大猜测次数</label>
                <span id="settings-max-guesses-value" className="text-pink-600 font-bold">{current.maxGuesses} 次</span>
              </div>
              <input
                id="settings-max-guesses"
                type="range"
                min={5}
                max={15}
                step={1}
                value={current.maxGuesses}
                aria-describedby="settings-max-guesses-value"
                aria-valuetext={`${current.maxGuesses} 次`}
                onChange={(e) => setCurrent({ ...current, maxGuesses: Number(e.target.value) })}
                className="min-h-11 w-full accent-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="settings-time-limit" className="font-semibold text-gray-900">时间限制</label>
                <span id="settings-time-limit-value" className="text-pink-600 font-bold">
                  {current.timeLimit === 0 ? "无限时间" : `${current.timeLimit} 秒`}
                </span>
              </div>
              <input
                id="settings-time-limit"
                type="range"
                min={0}
                max={180}
                step={30}
                value={current.timeLimit}
                aria-describedby="settings-time-limit-value"
                aria-valuetext={current.timeLimit === 0 ? "无限时间" : `${current.timeLimit} 秒`}
                onChange={(e) => setCurrent({ ...current, timeLimit: Number(e.target.value) })}
                className="min-h-11 w-full accent-pink-500"
              />
            </div>
          </div>
        </div>

        <div className="z-10 flex shrink-0 flex-col gap-2 border-t bg-gray-50 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <button
            type="button"
            onClick={restoreDefaults}
            className="hidden min-h-11 items-center gap-1 rounded-lg px-3 py-2 text-xs text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 sm:flex"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>

          <div className="flex w-full gap-2 sm:w-auto">
            <button
              type="button"
              onClick={restoreDefaults}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-200 hover:text-gray-900 sm:hidden"
              aria-label="恢复默认设置"
              title="恢复默认"
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </button>
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-h-11 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 sm:flex-none"
              >
                取消
              </button>
            </Dialog.Close>
            <button
              type="button"
              onClick={handleApply}
              disabled={hasRangeErrors}
              aria-describedby={hasRangeErrors ? "settings-apply-error" : undefined}
              className="min-h-11 flex-[1.4] rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-2 text-xs font-medium text-white shadow-xs transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-400 disabled:opacity-60 sm:flex-none"
            >
              应用设置
            </button>
          </div>
          {hasRangeErrors && (
            <p id="settings-apply-error" className="text-center text-3xs font-medium text-red-600 sm:hidden">
              请先修正上方的范围设置
            </p>
          )}
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
