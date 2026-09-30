import clsx from "clsx"
import { int, score } from "../../lib/format"
import { SCORE_ZONES, SINGLE_SERIES, zoneOf } from "./palette"
import { TipRow, tipHandlers } from "../ui/Tooltip"

export interface ScoreSeries {
  key: string
  label: string
  color: string
  value: number
  n: number
  dims: { label: string; value: number }[]
}

export function ScorePanel({ series, asTable }: { series: ScoreSeries[]; asTable?: boolean }) {
  const multi = series.length > 1
  const dims = series[0]?.dims.map((dim) => dim.label) ?? []

  if (asTable) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ink-3">
              <th className="py-2 pr-3 font-semibold">Recorte</th>
              <th className="px-2 py-2 text-right font-semibold">Indicador</th>
              {dims.map((label) => (
                <th key={label} className="px-2 py-2 text-right font-semibold">
                  {label}
                </th>
              ))}
              <th className="py-2 pl-2 text-right font-semibold">Base</th>
            </tr>
          </thead>
          <tbody>
            {series.map((item) => (
              <tr key={item.key} className="border-b border-line/60">
                <td className="py-1.5 pr-3">{item.label}</td>
                <td className="px-2 py-1.5 text-right font-semibold tabular-nums">{score(item.value)}</td>
                {item.dims.map((dim) => (
                  <td key={dim.label} className="px-2 py-1.5 text-right tabular-nums">
                    {score(dim.value)}
                  </td>
                ))}
                <td className="py-1.5 pl-2 text-right tabular-nums text-ink-3">{int(item.n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-6">
        <div className={clsx("grid gap-4", multi ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1")}>
          {series.map((item) => {
            const zone = Number.isFinite(item.value) ? zoneOf(item.value) : null
            return (
              <div key={item.key} className="min-w-0">
                <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3">
                  {multi && <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden />}
                  {item.label}
                </p>
                <p className={clsx("font-bold tabular-nums tracking-tight text-navy-700", multi ? "text-4xl" : "text-6xl")}>{score(item.value)}</p>
                {zone && (
                  <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-plane px-2.5 py-0.5 text-xs font-semibold text-ink ring-1 ring-line">
                    <span className="h-2 w-2 rounded-full" style={{ background: zone.color }} aria-hidden />
                    Zona {zone.label.toLowerCase()}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div>
          <div className="relative pt-5">
            {series.map((item) =>
              Number.isFinite(item.value) ? (
                <div
                  key={item.key}
                  className="absolute top-0 -translate-x-1/2"
                  style={{ left: `${item.value}%` }}
                  {...tipHandlers(() => <TipRow color={item.color} label={item.label} value={score(item.value)} />)}
                >
                  <div
                    className="h-0 w-0 border-x-[6px] border-t-[8px] border-x-transparent"
                    style={{ borderTopColor: multi ? item.color : SINGLE_SERIES }}
                  />
                </div>
              ) : null,
            )}
            <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
              {SCORE_ZONES.map((zone) => (
                <div key={zone.label} className="flex-1" style={{ background: zone.color }} />
              ))}
            </div>
            <div className="mt-1.5 grid grid-cols-5 text-center text-[10px] leading-tight text-ink-3">
              {SCORE_ZONES.map((zone) => (
                <span key={zone.label}>
                  <span className="block font-semibold text-ink-2">{zone.label}</span>
                  {zone.from}–{Math.min(100, Math.floor(zone.to))}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-ink-3">Por dimensão reputacional</p>
        <div className="space-y-3">
          {dims.map((label, index) => (
            <div key={label}>
              <p className="mb-1 text-[13px] text-ink-2">{label}</p>
              <div className="space-y-1">
                {series.map((item) => {
                  const value = item.dims[index]?.value ?? NaN
                  return (
                    <div
                      key={item.key}
                      className="flex items-center gap-2"
                      {...tipHandlers(() => (
                        <div className="space-y-1">
                          <p className="font-semibold">{label}</p>
                          {series.map((other) => (
                            <TipRow key={other.key} color={other.color} label={other.label} value={score(other.dims[index]?.value ?? NaN)} />
                          ))}
                        </div>
                      ))}
                    >
                      <div className={clsx("relative flex-1 rounded-r bg-plane", multi ? "h-3" : "h-4")}>
                        <div
                          className="absolute inset-y-0 left-0 rounded-r-[4px]"
                          style={{ width: `${Number.isFinite(value) ? value : 0}%`, background: multi ? item.color : SINGLE_SERIES }}
                        />
                      </div>
                      <span className={clsx("w-9 text-right tabular-nums", multi ? "text-xs text-ink-2" : "text-sm font-semibold")}>{score(value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
