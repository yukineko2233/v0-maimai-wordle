"use client"

import { useState } from "react"
import type { GameSettings } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BEGINNER_PRESET,
  ANIME_EXPERT_PRESET,
  TOUHOU_PRESET,
  CASUAL_PRESET,
  OLD_VERSION_PRESET,
  DX_VERSION_PRESET,
} from "@/lib/game-logic"

interface SettingsPanelProps {
  settings: GameSettings
  onApply: (settings: GameSettings) => void
  onClose: () => void
}

export default function SettingsPanel({ settings, onApply, onClose }: SettingsPanelProps) {
  const [currentSettings, setCurrentSettings] = useState<GameSettings>({ ...settings })
  const [activeTab, setActiveTab] = useState<string>("custom")

  const handleApply = () => {
    onApply(currentSettings)
  }

  const applyPreset = (preset: GameSettings) => {
    setCurrentSettings(preset)
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value)

    switch (value) {
      case "beginner":
        applyPreset(BEGINNER_PRESET)
        break
      case "anime":
        applyPreset(ANIME_EXPERT_PRESET)
        break
      case "touhou":
        applyPreset(TOUHOU_PRESET)
        break
      case "casual":
        applyPreset(CASUAL_PRESET)
        break
      case "old":
        applyPreset(OLD_VERSION_PRESET)
        break
      case "dx":
        applyPreset(DX_VERSION_PRESET)
        break
      default:
        break
    }
  }

  const versions = [
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
    "maimai でらっくす",
    "maimai でらっくす PLUS",
    "maimai でらっくす Splash",
    "maimai でらっくす Splash PLUS",
    "maimai でらっくす UNiVERSE",
    "maimai でらっくす UNiVERSE PLUS",
    "maimai でらっくす FESTiVAL",
    "maimai でらっくす FESTiVAL PLUS",
    "maimai でらっくす BUDDiES",
  ]

  const genres = ["流行&动漫", "niconico & VOCALOID", "东方Project", "音击&中二节奏", "其他游戏", "舞萌"]

  const levels = [
    "10+",
    "11",
    "11+",
    "12",
    "12+",
    "13",
    "13+",
    "14",
    "14+",
  ]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">游戏设置</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4">
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex flex-wrap items-start gap-2 p-2 h-auto">
              <TabsTrigger value="custom">自定义</TabsTrigger>
              <TabsTrigger value="beginner">入门</TabsTrigger>
              <TabsTrigger value="anime">二次元高手</TabsTrigger>
              <TabsTrigger value="touhou">车万人</TabsTrigger>
              <TabsTrigger value="casual">小歌高手</TabsTrigger>
              <TabsTrigger value="old">仅旧框</TabsTrigger>
              <TabsTrigger value="dx">仅DX框</TabsTrigger>
            </TabsList>

            <TabsContent value="custom" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">版本范围（国服）</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>最低版本</Label>
                    <Select
                      value={currentSettings.versionRange.min}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          versionRange: {
                            ...currentSettings.versionRange,
                            min: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择最低版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>最高版本</Label>
                    <Select
                      value={currentSettings.versionRange.max}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          versionRange: {
                            ...currentSettings.versionRange,
                            max: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择最高版本" />
                      </SelectTrigger>
                      <SelectContent>
                        {versions.map((version) => (
                          <SelectItem key={version} value={version}>
                            {version}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">流派（全部未选中视为全部包括）</h3>
                <div className="grid grid-cols-2 gap-2">
                  {genres.map((genre) => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Switch
                        id={`genre-${genre}`}
                        checked={currentSettings.genres.includes(genre)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCurrentSettings({
                              ...currentSettings,
                              genres: [...currentSettings.genres, genre],
                            })
                          } else {
                            setCurrentSettings({
                              ...currentSettings,
                              genres: currentSettings.genres.filter((g) => g !== genre),
                            })
                          }
                        }}
                      />
                      <Label htmlFor={`genre-${genre}`}>{genre}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">Master等级范围</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>最低等级</Label>
                    <Select
                      value={currentSettings.masterLevelRange.min}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          masterLevelRange: {
                            ...currentSettings.masterLevelRange,
                            min: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择最低等级" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>最高等级</Label>
                    <Select
                      value={currentSettings.masterLevelRange.max}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          masterLevelRange: {
                            ...currentSettings.masterLevelRange,
                            max: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择最高等级" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-2">游戏设置</h3>
                <div className="space-y-4">
                  <div>
                    <Label>猜测次数: {currentSettings.maxGuesses}</Label>
                    <Slider
                      value={[currentSettings.maxGuesses]}
                      min={5}
                      max={15}
                      step={1}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          maxGuesses: value[0],
                        })
                      }
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>
                      时间限制: {currentSettings.timeLimit === 0 ? "无限制" : `${currentSettings.timeLimit}秒`}
                    </Label>
                    <Slider
                      value={[currentSettings.timeLimit]}
                      min={0}
                      max={120}
                      step={30}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          timeLimit: value[0],
                        })
                      }
                      className="mt-2"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="beginner">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">Master等级：14至14+</p>
              </div>
            </TabsContent>

            <TabsContent value="anime">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">流派：niconico & VOCALOID</p>
              </div>
            </TabsContent>

            <TabsContent value="touhou">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">流派：东方Project</p>
              </div>
            </TabsContent>

            <TabsContent value="casual">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">Master等级：10+至13+</p>
              </div>
            </TabsContent>

            <TabsContent value="old">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">版本：从maimai到maimai FiNALE</p>
              </div>
            </TabsContent>

            <TabsContent value="dx">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mt-1">版本：从maimai でらっくす到maimai でらっくす BUDDiES</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleApply}>应用设置（点击新游戏生效）</Button>
        </div>
      </div>
    </div>
  )
}
