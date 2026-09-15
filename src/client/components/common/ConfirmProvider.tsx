import * as Dialog from "@radix-ui/react-dialog"
import { AlertTriangle } from "lucide-react"
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"

interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  destructive?: boolean
}

type ConfirmRequest = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmRequest | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null)
  const resolverRef = useRef<((confirmed: boolean) => void) | null>(null)

  const settle = useCallback((confirmed: boolean) => {
    const resolver = resolverRef.current
    resolverRef.current = null
    setOptions(null)
    resolver?.(confirmed)
  }, [])

  const requestConfirmation = useCallback<ConfirmRequest>((nextOptions) => {
    resolverRef.current?.(false)
    setOptions(nextOptions)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  useEffect(() => () => resolverRef.current?.(false), [])

  return (
    <ConfirmContext.Provider value={requestConfirmation}>
      {children}
      <Dialog.Root open={Boolean(options)} onOpenChange={(open) => !open && settle(false)}>
        <Dialog.Portal>
          <Dialog.Overlay className="motion-dialog-overlay fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs" />
          <Dialog.Content className="motion-dialog fixed left-1/2 top-1/2 z-[100001] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/60 bg-white p-5 shadow-2xl focus:outline-none">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <AlertTriangle aria-hidden="true" className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <Dialog.Title className="text-base font-bold text-gray-900">
                  {options?.title || "请确认操作"}
                </Dialog.Title>
                <Dialog.Description className="mt-1.5 text-sm leading-6 text-gray-600">
                  {options?.message}
                </Dialog.Description>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className="min-h-11 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors ${
                  options?.destructive ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {options?.confirmLabel || "确定"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) throw new Error("useConfirm must be used within ConfirmProvider")
  return context
}
