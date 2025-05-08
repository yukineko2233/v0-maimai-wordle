"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Guess } from "@/types/game"

interface DailyResultShareProps {
  guesses: Guess[]
  won: boolean
  maxGuesses: number
  date: string
  onClose: () => void
}

export default function DailyResultShare({ guesses, won, maxGuesses, date, onClose }: DailyResultShareProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()
  const [shareText, setShareText] = useState("")

  useEffect(() => {
    // Generate the share text
    const generateShareText = () => {
      const header = `舞萌猜猜呗之潘一把 每日一首 ${date}\n`
      const result = `${won ? "✅" : "❌"} ${guesses.length}/${maxGuesses}\n\n`

      // Generate emoji grid for guesses
      const guessEmojis = guesses
        .map((guess) => {
          let row = ""

          // Title
          row += guess.result.title ? "🟩" : "⬜"

          // Type
          row += guess.result.type ? "🟩" : "⬜"

          // Artist
          row += guess.result.artist ? "🟩" : "⬜"

          // BPM
          if (guess.result.bpm.value) {
            row += "🟩"
          } else if (guess.result.bpm.close) {
            row += "🟨"
          } else {
            row += guess.result.bpm.direction === "higher" ? "⬇️" : guess.result.bpm.direction === "lower" ? "⬆️" : "⬜"
          }

          // Genre
          row += guess.result.genre ? "🟩" : "⬜"

          // Master Level
          if (guess.result.masterLevel.value) {
            row += "🟩"
          } else if (guess.result.masterLevel.close) {
            row += "🟨"
          } else {
            row +=
              guess.result.masterLevel.direction === "higher"
                ? "⬇️"
                : guess.result.masterLevel.direction === "lower"
                  ? "⬆️"
                  : "⬜"
          }

          // Version
          if (guess.result.version.value) {
            row += "🟩"
          } else if (guess.result.version.close) {
            row += "🟨"
          } else {
            row +=
              guess.result.version.direction === "newer" ? "⬇️" : guess.result.version.direction === "older" ? "⬆️" : "⬜"
          }

          return row
        })
        .join("\n")

      const footer = "\n\nhttps://yukineko2233.top/maimai-wordle"

      return header + result + guessEmojis + footer
    }

    setShareText(generateShareText())
  }, [guesses, won, maxGuesses, date])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast({
        title: "已复制到剪贴板",
        description: "你可以将结果分享给朋友",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      toast({
        title: "复制失败",
        description: "请手动复制结果",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>分享你的每日一首结果</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">{shareText}</div>
          <div className="text-sm text-gray-500">
            <p>🟩 - 完全匹配</p>
            <p>🟨 - 接近</p>
            <p>⬇️/⬆️ - 高于/低于目标值</p>
            <p>⬜ - 不匹配</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="default" onClick={copyToClipboard} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "已复制" : "复制结果"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
