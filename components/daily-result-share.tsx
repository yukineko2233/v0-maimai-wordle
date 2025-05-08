"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import type { Guess } from "@/types/game"
import { useLanguage } from "@/lib/i18n/language-context"

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
  const { t } = useLanguage()

  useEffect(() => {
    // Generate the share text
    const generateShareText = () => {
      const header = `${t("shareResultsTitle")} ${date}\n`
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

      const footer = "\n\nhttps://maimai.yukineko2233.top/"

      return header + result + guessEmojis + footer
    }

    setShareText(generateShareText())
  }, [guesses, won, maxGuesses, date, t])

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      toast({
        title: t("copied"),
        description: t("shareDesc"),
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
          <DialogTitle>{t("shareTitle")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col space-y-4">
          <div className="bg-gray-100 p-4 rounded-md whitespace-pre-wrap font-mono text-sm">{shareText}</div>
          <div className="text-sm text-gray-500">
            <p>{t("shareResultsLegend1")}</p>
            <p>🟨 - 接近</p>
            <p>⬇️/⬆️ - 高于/低于目标值</p>
            <p>⬜ - 不匹配</p>
          </div>
        </div>
        <DialogFooter className="sm:justify-start">
          <Button type="button" variant="default" onClick={copyToClipboard} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
