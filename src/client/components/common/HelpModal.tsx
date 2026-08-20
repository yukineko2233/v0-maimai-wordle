import { X } from "lucide-react"

interface HelpModalProps {
  onClose: () => void
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-t-xl">
          <h2 className="text-xl font-bold">玩法与规则说明</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/20 transition-colors text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-gray-700 text-sm leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">🎮 游戏玩法</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <span className="font-semibold text-gray-900">调整设置</span>：可按版本、流派、Master等级以及热门度筛选，也可以选择预设难度。
              </li>
              <li>
                <span className="font-semibold text-gray-900">开始游戏</span>：系统会在选定范围内随机抽取一首歌曲作为目标答案。
              </li>
              <li>
                <span className="font-semibold text-gray-900">输入猜测</span>：支持搜索曲名、曲师、罗马音或别名。
              </li>
              <li>
                <span className="font-semibold text-gray-900">获得反馈</span>：每次猜测后，系统会展示各项属性的准确性，助你逐步锁定目标！
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">🎯 提示反馈规则</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold border border-green-300">
                  绿色
                </span>{" "}
                - 该属性与目标曲目完全一致。
              </li>
              <li>
                <span className="inline-block px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold border border-yellow-300">
                  黄色
                </span>{" "}
                - 该属性与目标曲目<span className="font-bold text-yellow-800">“接近”</span>：
                <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-gray-600">
                  <li>• <span className="font-semibold">BPM</span>：差值在 ±20 范围内；</li>
                  <li>
                    • <span className="font-semibold text-purple-800">Master</span> /{" "}
                    <span className="font-semibold text-purple-600">Re:Master</span> 等级：
                    相差<span className="font-bold text-purple-900">一个半级</span>（例如目标为 12+ 时，猜 12 或 13 均判定为接近；定数自 .6 起计为 + 级）；
                  </li>
                  <li>• <span className="font-semibold">版本</span>：相差一个世代（例如 maimai 与 maimai PLUS 互为接近）。</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-gray-900">方向箭头</span>：
                <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-gray-600">
                  <li>• <span className="text-blue-500 font-bold">↑</span>（向上）：目标值比你猜的<span className="font-semibold text-blue-600">更高 / 更后</span>；</li>
                  <li>• <span className="text-red-500 font-bold">↓</span>（向下）：目标值比你猜的<span className="font-semibold text-red-600">更低 / 更前</span>。</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-purple-800">Master 标签</span>：
                <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-gray-600">
                  <li>• 悬停或点击可查看标签详细释义；当标签与目标曲目一致时显示为<span className="text-green-700 font-bold">绿色高亮</span>。</li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">ℹ️ 数据来源与致谢</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
              <li>
                曲目数据与官方封面：
                <a
                  href="https://github.com/Diving-Fish/maimaidx-prober"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Diving-Fish maimaidx-prober
                </a>
              </li>
              <li>
                曲目别名数据库：
                <a
                  href="https://github.com/Yuri-YuzuChaN/SakuraBotDocs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Yuri-YuzuChaN maimaiDX Alias
                </a>
              </li>
              <li>
                谱面标签数据库：
                <a
                  href="https://dxrating.net/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  DXRating.net
                </a>
              </li>
              <li>
                原作者博客 & 支持：
                <a
                  href="https://yukineko2233.top/2025/04/26/maimai-wordle/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-500 hover:underline font-semibold"
                >
                  Yukineko's Blog
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
          >
            知道了，开始猜歌！
          </button>
        </div>
      </div>
    </div>
  )
}
