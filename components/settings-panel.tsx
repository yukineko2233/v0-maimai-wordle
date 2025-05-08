import { useState } from "react"
import type { GameSettings } from "@/types/game"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { X, RefreshCw } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BEGINNER_PRESET,
  VOCALOID_EXPERT_PRESET,
  TOUHOU_PRESET,
  CASUAL_PRESET,
  OLD_VERSION_PRESET,
  DX_VERSION_PRESET,
  DEFAULT_SETTINGS,
  MULTIPLAYER_DEFAULT_SETTINGS,
  applyPresetSettings,
} from "@/lib/game-logic"

interface SettingsPanelProps {
  settings: GameSettings
  onApply: (settings: GameSettings) => void
  onClose: () => void
  isMultiplayer: boolean
}

export default function SettingsPanel({ settings, onApply, onClose, isMultiplayer = false }: SettingsPanelProps) {
  const [currentSettings, setCurrentSettings] = useState<GameSettings>({ ...settings })

  const handleApply = () => {
    onApply(currentSettings)
  }

  const applyPreset = (preset: any) => {
    setCurrentSettings(applyPresetSettings(currentSettings, preset))
  }

  const restoreDefaults = () => {
    if (isMultiplayer) {
      setCurrentSettings({ ...MULTIPLAYER_DEFAULT_SETTINGS })
    } else {
      setCurrentSettings({ ...DEFAULT_SETTINGS })
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
    "舞萌DX",
    "舞萌DX 2021",
    "舞萌DX 2022",
    "舞萌DX 2023",
    "舞萌DX 2024",
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
          <div className="mb-4">
            <h3 className="text-lg font-medium mb-2">预设</h3>
            <div className="flex flex-wrap gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(BEGINNER_PRESET)}>
                      入门
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Master等级：14至14+</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(VOCALOID_EXPERT_PRESET)}>
                      术力口高手
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>流派：niconico & VOCALOID</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(TOUHOU_PRESET)}>
                      车万人
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>流派：东方Project</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(CASUAL_PRESET)}>
                      只猜小歌
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Master等级：10+至13+</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(OLD_VERSION_PRESET)}>
                      仅旧框
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>版本：从maimai到maimai FiNALE</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => applyPreset(DX_VERSION_PRESET)}>
                      仅DX框
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>版本：从 舞萌DX 到 舞萌DX 2024</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="space-y-6">
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
                <h3 className="text-lg font-medium mb-2">歌曲热度范围</h3>
                <div >
                    <Label>
                      按歌曲热度筛选: {currentSettings.topSongs > 500? "无限制" : `前${currentSettings.topSongs}首热门歌曲`}
                      </Label>
                    <Slider
                      value={[currentSettings.topSongs]}
                      min={50}
                      max={550}
                      step={50}
                      onValueChange={(value) =>
                        setCurrentSettings({
                          ...currentSettings,
                          topSongs: value[0],
                        })
                      }
                      className="mt-2"
                    />
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
                      max={180}
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
            </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={restoreDefaults}>
            <RefreshCw className="h-3.5 w-3.5" />
            恢复默认
          </Button>
          <Button variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button onClick={handleApply}>应用设置</Button>
        </div>
      </div>
    </div>
  )
}
