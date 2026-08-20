const COVER_CACHE_NAME = "maimai-covers-v2"
const memoryUrlCache = new Map<number, string>()

/**
 * 获取曲目封面图（优先使用 Cache Storage API 本地持久化缓存，减少网络流量）
 */
export async function getCachedCoverUrl(songId: number): Promise<string> {
  if (memoryUrlCache.has(songId)) {
    return memoryUrlCache.get(songId)!
  }

  const paddedId = String(songId).padStart(5, "0")
  const remoteUrl = `https://www.diving-fish.com/covers/${paddedId}.png`

  if (typeof window === "undefined" || !("caches" in window)) {
    return remoteUrl
  }

  try {
    const cache = await caches.open(COVER_CACHE_NAME)
    const cachedResponse = await cache.match(remoteUrl)

    if (cachedResponse) {
      const blob = await cachedResponse.blob()
      const objectUrl = URL.createObjectURL(blob)
      memoryUrlCache.set(songId, objectUrl)
      return objectUrl
    }

    // 后台异步请求并放入缓存
    const response = await fetch(remoteUrl, { mode: "cors" })
    if (response.ok) {
      await cache.put(remoteUrl, response.clone())
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      memoryUrlCache.set(songId, objectUrl)
      return objectUrl
    }
  } catch (err) {
    // 发生异常时平滑降级到远程图片
  }

  return remoteUrl
}
