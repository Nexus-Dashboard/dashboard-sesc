import { useState } from "react"
import { Navigate, useParams } from "react-router-dom"
import { AlertCircle, RefreshCw, SlidersHorizontal, X } from "lucide-react"
import clsx from "clsx"
import { getSurveyConfig } from "../surveys"
import { useSurveyData } from "../data/useSurveyData"
import { activeFilterChips, useAnalysis } from "../view/analysis"
import { useView } from "../view/ViewContext"
import { ScopeControls } from "../components/layout/ScopeControls"
import { FilterDrawer } from "../components/layout/FilterDrawer"
import { QuestionCard } from "../components/questions/QuestionCard"
import { KpiGrid } from "../components/questions/KpiGrid"
import { Button, Card, LowBase, Skeleton } from "../components/ui/primitives"
import { date, int } from "../lib/format"

export function SectionPage() {
  const { surveyId, sectionId } = useParams()
  const config = getSurveyConfig(surveyId)
  const view = useView()
  const [filtersOpen, setFiltersOpen] = useState(false)
  const query = useSurveyData(config?.id ?? "populacao")
  const analysis = useAnalysis(config ?? getSurveyConfig("populacao")!, query.data)

  if (!config) return <Navigate to="/populacao/visao-geral" replace />
  const section = config.sections.find((item) => item.id === sectionId)
  if (!section) return <Navigate to={`/${config.id}/${config.sections[0].id}`} replace />

  const filters = view.filters[config.id]
  const chips = activeFilterChips(query.data, config, filters)
  const sectionIndex = config.sections.indexOf(section) + 1
  const sectionAudienceHidden = section.audience && config.audience && view.audience !== "compare" && Number(view.audience) !== section.audience

  const removeChip = (filterId: string, key: string) =>
    view.setFilters(config.id, { ...filters, [filterId]: (filters[filterId] ?? []).filter((item) => item !== key) })

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6 lg:px-10">
      {/* Cabeçalho da seção + controles de recorte (fixos ao rolar) */}
      <div className="relative z-20 -mx-4 border-b border-line/80 bg-plane/90 px-4 pb-4 pt-5 backdrop-blur-md sm:-mx-6 sm:px-6 lg:sticky lg:top-0 lg:-mx-10 lg:px-10 lg:pt-7">
        <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">
              {config.title} · {String(sectionIndex).padStart(2, "0")}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-[28px]">{section.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-ink-2">{section.description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ScopeControls config={config} />
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className={clsx(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium ring-1 transition",
                chips.length ? "bg-brand-orange text-navy-950 ring-brand-orange" : "bg-white text-ink-2 ring-line hover:text-ink",
              )}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {chips.length > 0 && <span className="rounded-full bg-navy-950 px-1.5 text-[11px] font-bold text-white">{chips.length}</span>}
            </button>
          </div>
        </div>

        {(chips.length > 0 || analysis) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            {analysis?.series.map((item) => (
              <span key={item.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-ink-2 ring-1 ring-line">
                <span className="h-2 w-2 rounded-full" style={{ background: item.color }} aria-hidden />
                {item.label}
                <span className="font-semibold tabular-nums text-ink">{int(item.n)}</span>
              </span>
            ))}
            {analysis && analysis.series.some((item) => item.n < 30) && <LowBase n={Math.min(...analysis.series.map((item) => item.n))} />}
            {chips.map((chip) => (
              <button
                key={`${chip.filterId}-${chip.key}`}
                type="button"
                onClick={() => removeChip(chip.filterId, chip.key)}
                className="inline-flex items-center gap-1 rounded-full bg-navy-700/10 px-2.5 py-1 font-medium text-navy-700 hover:bg-navy-700/15"
                title={`Remover filtro ${chip.group}`}
              >
                <span className="text-navy-700/60">{chip.group}:</span> {chip.label}
                <X className="h-3 w-3" aria-hidden />
              </button>
            ))}
            {chips.length > 0 && (
              <button type="button" onClick={() => view.setFilters(config.id, {})} className="font-medium text-ink-3 underline-offset-2 hover:text-ink hover:underline">
                limpar filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <LoadingState />
        ) : query.isError ? (
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <AlertCircle className="h-8 w-8 text-orange-600" aria-hidden />
            <p className="font-semibold text-ink">Não foi possível carregar os dados da pesquisa</p>
            <p className="max-w-md text-sm text-ink-2">{(query.error as Error).message}</p>
            <Button variant="secondary" onClick={() => query.refetch()}>
              <RefreshCw className="h-4 w-4" aria-hidden /> Tentar novamente
            </Button>
          </Card>
        ) : sectionAudienceHidden ? (
          <Card className="px-6 py-14 text-center text-sm text-ink-2">Esta seção é respondida somente pela Mídia. Troque o público no topo.</Card>
        ) : (
          analysis &&
          query.data && (
            <div className="space-y-6">
              {section.kpis && <KpiGrid kpis={section.kpis} ds={query.data} series={analysis.series} />}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                {section.questions.map((question) => (
                  <QuestionCard key={question.id} question={question} config={config} ds={query.data} analysis={analysis} />
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-ink-3">
                {config.sampleNote}
                {query.data.modifiedTime ? ` Base atualizada em ${date(query.data.modifiedTime)}.` : ""}
              </p>
            </div>
          )
        )}
      </div>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} config={config} ds={query.data} />
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando dados">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-32 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Skeleton className="h-80 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
      <p className="text-center text-xs text-ink-3">Carregando a base da pesquisa com segurança…</p>
    </div>
  )
}
