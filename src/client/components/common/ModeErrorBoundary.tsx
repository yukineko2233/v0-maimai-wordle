import { Component, type ErrorInfo, type ReactNode } from "react"

interface ModeErrorBoundaryProps {
  children: ReactNode
  resetKey: string
  onBack: () => void
}

interface ModeErrorBoundaryState {
  failed: boolean
}

export default class ModeErrorBoundary extends Component<ModeErrorBoundaryProps, ModeErrorBoundaryState> {
  state: ModeErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ModeErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Failed to load game mode:", error, info)
  }

  componentDidUpdate(previous: ModeErrorBoundaryProps) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="motion-result rounded-2xl border border-red-200 bg-white/95 p-8 text-center shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">模式加载失败</h2>
        <p className="mt-2 text-sm text-gray-600">网络波动或版本更新导致资源加载失败，请重试。</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={() => window.location.reload()} className="min-h-11 rounded-lg bg-red-600 px-5 text-sm font-semibold text-white hover:bg-red-700">
            重新加载
          </button>
          <button type="button" onClick={this.props.onBack} className="min-h-11 rounded-lg border border-gray-300 bg-white px-5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            返回主菜单
          </button>
        </div>
      </div>
    )
  }
}
