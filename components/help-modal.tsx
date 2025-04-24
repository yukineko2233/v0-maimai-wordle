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
          <h2 className="text-xl font-bold">帮助</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">游戏玩法</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">调整设置</span>：太难了？先点击设置按钮调下难度；你可以选择一个预设。
              </li>
              <li>
                <span className="font-medium">开始游戏</span>：根据你的设置，系统会从 maimai 曲库中随机选定一首歌曲作为答案。
              </li>
              <li>
                <span className="font-medium">输入猜测</span>：你可以输入任意一首 maimai 歌曲名称（或别名）来进行猜测。
              </li>
              <li>
                <span className="font-medium">获得提示</span>：每次提交猜测后，系统会针对几个属性给出反馈，帮助你缩小范围。
                </li>
              <li>
                <span className="font-medium">继续猜测</span>：根据提示调整下一次的猜测，用完所有机会、计时结束或猜中目标。
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">提示说明</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-green-500">绿色</span> - 该属性与你猜的完全一致。
              </li>
              <li>
                <span className="font-medium text-yellow-500">黄色</span> - 该属性与你猜的“接近”：
                <ul className="list-none pl-5 mt-1">
                  <li>
                    BPM 相差在 ±20 范围内；
                  </li>
                  <li>
                    <span className="text-purple-800">Master</span> 难度或 <span className="text-purple-400">Re:Master</span> 难度相差半级（即一个 + 号）；
                  </li>
                  <li>
                    版本相差一个世代（例如 maimai → maimai PLUS）。
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium">箭头</span>：
                <ul className="list-none pl-5 mt-1">
                  <li>
                    <span className="text-blue-500">↑</span> - 目标值比你猜的更高
                  </li>
                  <li>
                    <span className="text-red-500">↓</span> - 目标值比你猜的更低
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium">标签</span>：
                <ul className="list-none pl-5 mt-1">
                  <li>
                    显示您猜测的曲目的 <span className="text-purple-800">Master</span> 难度的配置、难度和评价标签。
                  </li>
                  <li>
                    当一个标签与目标曲目的属性一致时，该标签会变为<span className="text-green-500">绿色</span>。
                  </li>
                  <li>
                    注意，有些曲目可能未添加标签。
                  </li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">关于此项目</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                本项目使用 v0.dev AI 生成，前端基于 Next.js 开发。
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
                感谢DXRating.net提供的
                <a href="https://dxrating.net/" target="_blank" className="text-blue-500" rel="noopener noreferrer">
                   标签数据库
                </a>
              </li>
              <li>
                这是作者的第一次 Web 开发尝试，非常欢迎提交 Pull Request 来修复 BUG 或优化体验！
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
