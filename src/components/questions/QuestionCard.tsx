import { useMemo, useState } from "react"
import clsx from "clsx"
import { ChevronDown, Info, Table2, BarChart2 } from "lucide-react"
import type { Dataset } from "../../data/decode"
import type { Question, SurveyConfig } from "../../surveys/types"
import type { Analysis, Series } from "../../view/analysis"
import { int } from "../../lib/format"
import { Card, EmptyState, LowBase } from "../ui/primitives"
import { Legend, StackedBars } from "../charts/StackedBars"
import { RankBars } from "../charts/RankBars"
import { MeanBars } from "../charts/MeanBars"
import { ScorePanel } from "../charts/ScorePanel"
import {
  availableBreakdowns,
  breakdownSegments,
  gridRows,
  meanGroups,
  multiRank,
  scoreSeries,
  singleRank,
  singleStack,
  textRank,
} from "./compute"

const LOW_BASE = 30

function seriesFor(question: Question, config: SurveyConfig, analysis: Analysis): Series[] {
  // Pergunta de um público só: no modo "comparar públicos" mostra só a série dele
  if (!question.audience || !config.audience) return analysis.series
  if (analysis.singleAudience !== null) return analysis.series
  return analysis.series.filter((item) => item.key === `aud-${question.audience}`)
}

export function QuestionCard({
  question,
  config,
  ds,
  analysis,
}: {
  question: Question
  config: SurveyConfig
  ds: Dataset
  analysis: Analysis
}) {
  const [asTable, setAsTable] = useState(false)
  const [breakdownId, setBreakdownId] = useState<string>("")
  const [validOnly, setValidOnly] = useState(false)
  const [showQuestion, setShowQuestion] = useState(false)
  const series = seriesFor(question, config, analysis)

  const audienceMismatch =
    question.audience && analysis.singleAudience !== null && analysis.singleAudience !== question.audience
  const audienceLabel = config.audience?.options.find((option) => option.code === question.audience)?.label

  const supportsBreakdown = question.kind === "single" && question.breakdown
  const breakdownOptions = useMemo(
    () => (supportsBreakdown ? availableBreakdowns(config, ds, (question as { column: string }).column) : []),
    [supportsBreakdown, config, ds, question],
  )
  const breakdownDef = breakdownOptions.find((def) => def.id === breakdownId) ?? null

  const content = useMemo(() => {
    if (audienceMismatch || !series.length) return null
    switch (question.kind) {
      case "single": {
        const segments = breakdownDef ? breakdownSegments(config, ds, breakdownDef) : null
        if (question.display === "stack" || segments) {
          const result = singleStack(question, config, ds, series, segments)
          return {
            bases: series.map((_, index) => result.rows[index]?.n ?? 0),
            node: (
              <div className="space-y-4">
                <Legend items={result.legend} />
                <StackedBars rows={result.rows} topLabel={result.topLabel} asTable={asTable} />
              </div>
            ),
          }
        }
        const result = singleRank(question, config, ds, series)
        return { bases: result.bases, node: <RankBars rows={result.rows} asTable={asTable} /> }
      }
      case "grid": {
        const result = gridRows(question, config, ds, series)
        return {
          bases: result.bases,
          node: (
            <div className="space-y-4">
              <Legend items={result.legend} />
              <StackedBars rows={result.rows} topLabel={result.topLabel} asTable={asTable} />
            </div>
          ),
        }
      }
      case "multi": {
        const result = multiRank(question, config, ds, series)
        return { bases: result.bases, node: <RankBars rows={result.rows} asTable={asTable} /> }
      }
      case "text": {
        const result = textRank(question, ds, series, validOnly)
        return { bases: result.bases, node: <RankBars rows={result.rows} asTable={asTable} /> }
      }
      case "means": {
        const result = meanGroups(question, config, ds, series)
        return { bases: result.bases, node: <MeanBars groups={result.groups} asTable={asTable} /> }
      }
      case "score": {
        const result = scoreSeries(question, ds, series)
        return { bases: result.map((item) => item.n), node: <ScorePanel series={result} asTable={asTable} /> }
      }
    }
  }, [question, config, ds, series, breakdownDef, asTable, validOnly, audienceMismatch])

  const seriesLegend =
    series.length > 1 &&
    (question.kind === "multi" || question.kind === "text" || question.kind === "means" || (question.kind === "single" && question.display === "rank" && !breakdownDef))

  const bases = content?.bases ?? []
  const empty = content && bases.every((base) => base === 0)

  return (
    <Card className={clsx("flex min-w-0 flex-col", question.wide && "xl:col-span-2")}>
      <header className="flex flex-col gap-3 border-b border-line/70 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-brand-blue">{question.code}</p>
            <h3 className="text-base font-semibold leading-snug text-ink">{question.title}</h3>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {question.question && (
              <button
                type="button"
                onClick={() => setShowQuestion((value) => !value)}
                className={clsx("rounded-lg p-1.5 text-ink-3 transition hover:bg-plane hover:text-ink", showQuestion && "bg-plane text-ink")}
                title="Ver o enunciado da pergunta"
                aria-expanded={showQuestion}
              >
                <Info className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setAsTable((value) => !value)}
              className="rounded-lg p-1.5 text-ink-3 transition hover:bg-plane hover:text-ink"
              title={asTable ? "Ver gráfico" : "Ver tabela"}
            >
              {asTable ? <BarChart2 className="h-4 w-4" /> : <Table2 className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showQuestion && question.question && (
          <p className="rounded-lg border-l-2 border-brand-orange bg-plane px-3 py-2 text-[13px] italic leading-relaxed text-ink-2">
            {question.question}
            {question.instruction && <span className="not-italic text-ink-3"> ({question.instruction})</span>}
          </p>
        )}

        {(breakdownOptions.length > 0 || question.kind === "text") && !audienceMismatch && (
          <div className="flex flex-wrap items-center gap-2">
            {breakdownOptions.length > 0 && (
              <label className="relative inline-flex items-center">
                <span className="sr-only">Quebrar por</span>
                <select
                  value={breakdownId}
                  onChange={(event) => setBreakdownId(event.target.value)}
                  className="appearance-none rounded-lg border border-line bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-ink-2 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  <option value="">Quebrar por perfil…</option>
                  {breakdownOptions.map((def) => (
                    <option key={def.id} value={def.id}>
                      Por {def.label.toLowerCase()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-ink-3" />
              </label>
            )}
            {question.kind === "text" && (
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  checked={validOnly}
                  onChange={(event) => setValidOnly(event.target.checked)}
                  className="h-3.5 w-3.5 rounded border-line text-navy-700 focus:ring-brand-blue/30"
                />
                Só respostas válidas (sem NS/NR)
              </label>
            )}
          </div>
        )}
      </header>

      <div className="flex-1 px-5 py-5">
        {audienceMismatch ? (
          <EmptyState title={`Pergunta feita somente para ${audienceLabel}`}>
            Troque o público no topo da página para ver este resultado.
          </EmptyState>
        ) : empty ? (
          <EmptyState title="Sem respostas neste recorte">Ajuste os filtros ou o recorte geográfico.</EmptyState>
        ) : (
          <div className="space-y-4">
            {seriesLegend && <Legend items={series.map((item) => ({ label: item.label, color: item.color }))} />}
            {content?.node}
          </div>
        )}
      </div>

      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line/70 px-5 py-3 text-[11px] text-ink-3">
        <span>
          Base
          {question.baseNote ? `: ${question.baseNote}` : ""}
          {audienceLabel && question.audience ? ` · ${audienceLabel}` : ""} ·{" "}
          {series.map((item, index) => (
            <span key={item.key}>
              {index > 0 && " · "}
              {series.length > 1 ? `${item.short} ` : ""}
              <span className="font-semibold tabular-nums text-ink-2">{int(bases[index] ?? 0)}</span>
            </span>
          ))}{" "}
          entrevistas
        </span>
        {bases.some((base) => base > 0 && base < LOW_BASE) && <LowBase n={Math.min(...bases.filter((base) => base > 0))} />}
      </footer>
    </Card>
  )
}
