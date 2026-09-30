import { useMemo } from "react"
import type { Dataset } from "../data/decode"
import { andMask, countMask, fullMask, maskFromCodes, scopeMask, type Mask, type ScopeKey } from "../data/engine"
import { REGION_LABELS, UF_LABELS, UF_TO_REGION } from "../lib/geo"
import { valueCodes, valueLabel } from "../surveys/dictionary"
import type { FilterDef, OptionGroup, SurveyConfig } from "../surveys/types"
import { SERIES_COLORS } from "../components/charts/palette"
import { useView, type AudienceMode, type FilterState } from "./ViewContext"

export interface Series {
  key: string
  label: string
  short: string
  color: string
  mask: Mask
  n: number
}

export function scopeLabel(scope: ScopeKey) {
  if (scope.kind === "brasil") return "Brasil"
  if (scope.kind === "region") return `Região ${REGION_LABELS[scope.region]}`
  return UF_LABELS[scope.uf] ?? scope.uf
}

export function scopeShort(scope: ScopeKey) {
  if (scope.kind === "brasil") return "Brasil"
  if (scope.kind === "region") return REGION_LABELS[scope.region]
  return scope.uf
}

/** Brasil -> Região -> Estado a partir do escopo escolhido */
export function scopeChain(scope: ScopeKey): ScopeKey[] {
  if (scope.kind === "brasil") return [scope]
  if (scope.kind === "region") return [{ kind: "brasil" }, scope]
  return [{ kind: "brasil" }, { kind: "region", region: UF_TO_REGION[scope.uf] }, scope]
}

export interface FilterOption {
  key: string
  label: string
  codes: number[]
}

export function filterOptions(ds: Dataset | undefined, config: SurveyConfig, def: { column?: string; groups?: OptionGroup[]; hideCodes?: number[] }): FilterOption[] {
  if (def.groups) return def.groups.map((group) => ({ key: group.key, label: group.label, codes: group.codes }))
  if (!def.column) return []
  const hidden = new Set(def.hideCodes ?? [])
  let codes = valueCodes(config.dictionary, def.column).filter((code) => !hidden.has(code))
  // Só oferece opções que existem nos dados (ex.: partidos sem entrevistado somem)
  if (ds?.codes[def.column]) {
    const present = new Set<number>()
    const column = ds.codes[def.column]
    for (let i = 0; i < ds.n; i++) present.add(column[i])
    codes = codes.filter((code) => present.has(code))
  }
  return codes.map((code) => ({ key: String(code), label: valueLabel(config.dictionary, def.column!, code), codes: [code] }))
}

export function buildFilterMask(ds: Dataset, config: SurveyConfig, state: FilterState): Mask {
  let mask = fullMask(ds.n)
  for (const def of config.filters) {
    const selected = state[def.id]
    if (!selected?.length) continue
    const options = filterOptions(ds, config, def)
    const codes = options.filter((option) => selected.includes(option.key)).flatMap((option) => option.codes)
    if (codes.length) mask = andMask(mask, maskFromCodes(ds.codes[def.column], codes, ds.n))
  }
  return mask
}

export function activeFilterCount(state: FilterState) {
  return Object.values(state).filter((values) => values?.length).length
}

export interface ActiveFilterChip {
  filterId: string
  key: string
  label: string
  group: string
}

export function activeFilterChips(ds: Dataset | undefined, config: SurveyConfig, state: FilterState): ActiveFilterChip[] {
  return config.filters.flatMap((def: FilterDef) => {
    const selected = state[def.id] ?? []
    if (!selected.length) return []
    const options = filterOptions(ds, config, def)
    return selected.map((key) => ({
      filterId: def.id,
      key,
      group: def.label,
      label: options.find((option) => option.key === key)?.label ?? key,
    }))
  })
}

function audienceMask(ds: Dataset, config: SurveyConfig, code: number) {
  return maskFromCodes(ds.codes[config.audience!.column], [code], ds.n)
}

export interface Analysis {
  series: Series[]
  /** recorte geográfico principal (sem filtros), para o rodapé */
  scope: ScopeKey
  filterMask: Mask
  audience: AudienceMode
  /** público único selecionado (stakeholders) ou null */
  singleAudience: number | null
}

export function useAnalysis(config: SurveyConfig, ds: Dataset | undefined): Analysis | null {
  const view = useView()
  const filters = view.filters[config.id]

  return useMemo(() => {
    if (!ds) return null
    const filterMask = buildFilterMask(ds, config, filters)
    const hasAudience = Boolean(config.audience)
    const audience = hasAudience ? view.audience : "compare"
    const singleAudience = hasAudience && audience !== "compare" ? Number(audience) : null

    const make = (key: string, label: string, short: string, color: string, mask: Mask): Series => ({
      key,
      label,
      short,
      color,
      mask,
      n: countMask(mask),
    })

    let series: Series[]

    if (hasAudience && singleAudience === null) {
      // Stakeholders: um série por público, no recorte geográfico escolhido
      const geo = andMask(scopeMask(ds, view.scope), filterMask)
      series = config.audience!.options.map((option, index) =>
        make(`aud-${option.code}`, option.label, option.short, SERIES_COLORS.audience[index], andMask(geo, audienceMask(ds, config, option.code))),
      )
    } else {
      const base = singleAudience ? andMask(filterMask, audienceMask(ds, config, singleAudience)) : filterMask
      const scopes = view.compare ? scopeChain(view.scope) : [view.scope]
      series = scopes.map((scope) =>
        make(
          `geo-${scope.kind}`,
          scopeLabel(scope),
          scopeShort(scope),
          SERIES_COLORS.geo[scope.kind],
          andMask(scopeMask(ds, scope), base),
        ),
      )
    }

    return { series, scope: view.scope, filterMask, audience, singleAudience }
  }, [ds, config, filters, view.scope, view.compare, view.audience])
}
