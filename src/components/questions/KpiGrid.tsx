import { useMemo } from "react"
import clsx from "clsx"
import type { Dataset } from "../../data/decode"
import type { Kpi } from "../../surveys/types"
import type { Series } from "../../view/analysis"
import { int, pct, points, score } from "../../lib/format"
import { zoneOf } from "../charts/palette"
import { kpiValue } from "./compute"
import { TipRow, tipHandlers } from "../ui/Tooltip"

// Números-herói: um cartão por indicador, com o valor de cada série.
// Com duas ou mais séries, a última é comparada à primeira (p.p.).
export function KpiGrid({ kpis, ds, series }: { kpis: Kpi[]; ds: Dataset; series: Series[] }) {
  const values = useMemo(
    () => kpis.map((kpi) => ({ kpi, results: series.map((item) => kpiValue(kpi, ds, item.mask)) })),
    [kpis, ds, series],
  )
  const multi = series.length > 1

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {values.map(({ kpi, results }) => {
        const isScore = kpi.metric.kind === "mean"
        const format = isScore ? score : pct
        const main = results[results.length - 1]
        const first = results[0]
        const delta = multi && !isScore ? main.value - first.value : multi ? (main.value - first.value) / 100 : NaN
        const zone = isScore && Number.isFinite(main.value) ? zoneOf(main.value) : null

        return (
          <div
            key={kpi.id}
            className="group relative overflow-hidden rounded-2xl border border-line bg-white p-4 shadow-card"
            {...tipHandlers(() => (
              <div className="space-y-1">
                <p className="font-semibold">{kpi.label}</p>
                <p className="text-white/70">{kpi.hint}</p>
                {series.map((item, index) => (
                  <TipRow key={item.key} color={item.color} label={`${item.label} (n=${int(results[index].n)})`} value={format(results[index].value)} />
                ))}
              </div>
            ))}
          >
            <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-navy-700 via-brand-blue to-brand-orange opacity-80" aria-hidden />
            <p className="text-xs font-semibold text-ink-2">{kpi.label}</p>
            <p className="mt-1 text-[11px] leading-snug text-ink-3">{kpi.hint}</p>
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className={clsx("font-bold tabular-nums tracking-tight text-navy-700", multi ? "text-3xl" : "text-4xl")}>{format(main.value)}</p>
              {zone && <span className="mb-1 rounded-full bg-plane px-2 py-0.5 text-[10px] font-semibold text-ink-2 ring-1 ring-line">{zone.label}</span>}
            </div>
            {multi && (
              <div className="mt-3 space-y-1 border-t border-line/70 pt-2.5">
                {series.map((item, index) => (
                  <div key={item.key} className="flex items-center justify-between text-[11px]">
                    <span className="flex items-center gap-1.5 text-ink-3">
                      <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden />
                      {item.short}
                    </span>
                    <span className="font-semibold tabular-nums text-ink-2">{format(results[index].value)}</span>
                  </div>
                ))}
                {Number.isFinite(delta) && (
                  <p className={clsx("pt-0.5 text-right text-[11px] font-semibold", delta >= 0 ? "text-emerald-700" : "text-orange-700")}>
                    {isScore ? `${delta >= 0 ? "+" : ""}${score(delta * 100)} pts` : points(delta)} vs. {series[0].short}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
