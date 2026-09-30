import clsx from "clsx"
import { int, pct } from "../../lib/format"
import { HIGHLIGHT, RESIDUAL, SINGLE_SERIES } from "./palette"
import { TipRow, tipHandlers } from "../ui/Tooltip"

export interface RankValue {
  seriesKey: string
  seriesLabel: string
  color: string
  value: number
  n: number
}

export interface RankRow {
  key: string
  label: string
  values: RankValue[]
  residual?: boolean
  highlight?: boolean
}

export function RankBars({ rows, asTable, maxRows }: { rows: RankRow[]; asTable?: boolean; maxRows?: number }) {
  const visible = maxRows ? rows.slice(0, maxRows) : rows
  const multi = (rows[0]?.values.length ?? 0) > 1
  const max = Math.max(0.05, ...visible.flatMap((row) => row.values.map((value) => (Number.isFinite(value.value) ? value.value : 0))))
  // escala até o próximo múltiplo de 10%, para as barras usarem a largura
  const scaleMax = Math.min(1, Math.ceil(max * 10) / 10)

  if (asTable) {
    const series = rows[0]?.values ?? []
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ink-3">
              <th className="py-2 pr-3 font-semibold">Resposta</th>
              {series.map((value) => (
                <th key={value.seriesKey} className="px-2 py-2 text-right font-semibold">
                  {value.seriesLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-line/60">
                <td className="py-1.5 pr-3 text-ink">{row.label}</td>
                {row.values.map((value) => (
                  <td key={value.seriesKey} className="px-2 py-1.5 text-right tabular-nums text-ink-2">
                    {pct(value.value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Mesma lógica das barras empilhadas: coluna de rótulo do tamanho do maior
  // rótulo; em cards estreitos o rótulo fica acima da barra.
  return (
    <div className="@container">
      <div className={clsx("grid grid-cols-1 items-center gap-x-3 @xl:grid-cols-[minmax(0,max-content)_minmax(0,1fr)]", multi ? "gap-y-3" : "gap-y-2")}>
        {visible.map((row) => (
          <div key={row.key} className="contents">
            <div
              className={clsx(
                "min-w-0 text-left text-[13px] leading-tight @xl:max-w-[16rem] @xl:text-right",
                row.highlight ? "font-semibold text-ink" : row.residual ? "text-ink-3" : "text-ink-2",
                "-mb-1.5 @xl:mb-0",
              )}
            >
              <span className="line-clamp-3">{row.label}</span>
            </div>
            <div className="min-w-0 space-y-1">
              {row.values.map((value) => {
                const color = row.residual ? RESIDUAL : multi ? value.color : row.highlight ? HIGHLIGHT : SINGLE_SERIES
                const width = Number.isFinite(value.value) ? (value.value / scaleMax) * 100 : 0
                return (
                  <div
                    key={value.seriesKey}
                    className="flex items-center gap-2"
                    {...tipHandlers(() => (
                      <div className="space-y-1">
                        <p className="font-semibold">{row.label}</p>
                        {row.values.map((item) => (
                          <TipRow key={item.seriesKey} color={multi ? item.color : color} label={item.seriesLabel} value={pct(item.value)} />
                        ))}
                        <p className="text-white/60">Base: {int(value.n)} entrevistas</p>
                      </div>
                    ))}
                  >
                    <div className={clsx("relative min-w-0 flex-1", multi ? "h-3.5" : "h-5")}>
                      <div
                        className="absolute inset-y-0 left-0 rounded-r-[4px] transition-[width] duration-300"
                        style={{ width: `${Math.max(width, value.value > 0 ? 0.6 : 0)}%`, background: color }}
                      />
                    </div>
                    <span className={clsx("w-10 shrink-0 text-right tabular-nums", multi ? "text-xs text-ink-2" : "text-sm font-semibold text-ink")}>
                      {pct(value.value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
