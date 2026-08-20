import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, RotateCcw } from "lucide-react"
import type { GameSettings } from "../../../shared/types"
import { VERSION_ORDER } from "../../../shared/domain/versions"
import { ALL_LEVEL_OPTIONS } from "../../../shared/domain/levels"
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
  applyPresetSettings,
} from "../../../shared/domain/presets"

interface SettingsPanelProps {
  settings: GameSettings
  onApply: (settings: GameSettings) => void
  onClose: () => void
  isMultiplayer?: boolean
}

export default function SettingsPanel({
  settings,
  onApply,
  onClose,
  isMultiplayer = false,
}: SettingsPanelProps) {
  const [current, setCurrent] = useState<GameSettings>({ ...settings })

  // 阻止背景滚动
  useEffect(() => {
    const originalStyle = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalStyle
    }
  }, [])

  const handleApply = () => {
    onApply(current)
  }

  const applyPreset = (preset: any) => {
    setCurrent(applyPresetSettings(current, preset))
  }

  const restoreDefaults = () => {
    if (isMultiplayer) {
      setCurrent({ ...MULTIPLAYER_DEFAULT_SETTINGS })
    } else {
      setCurrent({ ...DEFAULT_SETTINGS })
    }
  }

  const content = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">游戏设置</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 text-sm text-gray-800">
          {/* 预设快速选择 */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2.5">常用预设</h3>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset(BEGINNER_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-pink-300 bg-pink-50 text-pink-700 font-medium hover:bg-pink-100 transition-colors cursor-pointer text-xs"
                title="版本: 全版本 | 等级: 10+~15 | 前100首热门"
              >
                🌱 入门推荐 (前100首热门)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(VOCALOID_EXPERT_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-teal-300 bg-teal-50 text-teal-700 font-medium hover:bg-teal-100 transition-colors cursor-pointer text-xs"
                title="流派: niconico & VOCALOID"
              >
                🎵 术力口高手
              </button>
              <button
                type="button"
                onClick={() => applyPreset(TOUHOU_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-red-300 bg-red-50 text-red-700 font-medium hover:bg-red-100 transition-colors cursor-pointer text-xs"
                title="流派: 东方Project"
              >
                ⛩️ 车万人
              </button>
              <button
                type="button"
                onClick={() => applyPreset(CASUAL_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 font-medium hover:bg-indigo-100 transition-colors cursor-pointer text-xs"
                title="等级: 10+ 至 13+"
              >
                🍰 只猜小歌 (10+~13+)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(OLD_VERSION_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 font-medium hover:bg-amber-100 transition-colors cursor-pointer text-xs"
                title="版本: maimai 至 maimai FiNALE"
              >
                📼 仅旧框 (FiNALE及之前)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(DX_VERSION_PRESET)}
                className="px-3 py-1.5 rounded-lg border border-purple-300 bg-purple-50 text-purple-700 font-medium hover:bg-purple-100 transition-colors cursor-pointer text-xs"
                title="版本: 舞萌DX 至 舞萌DX 2026"
              >
                ✨ 仅DX框
              </button>
            </div>
          </div>

          {/* 版本范围 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">版本范围 (国服)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">最低版本</label>
                <select
                  value={current.versionRange.min}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      versionRange: { ...current.versionRange, min: e.target.value as any },
                    })
                  }
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  {VERSION_ORDER.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">最高版本</label>
                <select
                  value={current.versionRange.max}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      versionRange: { ...current.versionRange, max: e.target.value as any },
                    })
                  }
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  {VERSION_ORDER.map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 流派选择 */}
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">
              流派 <span className="text-xs text-gray-500 font-normal">(全部不勾选则代表包含所有流派)</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {GENRE_LIST.map((genre) => {
                const isChecked = current.genres.includes(genre)
                return (
                  <label
                    key={genre}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-all ${
                      isChecked ? "border-pink-500 bg-pink-50 text-pink-900 font-medium" : "border-gray-200 bg-white hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
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
          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">Master 等级范围</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">最低等级</label>
                <select
                  value={current.masterLevelRange.min}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      masterLevelRange: { ...current.masterLevelRange, min: e.target.value },
                    })
                  }
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  {ALL_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">最高等级</label>
                <select
                  value={current.masterLevelRange.max}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      masterLevelRange: { ...current.masterLevelRange, max: e.target.value },
                    })
                  }
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none"
                >
                  {ALL_LEVEL_OPTIONS.map((lvl) => (
                    <option key={lvl} value={lvl}>
                      {lvl}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 歌曲热度 */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-gray-900">歌曲热度范围</span>
              <span className="text-gray-500">
                {current.topSongs >= 500 ? "无限制 (所有符合条件的歌曲)" : `前 ${current.topSongs} 首热门歌曲`}
              </span>
            </div>
            <input
              type="range"
              min={50}
              max={550}
              step={50}
              value={current.topSongs}
              onChange={(e) => setCurrent({ ...current, topSongs: Number(e.target.value) })}
              className="w-full accent-pink-500"
            />
          </div>

          {/* 猜测次数与时间限制 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-900">最大猜测次数</span>
                <span className="text-pink-600 font-bold">{current.maxGuesses} 次</span>
              </div>
              <input
                type="range"
                min={5}
                max={15}
                step={1}
                value={current.maxGuesses}
                onChange={(e) => setCurrent({ ...current, maxGuesses: Number(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-gray-900">时间限制</span>
                <span className="text-pink-600 font-bold">
                  {current.timeLimit === 0 ? "无限时间" : `${current.timeLimit} 秒`}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={180}
                step={30}
                value={current.timeLimit}
                onChange={(e) => setCurrent({ ...current, timeLimit: Number(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex justify-between items-center bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={restoreDefaults}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            恢复默认
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
            >
              应用设置
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return typeof document !== "undefined" ? createPortal(content, document.body) : null
}
