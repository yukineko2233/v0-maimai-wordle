/// <reference types="vite/client" />

interface ToyUserProfile {
  nickname: string
  avatar: string
  toyOpenId?: string
}

interface Window {
  toy?: {
    isSupport?(ability: string): Promise<boolean>
    getUserProfile(): Promise<ToyUserProfile>
  }
}
