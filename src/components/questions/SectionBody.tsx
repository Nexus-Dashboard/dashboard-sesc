import clsx from "clsx"
import type { Dataset } from "../../data/decode"
import type { Section, SurveyConfig } from "../../surveys/types"
import type { Analysis } from "../../view/analysis"
import { date } from "../../lib/format"
import { KpiGrid } from "./KpiGrid"
import { QuestionCard } from "./QuestionCard"

// Conteúdo de uma seção (KPIs, cards e nota da amostra). Usado pela página e
// pelo exportador de PDF, que o monta fora da tela em `exportMode`.
export function SectionBody({
  config,
  section,
  ds,
  analysis,
  exportMode = false,
}: {
  config: SurveyConfig
  section: Section
  ds: Dataset
  analysis: Analysis
  exportMode?: boolean
}) {
  return (
    <div className="space-y-6">
      {section.kpis && <KpiGrid kpis={section.kpis} ds={ds} series={analysis.series} exportMode={exportMode} />}
      <div className={clsx("grid gap-6", exportMode ? "grid-cols-2" : "grid-cols-1 xl:grid-cols-2")}>
        {section.questions.map((question) => (
          <QuestionCard key={question.id} question={question} config={config} ds={ds} analysis={analysis} exportMode={exportMode} />
        ))}
      </div>
      <p data-export-block="" className="text-[11px] leading-relaxed text-ink-3">
        {config.sampleNote}
        {ds.modifiedTime ? ` Base atualizada em ${date(ds.modifiedTime)}.` : ""}
      </p>
    </div>
  )
}
