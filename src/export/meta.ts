// Metadados comuns aos arquivos exportados (capa do PDF, aba "Sobre" do Excel)

import type { SurveyConfig } from "../surveys/types"
import type { Analysis } from "../view/analysis"
import { scopeLabel } from "../view/analysis"
import type { ActiveFilterChip } from "../view/analysis"
import { BRAND } from "../lib/brand"

export interface ExportMeta {
  client: string
  survey: string
  title: string
  scope: string
  series: { label: string; n: number; color: string }[]
  filters: string[]
  audience: string | null
  user: string
  generatedAt: Date
  sampleNote: string
  disclaimer: string
}

export function buildMeta(config: SurveyConfig, analysis: Analysis, chips: ActiveFilterChip[], user: string): ExportMeta {
  const audience =
    config.audience && analysis.singleAudience !== null
      ? config.audience.options.find((option) => option.code === analysis.singleAudience)?.label ?? null
      : config.audience
        ? config.audience.options.map((option) => option.label).join(" × ")
        : null
  return {
    client: BRAND.name,
    survey: config.title,
    title: `${BRAND.survey} ${BRAND.year}`,
    scope: scopeLabel(analysis.scope),
    series: analysis.series.map((item) => ({ label: item.label, n: item.n, color: item.color })),
    filters: chips.map((chip) => `${chip.group}: ${chip.label}`),
    audience,
    user,
    generatedAt: new Date(),
    sampleNote: config.sampleNote,
    disclaimer: BRAND.disclaimer,
  }
}

function slug(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function exportFileName(meta: ExportMeta, sectionTitle: string | null, extension: "pdf" | "xlsx") {
  const day = meta.generatedAt.toISOString().slice(0, 10)
  const parts = [meta.client, meta.survey, sectionTitle, meta.scope, day].filter(Boolean).map((part) => slug(String(part)))
  return `${parts.join("_")}.${extension}`
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}
