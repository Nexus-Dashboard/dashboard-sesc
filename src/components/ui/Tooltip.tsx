import { useSyncExternalStore, type PointerEvent, type ReactNode } from "react"

// Tooltip único da aplicação: os gráficos chamam showTip/hideTip nos eventos
// de ponteiro e a camada renderiza perto do cursor, sem sair da tela.

interface TipState {
  content: ReactNode
  x: number
  y: number
}

let state: TipState | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function showTip(content: ReactNode, event: { clientX: number; clientY: number }) {
  state = { content, x: event.clientX, y: event.clientY }
  emit()
}

export function hideTip() {
  if (!state) return
  state = null
  emit()
}

export function tipHandlers(content: () => ReactNode) {
  return {
    onPointerEnter: (event: PointerEvent) => showTip(content(), event),
    onPointerMove: (event: PointerEvent) => showTip(content(), event),
    onPointerLeave: hideTip,
  }
}

export function TooltipLayer() {
  const tip = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => state,
  )
  if (!tip) return null

  const width = 260
  const left = Math.min(tip.x + 14, window.innerWidth - width - 12)
  const top = tip.y + 16 + 120 > window.innerHeight ? tip.y - 16 - 110 : tip.y + 16

  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[100] rounded-lg bg-navy-950/95 px-3 py-2 text-xs leading-relaxed text-white shadow-xl ring-1 ring-white/10"
      style={{ left: Math.max(8, left), top, maxWidth: width }}
    >
      {tip.content}
    </div>
  )
}

export function TipRow({ color, label, value }: { color?: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex min-w-0 items-center gap-1.5">
        {color && <span className="h-2 w-2 shrink-0 rounded-sm" style={{ background: color }} />}
        <span className="truncate text-white/80">{label}</span>
      </span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  )
}
