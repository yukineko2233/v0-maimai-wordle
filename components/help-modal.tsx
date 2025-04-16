"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface HelpModalProps {
  onClose: () => void
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">游戏规则</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">游戏目标</h3>
            <p>在有限次数内猜出目标maimai歌曲。每次猜测后，游戏会给出提示，帮助你缩小范围。</p>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">猜测提示</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">绿色</span> - 表示该属性完全正确
              </li>
              <li>
                <span className="font-medium">黄色</span> - 表示该属性接近正确（适用于BPM、Master等级和Re:Master等级）
              </li>
              <li>
                <span className="font-medium">箭头</span> - 对于数值类属性（BPM、Master等级、Re:Master等级和版本）：
                <ul className="list-disc pl-5 mt-1">
                  <li>
                    <span className="text-blue-500">↑</span> - 目标值比你猜的更高
                  </li>
                  <li>
                    <span className="text-red-500">↓</span> - 目标值比你猜的更低
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">游戏属性</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>曲绘 - 歌曲封面图片</li>
              <li>标题 - 歌曲名称</li>
              <li>类型 - 歌曲类型</li>
              <li>曲师 - 歌曲作者</li>
              <li>BPM - 歌曲速度</li>
              <li>Master等级 & Master谱师 - 歌曲Master难度等级和谱面设计师</li>
              <li>Re:Master等级 & Re:Master谱师 - 歌曲Re:Master难度等级和谱面设计师</li>
              <li>流派 - 歌曲所属的音乐类型</li>
              <li>稼动版本 - 歌曲首次出现的游戏版本</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">游戏设置</h3>
            <p>你可以通过设置面板调整游戏参数，包括：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>版本范围 - 限制歌曲的版本范围</li>
              <li>流派选择 - 限制歌曲的音乐类型</li>
              <li>Master等级范围 - 限制歌曲的难度范围</li>
              <li>猜测次数 - 设置每局游戏的最大猜测次数</li>
              <li>时间限制 - 设置每局游戏的时间限制</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">预设模式</h3>
            <p>游戏提供了多种预设模式，适合不同类型的玩家：</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>入门 - Master等级：14至14+</li>
              <li>二次元高手 - 流派：niconico & VOCALOID</li>
              <li>车万人 - 流派：东方Project</li>
              <li>小歌高手 - Master等级：8+至13+</li>
              <li>仅旧框 - 版本：从maimai到maimai FiNALE</li>
              <li>仅DX框 - 版本：从maimai でらっくす到maimai でらっくす BUDDiES</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>了解了</Button>
        </div>
      </div>
    </div>
  )
}
