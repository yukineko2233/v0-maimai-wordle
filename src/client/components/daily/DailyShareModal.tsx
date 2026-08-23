import { useRef, useState } from "react"
import * as Dialog from "@radix-ui/react-dialog"
import { Copy, Check, X } from "lucide-react"
import { toast } from "sonner"
import type { Guess } from "../../../shared/types"

interface DailyShareModalProps {
  guesses: Guess[]
  won: boolean
  maxGuesses: number
  date: string
  onClose: () => void
}

export default function DailyShareModal({
  guesses,
  won,
  maxGuesses,
  date,
  onClose,
}: DailyShareModalProps) {
  const [copied, setCopied] = useState(false)
  const returnFocusRef = useRef<HTMLElement | null>(
    typeof document !== "undefined" && document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  )

  const generateShareText = () => {
    const header = `舞萌猜猜呗 每日一首 ${date}\n`
    const result = `${won ? "✅" : "❌"} ${guesses.length}/${maxGuesses}\n\n`

    const guessEmojis = guesses
      .map((guess) => {
        let row = ""
        // Title
        row += guess.result.title.status === "exact" ? "🟩" : "⬜"
        // Type
        row += guess.result.type.status === "exact" ? "🟩" : "⬜"
        // Artist
        row += guess.result.artist.status === "exact" ? "🟩" : "⬜"
        // BPM
        if (guess.result.bpm.status === "exact") row += "🟩"
        else if (guess.result.bpm.status === "close") row += "🟨"
        else row += guess.result.bpm.direction === "higher" ? "⬇️" : "⬆️"
        // Genre
        row += guess.result.genre.status === "exact" ? "🟩" : "⬜"
        // Master Level
        if (guess.result.masterLevel.status === "exact") row += "🟩"
        else if (guess.result.masterLevel.status === "close") row += "🟨"
        else row += guess.result.masterLevel.direction === "higher" ? "⬇️" : "⬆️"
        // Version
        if (guess.result.version.status === "exact") row += "🟩"
        else if (guess.result.version.status === "close") row += "🟨"
        else row += guess.result.version.direction === "higher" ? "⬇️" : "⬆️"

        return row
      })
      .join("\n")

    const footer =
      "\n\n一起猜歌: " +
      (typeof window !== "undefined" ? window.location.origin : "https://maimai.yukineko2233.top/")
    return header + result + guessEmojis + footer
  }

  const shareText = generateShareText()

  const copyToClipboard = async () => {
    // 优先使用现代 Clipboard API；HTTP 私有部署环境下降级使用 execCommand
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(shareText)
      } else {
        // HTTP 环境降级方案
        const textarea = document.createElement("textarea")
        textarea.value = shareText
        textarea.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0"
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        const ok = document.execCommand("copy")
        document.body.removeChild(textarea)
        if (!ok) throw new Error("execCommand failed")
      }
      setCopied(true)
      toast.success("已成功复制到剪贴板！")
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast.error("复制失败，请手动长按选中文字后复制")
    }
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="motion-dialog-overlay fixed inset-0 z-[99998] bg-black/60 backdrop-blur-xs" />
        <Dialog.Content
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus()
          }}
          className="motion-dialog fixed left-1/2 top-1/2 z-[99999] max-h-[90vh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl focus:outline-none"
        >
        <Dialog.Description className="sr-only">查看并复制今日挑战的分享文字。</Dialog.Description>
        <div className="flex justify-between items-center mb-3">
          <Dialog.Title className="font-bold text-gray-900 text-base">分享今日挑战结果</Dialog.Title>
          <Dialog.Close asChild>
            <button
              type="button"
              aria-label="关闭分享结果"
              className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </Dialog.Close>
        </div>

        <div className="bg-gray-100 p-4 rounded-xl font-mono text-xs whitespace-pre-wrap select-all mb-4 text-gray-800 leading-relaxed max-h-60 overflow-y-auto">
          {shareText}
        </div>

        <div className="text-xs text-gray-500 mb-4 space-y-0.5">
          <p>🟩 完全相同 | 🟨 接近 (BPM±20 / 等级±半级 / 版本±1代)</p>
          <p>⬇️ 目标更小/更旧 | ⬆️ 目标更大/更后</p>
        </div>

        <div className="flex justify-end gap-2">
          <Dialog.Close asChild>
            <button
              type="button"
              className="min-h-11 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 cursor-pointer"
            >
              关闭
            </button>
          </Dialog.Close>
          <button
            type="button"
            onClick={copyToClipboard}
            aria-label={copied ? "分享结果已复制" : "复制分享结果文字"}
            className="min-h-11 flex items-center gap-1.5 px-5 py-2 text-xs font-medium text-white bg-gradient-to-r from-green-500 to-teal-500 rounded-lg hover:opacity-90 shadow-xs cursor-pointer"
          >
            {copied ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
            {copied ? "已复制" : "复制文字"}
          </button>
        </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
