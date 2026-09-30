import clsx from "clsx"
import { AlertTriangle, Loader2 } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-2xl border border-line bg-white shadow-card", className)}>{children}</section>
}

interface SegmentedOption<T extends string | number> {
  value: T
  label: ReactNode
  title?: string
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
  tone = "light",
  ariaLabel,
}: {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  size?: "sm" | "md"
  tone?: "light" | "dark"
  ariaLabel: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={clsx(
        "inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-xl p-1",
        tone === "light" ? "bg-plane ring-1 ring-line" : "bg-white/10 ring-1 ring-white/10",
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => onChange(option.value)}
            className={clsx(
              "whitespace-nowrap rounded-lg font-medium transition",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              tone === "light"
                ? active
                  ? "bg-white text-navy-700 shadow-sm ring-1 ring-line"
                  : "text-ink-2 hover:text-ink"
                : active
                  ? "bg-white text-navy-950 shadow-sm"
                  : "text-white/70 hover:text-white",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/50 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-navy-700 text-white hover:bg-navy-800",
        variant === "secondary" && "bg-white text-ink ring-1 ring-line hover:bg-plane",
        variant === "ghost" && "text-ink-2 hover:bg-plane hover:text-ink",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function LowBase({ n, threshold = 30 }: { n: number; threshold?: number }) {
  if (n >= threshold) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Base reduzida (n={n}): leia com cautela
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-lg bg-slate-200/70", className)} />
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-10 text-center">
      <p className="text-sm font-semibold text-ink">{title}</p>
      {children && <p className="max-w-sm text-xs text-ink-3">{children}</p>}
    </div>
  )
}
