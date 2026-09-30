import clsx from "clsx"
import { int, score } from "../../lib/format"
import { SINGLE_SERIES } from "./palette"
import { TipRow, tipHandlers } from "../ui/Tooltip"

export interface MeanValue {
  seriesKey: string
  seriesLabel: string
  color: string
  mean: number
  n: number
}

export interface MeanGroup {
  label: string
  rows: { key: string; label: string; values: MeanValue[] }[]
}

const MIN = 1
const MAX = 5

export function MeanBars({ groups, asTable }: { groups: MeanGroup[]; asTable?: boolean }) {
  const multi = (groups[0]?.rows[0]?.values.length ?? 0) > 1

  if (asTable) {
    const series = groups[0]?.rows[0]?.values ?? []
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ink-3">
              <th className="py-2 pr-3 font-semibold">Atributo</th>
              {series.map((value) => (
                <th key={value.seriesKey} className="px-2 py-2 text-right font-semibold">
                  {value.seriesLabel}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => [
              <tr key={group.label} className="bg-plane">
                <td colSpan={series.length + 1} className="px-2 py-1.5 font-semibold text-navy-700">
                  {group.label}
                </td>
              </tr>,
              ...group.rows.map((row) => (
                <tr key={row.key} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-ink">{row.label}</td>
                  {row.values.map((value) => (
                    <td key={value.seriesKey} className="px-2 py-1.5 text-right tabular-nums">
                      {score(value.mean)}
                    </td>
                  ))}
                </tr>
              )),
            ])}
          </tbody>
        </table>
      </div>
    )
  }

  // Uma grade só para todos os grupos, para os rótulos alinharem entre eles;
  // em cards estreitos o rótulo fica acima da barra.
  return (
    <div className="@container">
      <div className="grid grid-cols-1 items-center gap-x-3 gap-y-2 @xl:grid-cols-[minmax(0,max-content)_minmax(0,1fr)]">
        {groups.map((group, groupIndex) => (
          <div key={group.label} className="contents">
            <p className={clsx("col-span-full text-[11px] font-semibold uppercase tracking-wide text-navy-700", groupIndex > 0 && "mt-3")}>
              {group.label}
            </p>
            {group.rows.map((row) => (
              <div key={row.key} className="contents">
                <span className="-mb-1.5 min-w-0 text-left text-[13px] leading-tight text-ink-2 @xl:mb-0 @xl:max-w-[22rem] @xl:text-right">{row.label}</span>
                <div className="min-w-0 space-y-1">
                  {row.values.map((value) => {
                    const width = Number.isFinite(value.mean) ? ((value.mean - MIN) / (MAX - MIN)) * 100 : 0
                    const color = multi ? value.color : SINGLE_SERIES
                    return (
                      <div
                        key={value.seriesKey}
                        className="flex items-center gap-2"
                        {...tipHandlers(() => (
                          <div className="space-y-1">
                            <p className="font-semibold">{row.label}</p>
                            {row.values.map((item) => (
                              <TipRow key={item.seriesKey} color={multi ? item.color : color} label={item.seriesLabel} value={score(item.mean)} />
                            ))}
                            <p className="text-white/60">Média de 1 a 5 · base {int(value.n)}</p>
                          </div>
                        ))}
                      >
                        <div className={clsx("relative min-w-0 flex-1 rounded-r bg-plane", multi ? "h-3" : "h-4")}>
                          <div className="absolute inset-y-0 left-0 rounded-r-[4px]" style={{ width: `${width}%`, background: color }} />
                        </div>
                        <span className={clsx("w-8 text-right tabular-nums", multi ? "text-xs text-ink-2" : "text-sm font-semibold")}>{score(value.mean)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ))}
        <span className="hidden @xl:block" />
        <div className="flex justify-between pr-10 text-[10px] text-ink-3">
          {[1, 2, 3, 4, 5].map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
