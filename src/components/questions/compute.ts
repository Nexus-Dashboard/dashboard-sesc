// Transforma (pergunta + séries) em linhas prontas para os gráficos.
// Toda proporção usa a base da própria série (código 0 = fora da base).

import type { Dataset } from "../../data/decode"
import {
  andMask,
  codeMean,
  distribution,
  maskFromCodes,
  multiDistribution,
  numMean,
  regionCodes,
  share,
  textCodesMatching,
  fold,
  type Mask,
} from "../../data/engine"
import { REGIONS, REGION_LABELS } from "../../lib/geo"
import { valueCodes, valueLabel, variableLabel } from "../../surveys/dictionary"
import type {
  BreakdownDef,
  GridQuestion,
  Kpi,
  MeansQuestion,
  MultiQuestion,
  ScaleRole,
  ScoreQuestion,
  SingleQuestion,
  SurveyConfig,
  TextQuestion,
} from "../../surveys/types"
import type { Series } from "../../view/analysis"
import { filterOptions } from "../../view/analysis"
import { ROLE_COLORS } from "../charts/palette"
import type { LegendItem, StackRow, StackSegment } from "../charts/StackedBars"
import type { RankRow } from "../charts/RankBars"
import type { MeanGroup } from "../charts/MeanBars"
import type { ScoreSeries } from "../charts/ScorePanel"

const NOMINAL = ["#0E5A8A", "#3F8FCB", "#8CC3EA", "#F2A964", "#D5641B", "#6B4C9A", "#B28DD6"]

interface ScaleSpec {
  codes: number[]
  roles: ScaleRole[]
  colors?: (string | undefined)[]
}

/** escala nominal para perguntas de ranking exibidas empilhadas (quebra por perfil) */
function nominalScale(codes: number[], residual: number[] = []): ScaleSpec {
  const main = codes.filter((code) => !residual.includes(code))
  const tail = codes.filter((code) => residual.includes(code))
  return {
    codes: [...main, ...tail],
    roles: [...main.map(() => "neu" as ScaleRole), ...tail.map(() => "ns" as ScaleRole)],
    colors: [...main.map((_, index) => NOMINAL[index % NOMINAL.length]), ...tail.map(() => undefined)],
  }
}

export function legendFor(config: SurveyConfig, column: string, scale: ScaleSpec): LegendItem[] {
  return scale.codes.map((code, index) => ({
    label: valueLabel(config.dictionary, column, code),
    color: scale.colors?.[index] ?? ROLE_COLORS[scale.roles[index]],
  }))
}

function stackRow(
  ds: Dataset,
  config: SurveyConfig,
  column: string,
  mask: Mask,
  scale: ScaleSpec,
  topCodes: number[] | undefined,
  base: Omit<StackRow, "segments" | "n" | "top">,
): StackRow {
  const dist = distribution(ds, column, mask)
  const segments: StackSegment[] = scale.codes.map((code, index) => ({
    code,
    label: valueLabel(config.dictionary, column, code),
    role: scale.roles[index],
    color: scale.colors?.[index],
    value: dist.base ? (dist.weights[code] ?? 0) / dist.base : 0,
  }))
  return { ...base, segments, n: dist.n, top: topCodes ? share(dist, topCodes) : undefined }
}

// ---------------------------------------------------------------- quebra por perfil

export interface BreakdownSegment {
  key: string
  label: string
  mask: Mask
}

export function availableBreakdowns(config: SurveyConfig, ds: Dataset, exclude?: string) {
  return config.breakdowns.filter((def) => (def.special === "region" ? Boolean(ds.uf) : def.column !== exclude))
}

export function breakdownSegments(config: SurveyConfig, ds: Dataset, def: BreakdownDef): BreakdownSegment[] {
  if (def.special === "region") {
    const regions = regionCodes(ds, REGIONS)
    if (!regions) return []
    return REGIONS.map((region, index) => ({
      key: region,
      label: REGION_LABELS[region],
      mask: maskFromCodes(regions, [index + 1], ds.n),
    }))
  }
  return filterOptions(ds, config, def).map((option) => ({
    key: option.key,
    label: option.label,
    mask: maskFromCodes(ds.codes[def.column!], option.codes, ds.n),
  }))
}

// ---------------------------------------------------------------- pergunta simples

function presentCodes(ds: Dataset, config: SurveyConfig, column: string, series: Series[], hide: number[] = []) {
  const hidden = new Set(hide)
  const known = valueCodes(config.dictionary, column)
  const present = new Set<number>()
  series.forEach((item) => {
    const dist = distribution(ds, column, item.mask)
    dist.weights.forEach((weight, code) => {
      if (code > 0 && weight > 0) present.add(code)
    })
  })
  const codes = known.length ? known.filter((code) => present.has(code)) : [...present].sort((a, b) => a - b)
  return codes.filter((code) => !hidden.has(code))
}

export function singleStack(
  question: SingleQuestion,
  config: SurveyConfig,
  ds: Dataset,
  series: Series[],
  breakdown: BreakdownSegment[] | null,
) {
  const scale: ScaleSpec = question.scale ?? nominalScale(presentCodes(ds, config, question.column, series, question.hideCodes), question.residual)
  const multi = series.length > 1
  const rows: StackRow[] = []

  const groups = breakdown ? [{ key: "total", label: "Total", mask: null as Mask | null }, ...breakdown] : [{ key: "total", label: "", mask: null }]

  groups.forEach((group) => {
    series.forEach((item, index) => {
      const mask = group.mask ? andMask(item.mask, group.mask) : item.mask
      rows.push(
        stackRow(ds, config, question.column, mask, scale, question.topBox?.codes, {
          key: `${group.key}-${item.key}`,
          label: breakdown ? group.label : item.label,
          seriesLabel: multi && breakdown ? item.short : undefined,
          seriesColor: item.color,
          groupStart: breakdown ? index === 0 : true,
          highlight: breakdown ? group.key === "total" : false,
        }),
      )
    })
  })

  return { rows, legend: legendFor(config, question.column, scale), topLabel: question.topBox?.label }
}

function orderCodes(codes: number[], values: Map<number, number>, sort: boolean, residual: number[] = []) {
  const main = codes.filter((code) => !residual.includes(code))
  const tail = residual.filter((code) => codes.includes(code))
  if (sort) main.sort((a, b) => (values.get(b) ?? 0) - (values.get(a) ?? 0))
  return [...main, ...tail]
}

export function singleRank(question: SingleQuestion, config: SurveyConfig, ds: Dataset, series: Series[]) {
  const codes = presentCodes(ds, config, question.column, series, question.hideCodes)
  const dists = series.map((item) => distribution(ds, question.column, item.mask))
  const firstValues = new Map(codes.map((code) => [code, dists[0].base ? dists[0].weights[code] / dists[0].base : 0]))
  const ordered = orderCodes(codes, firstValues, question.sort !== false, question.residual)

  const rows: RankRow[] = ordered.map((code) => ({
    key: String(code),
    label: valueLabel(config.dictionary, question.column, code),
    residual: question.residual?.includes(code),
    values: series.map((item, index) => ({
      seriesKey: item.key,
      seriesLabel: item.label,
      color: item.color,
      value: dists[index].base ? (dists[index].weights[code] ?? 0) / dists[index].base : NaN,
      n: dists[index].n,
    })),
  }))
  return { rows, bases: dists.map((dist) => dist.n) }
}

// ---------------------------------------------------------------- grade (itens com a mesma escala)

export function gridRows(question: GridQuestion, config: SurveyConfig, ds: Dataset, series: Series[]) {
  const multi = series.length > 1
  const items = question.columns.map((column, index) => ({
    column,
    label: question.itemLabels?.[index] ?? variableLabel(config.dictionary, column),
    top: question.topBox ? share(distribution(ds, column, series[0].mask), question.topBox.codes) : 0,
  }))
  if (question.sort) items.sort((a, b) => (Number.isFinite(b.top) ? b.top : -1) - (Number.isFinite(a.top) ? a.top : -1))

  const rows: StackRow[] = []
  items.forEach((item) => {
    series.forEach((entry, index) => {
      rows.push(
        stackRow(ds, config, item.column, entry.mask, question.scale, question.topBox?.codes, {
          key: `${item.column}-${entry.key}`,
          label: item.label,
          seriesLabel: multi ? entry.short : undefined,
          seriesColor: entry.color,
          groupStart: index === 0,
          highlight: item.column === question.highlightColumn,
        }),
      )
    })
  })

  const bases = series.map((entry) => Math.max(0, ...question.columns.map((column) => distribution(ds, column, entry.mask).n)))
  return { rows, legend: legendFor(config, question.columns[0], question.scale), topLabel: question.topBox?.label, bases }
}

// ---------------------------------------------------------------- múltipla menção

export function multiRank(question: MultiQuestion, config: SurveyConfig, ds: Dataset, series: Series[]) {
  const dists = series.map((item) => multiDistribution(ds, question.columns, item.mask))
  const hidden = new Set(question.hideCodes ?? [])
  const known = valueCodes(config.dictionary, question.columns[0])
  const codes = known.filter((code) => !hidden.has(code) && dists.some((dist) => (dist.weights[code] ?? 0) > 0))
  const firstValues = new Map(codes.map((code) => [code, dists[0].base ? dists[0].weights[code] / dists[0].base : 0]))
  const ordered = orderCodes(codes, firstValues, true, question.residual)

  const rows: RankRow[] = ordered.map((code) => ({
    key: String(code),
    label: valueLabel(config.dictionary, question.columns[0], code),
    residual: question.residual?.includes(code),
    values: series.map((item, index) => ({
      seriesKey: item.key,
      seriesLabel: item.label,
      color: item.color,
      value: dists[index].base ? (dists[index].weights[code] ?? 0) / dists[index].base : NaN,
      n: dists[index].n,
    })),
  }))
  return { rows, bases: dists.map((dist) => dist.n) }
}

// ---------------------------------------------------------------- resposta aberta (top of mind)

export function textRank(question: TextQuestion, ds: Dataset, series: Series[], validOnly: boolean) {
  const labels = ds.texts[question.column] ?? []
  const nsCodes = new Set(question.nsTerms.flatMap((term) => textCodesMatching(ds, question.column, term)))
  const dists = series.map((item) => distribution(ds, question.column, item.mask))
  const denominators = dists.map((dist) => {
    if (!validOnly) return dist.base
    let ns = 0
    nsCodes.forEach((code) => (ns += dist.weights[code] ?? 0))
    return dist.base - ns
  })

  const codes = labels
    .map((_, index) => index + 1)
    .filter((code) => !(validOnly && nsCodes.has(code)) && dists.some((dist) => (dist.weights[code] ?? 0) > 0))
  codes.sort((a, b) => (dists[0].weights[b] ?? 0) - (dists[0].weights[a] ?? 0))

  const top = codes.filter((code) => !nsCodes.has(code)).slice(0, question.topN)
  const others = codes.filter((code) => !nsCodes.has(code) && !top.includes(code))
  const target = fold(question.highlight)

  const valueOf = (index: number, pick: number[]) => {
    const denominator = denominators[index]
    if (!denominator) return NaN
    return pick.reduce((sum, code) => sum + (dists[index].weights[code] ?? 0), 0) / denominator
  }

  const makeRow = (key: string, label: string, pick: number[], extra: Partial<RankRow> = {}): RankRow => ({
    key,
    label,
    ...extra,
    values: series.map((item, index) => ({
      seriesKey: item.key,
      seriesLabel: item.label,
      color: item.color,
      value: valueOf(index, pick),
      n: dists[index].n,
    })),
  })

  const rows: RankRow[] = top.map((code) =>
    makeRow(String(code), labels[code - 1], [code], { highlight: fold(labels[code - 1]) === target }),
  )
  if (others.length) rows.push(makeRow("outros", "Outras", others, { residual: true }))
  if (!validOnly && nsCodes.size) rows.push(makeRow("ns", "NS/NR", [...nsCodes], { residual: true }))

  return { rows, bases: dists.map((dist) => dist.n) }
}

// ---------------------------------------------------------------- médias e indicador

export function meanGroups(question: MeansQuestion, config: SurveyConfig, ds: Dataset, series: Series[]): { groups: MeanGroup[]; bases: number[] } {
  const groups = question.groups.map((group) => ({
    label: group.label,
    rows: group.columns
      .map((column) => ({
        key: column,
        label: question.itemLabels?.[column] ?? variableLabel(config.dictionary, column),
        values: series.map((item) => {
          const result = codeMean(ds, column, item.mask)
          return { seriesKey: item.key, seriesLabel: item.label, color: item.color, mean: result.mean, n: result.n }
        }),
      }))
      .sort((a, b) => (b.values[0].mean || 0) - (a.values[0].mean || 0)),
  }))
  const bases = series.map((_, index) => Math.max(0, ...groups.flatMap((group) => group.rows.map((row) => row.values[index].n))))
  return { groups, bases }
}

export function scoreSeries(question: ScoreQuestion, ds: Dataset, series: Series[]): ScoreSeries[] {
  return series.map((item) => {
    const total = numMean(ds, question.column, item.mask)
    return {
      key: item.key,
      label: item.label,
      color: item.color,
      value: total.mean,
      n: total.n,
      dims: question.dims.map((dim) => ({ label: dim.label, value: numMean(ds, dim.column, item.mask).mean })),
    }
  })
}

// ---------------------------------------------------------------- KPIs

export function kpiValue(kpi: Kpi, ds: Dataset, mask: Mask): { value: number; n: number } {
  const metric = kpi.metric
  if (metric.kind === "mean") {
    const result = numMean(ds, metric.column, mask)
    return { value: result.mean, n: result.n }
  }
  if (metric.kind === "text") {
    const dist = distribution(ds, metric.column, mask)
    return { value: share(dist, textCodesMatching(ds, metric.column, metric.term)), n: dist.n }
  }
  const dist = distribution(ds, metric.column, mask)
  return { value: share(dist, metric.codes), n: dist.n }
}
