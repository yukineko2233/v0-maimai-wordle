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
                <span className="font-medium">黄色</span> - （BPM、Master等级、Re:Master等级和版本）
              </li>
              <li>
                <span className="font-medium">箭头</span> - （BPM、Master等级、Re:Master等级和版本）：
                <ul className="list-disc pl-5 mt-1">
                  <li>
                    <span className="text-blue-500">↑</span> - 猜高了
                  </li>
                  <li>
                    <span className="text-red-500">↓</span> - 猜低了
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">关于此项目</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <a href="https://github.com/yukineko2233/v0-maimai-wordle" target="_blank" className="text-blue-500" rel="noopener noreferrer">
                  https://github.com/yukineko2233/v0-maimai-wordle
                </a>
              </li>
              <li>
                此项目基于v0.dev AI生成，基于React编写。
              </li>
              <li>
                感谢Diving-Fish提供的
                <a href="https://github.com/Diving-Fish/maimaidx-prober/blob/main/database/zh-api-document.md" target="_blank" className="text-blue-500" rel="noopener noreferrer">
                  曲目数据库
                </a>
              </li>
              <li>
                感谢Yuri-YuzuChaN提供的
                <a href="https://github.com/Yuri-YuzuChaN/SakuraBotDocs/blob/main/docs/api/maimaiDX.md" target="_blank" className="text-blue-500" rel="noopener noreferrer">
                  别名数据库
                </a>
              </li>
              <li>
                这是我第一次接触web开发，如果可以提交PR帮我修bug，非常感谢！
              </li>
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
