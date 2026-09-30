import clsx from "clsx"
import type { ScaleRole } from "../../surveys/types"
import { int, pct } from "../../lib/format"
import { ROLE_COLORS, ROLE_TEXT } from "./palette"
import { TipRow, tipHandlers } from "../ui/Tooltip"

export interface StackSegment {
  code: number
  label: string
  role: ScaleRole
  color?: string
  value: number
}

export interface StackRow {
  key: string
  label: string
  /** rótulo da série quando há mais de uma por item */
  seriesLabel?: string
  seriesColor?: string
  segments: StackSegment[]
  n: number
  top?: number
  highlight?: boolean
  /** primeira linha de um novo item (espaçamento maior) */
  groupStart?: boolean
}

export interface LegendItem {
  label: string
  color: string
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

export function StackedBars({
  rows,
  topLabel,
  asTable,
}: {
  rows: StackRow[]
  topLabel?: string
  asTable?: boolean
}) {
  if (asTable) return <StackTable rows={rows} topLabel={topLabel} />

  // Grade única para todas as linhas: a coluna de rótulo se ajusta ao maior
  // rótulo (até 15rem), e a barra ocupa o resto. Em cards estreitos (container
  // < 28rem) o rótulo sobe para cima da barra, que fica com a largura toda.
  return (
    <div className="@container">
      {topLabel && (
        <div className="mb-1.5 flex justify-end pr-0.5 text-[11px] font-semibold uppercase tracking-wide text-ink-3">{topLabel}</div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 @md:grid-cols-[minmax(0,max-content)_minmax(0,1fr)_auto]">
        {rows.map((row, index) => {
          const spaced = row.groupStart && index > 0
          return (
            <div key={row.key} className="contents">
              <div
                className={clsx(
                  "col-span-2 min-w-0 text-left text-[13px] leading-tight @md:col-span-1 @md:max-w-[15rem] @md:text-right",
                  spaced && "mt-2.5",
                )}
              >
                <span className="inline-flex flex-wrap items-baseline gap-x-2 @md:flex-col @md:items-end">
                  {(!row.seriesLabel || row.groupStart) && (
                    <span className={clsx("line-clamp-2", row.highlight ? "font-semibold text-ink" : "text-ink-2")}>{row.label}</span>
                  )}
                  {row.seriesLabel && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
                      <span className="h-2 w-2 rounded-full" style={{ background: row.seriesColor }} aria-hidden />
                      {row.seriesLabel}
                    </span>
                  )}
                </span>
              </div>

              <div
                className={clsx(
                  "flex h-7 w-full min-w-0 gap-[2px] overflow-hidden rounded-md",
                  row.highlight && "ring-2 ring-brand-orange/60 ring-offset-1",
                  spaced && "@md:mt-2.5",
                )}
              >
                {row.n === 0 && <div className="flex-1 rounded-md bg-plane" />}
                {row.segments.map((segment) =>
                  segment.value > 0 ? (
                    <div
                      key={segment.code}
                      className="flex min-w-0 items-center justify-center overflow-hidden text-[11px] font-semibold tabular-nums first:rounded-l-md last:rounded-r-md"
                      style={{
                        width: `${segment.value * 100}%`,
                        background: segment.color ?? ROLE_COLORS[segment.role],
                        color: segment.color ? "#fff" : ROLE_TEXT[segment.role],
                      }}
                      {...tipHandlers(() => (
                        <div className="space-y-1">
                          <p className="font-semibold">
                            {row.label}
                            {row.seriesLabel ? ` · ${row.seriesLabel}` : ""}
                          </p>
                          <TipRow color={segment.color ?? ROLE_COLORS[segment.role]} label={segment.label} value={pct(segment.value)} />
                          <p className="text-white/60">Base: {int(row.n)} entrevistas</p>
                        </div>
                      ))}
                    >
                      {segment.value >= 0.09 ? pct(segment.value) : ""}
                    </div>
                  ) : null,
                )}
              </div>

              <div className={clsx("w-11 text-right text-sm font-bold tabular-nums text-ink", spaced && "@md:mt-2.5")}>
                {row.top !== undefined && row.n > 0 ? pct(row.top) : ""}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StackTable({ rows, topLabel }: { rows: StackRow[]; topLabel?: string }) {
  const headers = rows[0]?.segments.map((segment) => segment.label) ?? []
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-xs">
        <thead>
          <tr className="border-b border-line text-ink-3">
            <th className="py-2 pr-3 font-semibold">Item</th>
            {headers.map((header) => (
              <th key={header} className="px-2 py-2 text-right font-semibold">
                {header}
              </th>
            ))}
            {topLabel && <th className="px-2 py-2 text-right font-semibold">{topLabel}</th>}
            <th className="py-2 pl-2 text-right font-semibold">Base</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-line/60">
              <td className="py-1.5 pr-3 text-ink">
                {row.label}
                {row.seriesLabel ? <span className="text-ink-3"> · {row.seriesLabel}</span> : null}
              </td>
              {row.segments.map((segment) => (
                <td key={segment.code} className="px-2 py-1.5 text-right tabular-nums text-ink-2">
                  {pct(segment.value)}
                </td>
              ))}
              {topLabel && <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{row.top !== undefined ? pct(row.top) : ""}</td>}
              <td className="py-1.5 pl-2 text-right tabular-nums text-ink-3">{int(row.n)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
