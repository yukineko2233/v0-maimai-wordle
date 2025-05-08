"use client"

import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { useLanguage } from "@/lib/i18n/language-context"

interface HelpModalProps {
  onClose: () => void
}

export default function HelpModal({ onClose }: HelpModalProps) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold">{t("helpTitle")}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">{t("gameplay")}</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium">{t("adjustSettings")}</span>：{t("adjustSettingsDesc")}
              </li>
              <li>
                <span className="font-medium">{t("startGame")}</span>：{t("startGameDesc")}
              </li>
              <li>
                <span className="font-medium">{t("enterGuess")}</span>：{t("enterGuessDesc")}
              </li>
              <li>
                <span className="font-medium">{t("getHint")}</span>：{t("getHintDesc")}
              </li>
              <li>
                <span className="font-medium">{t("continueGuessing")}</span>：{t("continueGuessingDesc")}
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">{t("hintExplanation")}</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <span className="font-medium text-green-500">{t("green")}</span> - {t("greenDesc")}
              </li>
              <li>
                <span className="font-medium text-yellow-500">{t("yellow")}</span> - {t("yellowDesc")}
                <ul className="list-none pl-5 mt-1">
                  <li>{t("bpmRange")}</li>
                  <li>
                    <span className="text-purple-800">Master</span> {t("masterDifficultyRange")}
                    <span className="text-purple-400">Re:Master</span> {t("reMasterDifficultyRange")}
                  </li>
                  <li>{t("versionDifference")}</li>
                </ul>
              </li>
              <li>
                <span className="font-medium">{t("arrow")}</span>：
                <ul className="list-none pl-5 mt-1">
                  <li>
                    <span className="text-blue-500">↑</span> - {t("higher")}
                  </li>
                  <li>
                    <span className="text-red-500">↓</span> - {t("lower")}
                  </li>
                </ul>
              </li>
              <li>
                <span className="font-medium">{t("tag")}</span>：
                <ul className="list-none pl-5 mt-1">
                  <li>
                    {t("tagDescription")} <span className="text-purple-800">Master</span> {t("masterDifficulty")}
                    {t("configuration")}、{t("difficulty")} {t("and")} {t("evaluationTag")}.
                  </li>
                  <li>
                    {t("tagMatch")} <span className="text-green-500">{t("green")}</span>.
                  </li>
                  <li>{t("tagNote")}</li>
                </ul>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">{t("aboutThisProject")}</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>{t("projectDescription")}</li>
              <li>
                {t("thanksToDivingFish")}
                <a
                  href="https://github.com/Diving-Fish/maimaidx-prober/blob/main/database/zh-api-document.md"
                  target="_blank"
                  className="text-blue-500"
                  rel="noopener noreferrer"
                >
                  {t("songDatabase")}
                </a>
              </li>
              <li>
                {t("thanksToYuri")}
                <a
                  href="https://github.com/Yuri-YuzuChaN/SakuraBotDocs/blob/main/docs/api/maimaiDX.md"
                  target="_blank"
                  className="text-blue-500"
                  rel="noopener noreferrer"
                >
                  {t("aliasDatabase")}
                </a>
              </li>
              <li>
                {t("thanksToDXRating")}
                <a href="https://dxrating.net/" target="_blank" className="text-blue-500" rel="noopener noreferrer">
                  {t("tagDatabase")}
                </a>
              </li>
              <li>
                {t("firstWebDevAttempt")}
                <a
                  href="https://yukineko2233.top/2025/04/26/maimai-wordle/"
                  target="_blank"
                  className="text-blue-500"
                  rel="noopener noreferrer"
                >
                  {t("viewMoreAndSponsor")}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t flex justify-end">
          <Button onClick={onClose}>{t("gotIt")}</Button>
        </div>
      </div>
    </div>
  )
}
