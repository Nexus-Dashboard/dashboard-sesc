// Converte cada pergunta da tela em tabelas para exportação. Reaproveita as
// mesmas funções que alimentam os gráficos (components/questions/compute.ts),
// então o arquivo traz exatamente os números exibidos no painel.

import type { Dataset } from "../data/decode"
import type { Question, Section, SurveyConfig } from "../surveys/types"
import type { Analysis, Series } from "../view/analysis"
import {
  gridRows,
  kpiValue,
  meanGroups,
  multiRank,
  scoreSeries,
  singleRank,
  singleStack,
  textRank,
} from "../components/questions/compute"
import { seriesFor } from "../components/questions/QuestionCard"
import type { RankRow } from "../components/charts/RankBars"
import type { StackRow } from "../components/charts/StackedBars"

export type CellFormat = "pct" | "score"
export type ExportCell = string | number | null | { value: number; format: CellFormat }

export interface ExportTable {
  code: string
  title: string
  question?: string
  note?: string
  header: string[]
  rows: ExportCell[][]
}

const pctCell = (value: number): ExportCell => (Number.isFinite(value) ? { value, format: "pct" } : null)
const scoreCell = (value: number): ExportCell => (Number.isFinite(value) ? { value, format: "score" } : null)

function baseRow(series: Series[], bases: number[], label = "Base (entrevistas)"): ExportCell[] {
  return [label, ...series.map((_, index) => bases[index] ?? 0)]
}

function rankTable(rows: RankRow[]) {
  return rows.map((row) => [row.label, ...row.values.map((value) => pctCell(value.value))])
}

// Barras empilhadas: categorias nas linhas, uma coluna por série
function stackTable(rows: StackRow[], series: Series[], topLabel?: string) {
  const perSeries = series.map((_, index) => rows[index])
  const categories = perSeries[0]?.segments ?? []
  const body: ExportCell[][] = categories.map((segment, segmentIndex) => [
    segment.label,
    ...perSeries.map((row) => pctCell(row?.segments[segmentIndex]?.value ?? NaN)),
  ])
  if (topLabel) body.push([topLabel, ...perSeries.map((row) => pctCell(row?.top ?? NaN))])
  return body
}

function questionTables(question: Question, config: SurveyConfig, ds: Dataset, analysis: Analysis): ExportTable[] {
  const series = seriesFor(question, config, analysis)
  const audienceMismatch = question.audience && analysis.singleAudience !== null && analysis.singleAudience !== question.audience
  const head = { code: question.code, title: question.title, question: question.question, note: question.baseNote }
  const seriesHeader = series.map((item) => item.label)

  if (audienceMismatch || !series.length) {
    const audience = config.audience?.options.find((option) => option.code === question.audience)?.label
    return [{ ...head, header: [], rows: [[`Pergunta feita somente para ${audience ?? "outro público"}.`]] }]
  }

  switch (question.kind) {
    case "single": {
      if (question.display === "stack") {
        const result = singleStack(question, config, ds, series, null)
        return [
          {
            ...head,
            header: ["Resposta", ...seriesHeader],
            rows: [...stackTable(result.rows, series, result.topLabel), baseRow(series, result.rows.map((row) => row.n))],
          },
        ]
      }
      const result = singleRank(question, config, ds, series)
      return [{ ...head, header: ["Resposta", ...seriesHeader], rows: [...rankTable(result.rows), baseRow(series, result.bases)] }]
    }
    case "grid": {
      const result = gridRows(question, config, ds, series)
      const categories = result.rows[0]?.segments.map((segment) => segment.label) ?? []
      const multi = series.length > 1
      return [
        {
          ...head,
          header: ["Item", ...(multi ? ["Recorte"] : []), ...categories, ...(result.topLabel ? [result.topLabel] : []), "Base"],
          rows: result.rows.map((row) => [
            row.label,
            ...(multi ? [row.seriesLabel ?? ""] : []),
            ...row.segments.map((segment) => pctCell(segment.value)),
            ...(result.topLabel ? [pctCell(row.top ?? NaN)] : []),
            row.n,
          ]),
        },
      ]
    }
    case "multi": {
      const result = multiRank(question, config, ds, series)
      return [{ ...head, header: ["Menção", ...seriesHeader], rows: [...rankTable(result.rows), baseRow(series, result.bases)] }]
    }
    case "text": {
      const result = textRank(question, ds, series, false)
      return [{ ...head, header: ["Resposta", ...seriesHeader], rows: [...rankTable(result.rows), baseRow(series, result.bases)] }]
    }
    case "means": {
      const result = meanGroups(question, config, ds, series)
      return [
        {
          ...head,
          header: ["Dimensão", "Atributo", ...seriesHeader.map((label) => `${label} (média)`)],
          rows: [
            ...result.groups.flatMap((group) =>
              group.rows.map((row) => [group.label, row.label, ...row.values.map((value) => scoreCell(value.mean))]),
            ),
            ["", "Base (entrevistas)", ...result.bases],
          ],
        },
      ]
    }
    case "score": {
      const result = scoreSeries(question, ds, series)
      return [
        {
          ...head,
          header: ["Indicador", ...seriesHeader],
          rows: [
            [question.title, ...result.map((item) => scoreCell(item.value))],
            ...question.dims.map((dim, index) => [dim.label, ...result.map((item) => scoreCell(item.dims[index]?.value ?? NaN))]),
            baseRow(series, result.map((item) => item.n)),
          ],
        },
      ]
    }
  }
}

export function kpiTable(section: Section, ds: Dataset, analysis: Analysis): ExportTable | null {
  if (!section.kpis?.length) return null
  return {
    code: "KPIs",
    title: "Indicadores principais",
    header: ["Indicador", "Descrição", ...analysis.series.map((item) => item.label)],
    rows: section.kpis.map((kpi) => {
      const isScore = kpi.metric.kind === "mean"
      return [
        kpi.label,
        kpi.hint,
        ...analysis.series.map((item) => {
          const { value } = kpiValue(kpi, ds, item.mask)
          return isScore ? scoreCell(value) : pctCell(value)
        }),
      ]
    }),
  }
}

export function sectionTables(config: SurveyConfig, section: Section, ds: Dataset, analysis: Analysis): ExportTable[] {
  const kpis = kpiTable(section, ds, analysis)
  return [...(kpis ? [kpis] : []), ...section.questions.flatMap((question) => questionTables(question, config, ds, analysis))]
}
