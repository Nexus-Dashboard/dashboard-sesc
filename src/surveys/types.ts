import type { LucideIcon } from "lucide-react"
import type { Dictionary } from "./dictionary"

/** Papel de cada ponto de escala na paleta divergente */
export type ScaleRole = "pos2" | "pos1" | "neu" | "neg1" | "neg2" | "ns"

export interface Scale {
  /** códigos na ordem de exibição */
  codes: number[]
  roles: ScaleRole[]
}

export interface TopBox {
  label: string
  codes: number[]
}

interface QuestionBase {
  id: string
  /** código da pergunta no questionário (P16, T_P2...) */
  code: string
  title: string
  /** enunciado completo */
  question?: string
  instruction?: string
  /** texto da base quando a pergunta tem filtro/pulo */
  baseNote?: string
  /** só aparece para um público (stakeholders: 1 = Legislativo, 2 = Mídia) */
  audience?: number
  /** ocupa a largura toda da grade */
  wide?: boolean
}

export interface SingleQuestion extends QuestionBase {
  kind: "single"
  column: string
  /** stack = barra 100% de escala; rank = barras por categoria */
  display: "stack" | "rank"
  scale?: Scale
  topBox?: TopBox
  /** rank: ordena por valor (padrão) ou mantém a ordem dos códigos */
  sort?: boolean
  /** códigos empurrados para o fim (Outros, NS/NR) */
  residual?: number[]
  hideCodes?: number[]
  breakdown?: boolean
}

export interface GridQuestion extends QuestionBase {
  kind: "grid"
  columns: string[]
  itemLabels?: string[]
  scale: Scale
  topBox?: TopBox
  sort?: boolean
  highlightColumn?: string
}

export interface MultiQuestion extends QuestionBase {
  kind: "multi"
  columns: string[]
  mentionLabels?: string[]
  residual?: number[]
  hideCodes?: number[]
}

export interface TextQuestion extends QuestionBase {
  kind: "text"
  column: string
  highlight: string
  topN: number
  /** rótulos considerados "não soube / não respondeu" (para o recorte de respostas válidas) */
  nsTerms: string[]
}

export interface MeansQuestion extends QuestionBase {
  kind: "means"
  groups: { label: string; columns: string[] }[]
  itemLabels?: Record<string, string>
}

export interface ScoreQuestion extends QuestionBase {
  kind: "score"
  column: string
  dims: { column: string; label: string }[]
}

export type Question = SingleQuestion | GridQuestion | MultiQuestion | TextQuestion | MeansQuestion | ScoreQuestion

export type KpiMetric =
  | { kind: "share"; column: string; codes: number[] }
  | { kind: "mean"; column: string }
  | { kind: "text"; column: string; term: string }

export interface Kpi {
  id: string
  label: string
  hint: string
  metric: KpiMetric
}

export interface Section {
  id: string
  title: string
  description: string
  icon: LucideIcon
  questions: Question[]
  kpis?: Kpi[]
  audience?: number
}

export interface OptionGroup {
  key: string
  label: string
  codes: number[]
}

export interface FilterDef {
  id: string
  label: string
  column: string
  groups?: OptionGroup[]
  hideCodes?: number[]
  audience?: number
}

export interface BreakdownDef {
  id: string
  label: string
  column?: string
  groups?: OptionGroup[]
  hideCodes?: number[]
  /** região da linha: só existe para o admin */
  special?: "region"
}

export interface AudienceDef {
  column: string
  options: { code: number; label: string; short: string }[]
}

export interface SurveyConfig {
  id: "populacao" | "stakeholders"
  title: string
  short: string
  description: string
  dictionary: Dictionary
  sections: Section[]
  filters: FilterDef[]
  breakdowns: BreakdownDef[]
  audience?: AudienceDef
  sampleNote: string
}
