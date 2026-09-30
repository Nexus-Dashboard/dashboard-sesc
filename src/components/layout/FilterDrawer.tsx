import { useEffect, useMemo, useState } from "react"
import clsx from "clsx"
import { Check, RotateCcw, X } from "lucide-react"
import type { Dataset } from "../../data/decode"
import { andMask, countMask, maskFromCodes, scopeMask } from "../../data/engine"
import { int } from "../../lib/format"
import type { SurveyConfig } from "../../surveys/types"
import { buildFilterMask, filterOptions, scopeLabel } from "../../view/analysis"
import { useView, type FilterState } from "../../view/ViewContext"
import { Button } from "../ui/primitives"

export function FilterDrawer({
  open,
  onClose,
  config,
  ds,
}: {
  open: boolean
  onClose: () => void
  config: SurveyConfig
  ds: Dataset | undefined
}) {
  const view = useView()
  const applied = view.filters[config.id]
  const [staged, setStaged] = useState<FilterState>(applied)

  useEffect(() => {
    if (open) setStaged(applied)
  }, [open, applied])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const singleAudience = config.audience && view.audience !== "compare" ? Number(view.audience) : null

  // Prévia com os filtros EM EDIÇÃO (não os aplicados) no recorte atual
  const preview = useMemo(() => {
    if (!ds) return null
    let mask = andMask(scopeMask(ds, view.scope), buildFilterMask(ds, config, staged))
    if (singleAudience && config.audience) mask = andMask(mask, maskFromCodes(ds.codes[config.audience.column], [singleAudience], ds.n))
    const total = countMask(scopeMask(ds, view.scope))
    return { count: countMask(mask), total }
  }, [ds, config, staged, view.scope, singleAudience])

  const toggle = (filterId: string, key: string) =>
    setStaged((current) => {
      const selected = current[filterId] ?? []
      const next = selected.includes(key) ? selected.filter((item) => item !== key) : [...selected, key]
      return { ...current, [filterId]: next }
    })

  const filters = config.filters.filter((def) => !def.audience || !singleAudience || def.audience === singleAudience)

  return (
    <div className={clsx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div
        className={clsx("absolute inset-0 bg-navy-950/40 backdrop-blur-[2px] transition-opacity", open ? "opacity-100" : "opacity-0")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
        className={clsx(
          "absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <header className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">Filtros</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {config.title} · {scopeLabel(view.scope)}. Opções de um mesmo filtro somam; filtros diferentes se combinam.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-ink-3 hover:bg-plane hover:text-ink" aria-label="Fechar filtros">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {filters.map((def) => {
            const options = filterOptions(ds, config, def)
            const selected = staged[def.id] ?? []
            return (
              <fieldset key={def.id}>
                <legend className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-ink-2">
                  {def.label}
                  {selected.length > 0 && (
                    <button type="button" className="text-[11px] font-medium normal-case tracking-normal text-brand-blue hover:underline" onClick={() => setStaged({ ...staged, [def.id]: [] })}>
                      limpar
                    </button>
                  )}
                </legend>
                <div className="flex flex-wrap gap-1.5">
                  {options.map((option) => {
                    const active = selected.includes(option.key)
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => toggle(def.id, option.key)}
                        aria-pressed={active}
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition",
                          active ? "bg-navy-700 text-white ring-navy-700" : "bg-white text-ink-2 ring-line hover:ring-slate-300",
                        )}
                      >
                        {active && <Check className="h-3 w-3" aria-hidden />}
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            )
          })}
        </div>

        <footer className="space-y-3 border-t border-line bg-plane/60 px-6 py-4">
          {preview && (
            <p className="text-xs text-ink-2">
              <span className="text-base font-bold tabular-nums text-navy-700">{int(preview.count)}</span> de {int(preview.total)} entrevistas no recorte
              {preview.total ? ` (${Math.round((preview.count / preview.total) * 100)}%)` : ""}
              {preview.count > 0 && preview.count < 30 && <span className="ml-1 font-semibold text-amber-700">· base reduzida</span>}
            </p>
          )}
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStaged({})} className="flex-1">
              <RotateCcw className="h-4 w-4" aria-hidden />
              Limpar tudo
            </Button>
            <Button
              className="flex-[2]"
              onClick={() => {
                view.setFilters(config.id, staged)
                onClose()
              }}
            >
              Aplicar filtros
            </Button>
          </div>
        </footer>
      </aside>
    </div>
  )
}
