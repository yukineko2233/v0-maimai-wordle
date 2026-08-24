import { Loader2 } from "lucide-react"

export default function LoadingScreen({ message = "加载曲库数据中，请稍候..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8 text-center bg-white/90 backdrop-blur-sm rounded-xl shadow-lg">
      <Loader2 className="h-10 w-10 text-pink-500 animate-spin mb-4" />
      <h2 className="text-lg font-medium text-gray-800">{message}</h2>
    </div>
  )
}
