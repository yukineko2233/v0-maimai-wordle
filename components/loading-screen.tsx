export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <div className="w-16 h-16 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin mb-4"></div>
      <h2 className="text-xl font-medium text-gray-700">加载中...</h2>
      <p className="text-gray-500 mt-2">正在获取歌曲数据</p>
    </div>
  )
}
