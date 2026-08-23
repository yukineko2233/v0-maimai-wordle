import { useState, useRef } from "react"
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useHover,
  useFocus,
  useDismiss,
  useRole,
  useInteractions,
  FloatingPortal,
} from "@floating-ui/react"
import type { SongTag } from "../../../shared/types"

interface SongTagsProps {
  tags: Array<SongTag & { shared?: boolean }>
}

function TagBadge({ tag }: { tag: SongTag & { shared?: boolean } }) {
  const [isOpen, setIsOpen] = useState(false)

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: "top",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(6),
      flip({ fallbackPlacements: ["bottom", "top-start", "bottom-start"] }),
      shift({ padding: 8 }),
    ],
  })

  const hover = useHover(context, {
    move: false,
    handleClose: null,
  })
  const focus = useFocus(context)
  const dismiss = useDismiss(context, {
    outsidePress: true,
    escapeKey: true,
  })
  const role = useRole(context, { role: "tooltip" })

  const { getReferenceProps, getFloatingProps } = useInteractions([
    hover,
    focus,
    dismiss,
    role,
  ])

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`text-xs px-2 py-0.5 rounded-md font-normal transition-all cursor-pointer border select-none ${
          tag.shared
            ? "text-green-900 bg-green-100 border-green-400 font-semibold ring-1 ring-green-300"
            : "text-gray-700 bg-gray-100/90 border-gray-300 hover:bg-gray-200 active:bg-gray-300"
        }`}
      >
        {tag.name}
      </button>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="motion-tooltip z-[9999] w-64 max-w-[85vw] p-3 rounded-xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700 text-xs select-none"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-pink-300 text-sm">{tag.name}</span>
              {tag.groupName && (
                <span className="text-3xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {tag.groupName}
                </span>
              )}
            </div>
            <div className="text-slate-300 text-xs leading-relaxed whitespace-normal break-words">
              {tag.description || "暂无详细说明"}
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  )
}

export default function SongTags({ tags }: SongTagsProps) {
  if (!tags || tags.length === 0) {
    return <div className="text-xs text-gray-400 italic">无标签数据</div>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <TagBadge key={tag.id} tag={tag} />
      ))}
    </div>
  )
}
