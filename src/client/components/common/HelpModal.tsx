import * as Dialog from "@radix-ui/react-dialog"
import { useRef } from "react"
import { X } from "lucide-react"

interface HelpModalProps {
  onClose: () => void
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-dialog-overlay fixed inset-0 z-[99998] bg-black/60 backdrop-blur-xs" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
          }}
          className="motion-dialog fixed left-1/2 top-1/2 z-[99999] max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-auto rounded-2xl bg-white shadow-2xl focus:outline-none"
        >
        <Dialog.Description className="sr-only">舞萌猜歌的玩法、反馈规则与数据来源。</Dialog.Description>
        <div className="p-4 border-b flex justify-between items-center bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-t-2xl">
          <Dialog.Title className="text-xl font-bold">玩法与规则说明</Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="关闭玩法与规则说明"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white cursor-pointer"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>

        <div className="p-6 space-y-5 text-gray-700 text-sm leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">🎮 游戏玩法</h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <span className="font-semibold ">曲库为当前国服版本</span>，不包含日服独占和已删除歌曲，也不计入宴谱。
              </li>
              <li>
                <span className="font-semibold text-gray-900">调整设置</span>：可按版本、流派、Master等级以及热门度筛选，也可以选择预设难度。
              </li>
              <li>
                <span className="font-semibold text-gray-900">开始游戏</span>：系统会在选定范围内随机抽取一首歌曲作为目标答案。
              </li>
              <li>
                <span className="font-semibold text-gray-900">输入猜测</span>：先进行第一次猜测：支持搜索曲名、曲师或别名。
              </li>
              <li>
                <span className="font-semibold text-gray-900">获得反馈</span>：每次猜测后，系统会提示反馈，根据信息进一步猜测，锁定目标！
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
                    相差<span className="font-bold text-purple-900">半级</span>（例如目标为 12+ 时，猜 12 或 13 均判定为接近）；
                  </li>
                  <li>
                    • <span className="font-semibold text-purple-800">Master</span> /{" "}
                    <span className="font-semibold text-purple-600">Re:Master</span> 谱师：
                    存在至少<span className="font-bold text-purple-900">3个</span>连续相同字符（例如目标为 Luxizhel 时，猜 サファ太 vs Luxizhel 或 BELiZHEL 均判定为接近；谱师马甲众多，与实际接近不符的情况难以避免）；
                  </li>
                  <li>• <span className="font-semibold">版本</span>：相差一个版本（例如 maimai MiLK 与 maimai MiLK PLUS 互为接近）。</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-gray-900">方向箭头</span>：
                <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-gray-600">
                  <li>• <span className="text-blue-500 font-bold">↑</span>（向上）：目标值比你猜的<span className="font-semibold text-blue-600">更高 / 应该往高猜</span>；</li>
                  <li>• <span className="text-red-500 font-bold">↓</span>（向下）：目标值比你猜的<span className="font-semibold text-red-600">更低 / 应该往低猜</span>。</li>
                </ul>
              </li>
              <li>
                <span className="font-bold text-purple-800">Master 标签</span>：
                <ul className="list-none pl-4 mt-1 space-y-1 text-xs text-gray-600">
                  <li>• 当猜测曲目<span className="font-bold text-purple-900">Master难度</span>标签与目标曲目一致时显示为<span className="text-green-700 font-bold">绿色高亮</span>。</li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-base font-bold text-gray-900 mb-2">ℹ️ 数据来源</h3>
            <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
              <li>
                曲目数据与官方封面：
                <a
                  href="https://maimai.diving-fish.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Diving-Fish 水鱼查分器
                </a>
              </li>
              <li>
                曲目别名数据库：
                <a
                  href="https://www.yuzuchan.moe/maimaidx/aliases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Yuri-YuzuChaN 柚子的工具箱
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
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-2xl">
          <Dialog.Close asChild>
            <button
              type="button"
              className="min-h-11 px-5 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity cursor-pointer"
            >
              知道了
            </button>
          </Dialog.Close>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
