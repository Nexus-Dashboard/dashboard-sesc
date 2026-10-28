import { useEffect, useRef, useState } from "react"
import { Download, FileSpreadsheet, FileText, Lock, X } from "lucide-react"
import { useAuth } from "../lib/auth/AuthContext"
import { useSurveyData } from "../data/useSurveyData"
import { activeFilterChips, useAnalysis } from "../view/analysis"
import { useView } from "../view/ViewContext"
import type { SurveyConfig } from "../surveys/types"
import { SectionBody } from "../components/questions/SectionBody"
import { Button, Segmented } from "../components/ui/primitives"
import { BRAND } from "../lib/brand"
import { sectionTables } from "./tables"
import { buildMeta, exportFileName } from "./meta"
import type { ExportProgress } from "./pdf"

type Scope = "section" | "survey"
type Format = "pdf" | "xlsx"

// Exporta o que o usuário está vendo (mesmo recorte, comparação, público e
// filtros). Só resultados agregados: nenhuma linha de entrevistado sai do painel.
export function ExportDialog({ config, sectionId, onClose }: { config: SurveyConfig; sectionId?: string; onClose: () => void }) {
  const { session } = useAuth()
  const view = useView()
  const query = useSurveyData(config.id)
  const analysis = useAnalysis(config, query.data)
  const [scope, setScope] = useState<Scope>("section")
  const [format, setFormat] = useState<Format>("pdf")
  const [progress, setProgress] = useState<ExportProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const busy = progress !== null

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !busy && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [busy, onClose])

  useEffect(() => () => abort.current?.abort(), [])

  const sections = config.sections.filter(
    (section) => !section.audience || !config.audience || view.audience === "compare" || Number(view.audience) === section.audience,
  )
  const current = sections.find((section) => section.id === sectionId) ?? sections[0]
  const chosen = scope === "section" ? [current] : sections
  const chips = activeFilterChips(query.data, config, view.filters[config.id])

  const run = async () => {
    const ds = query.data
    if (!ds || !analysis || !session) return
    setError(null)
    const controller = new AbortController()
    abort.current = controller
    const meta = buildMeta(config, analysis, chips, session.user.identity)
    const fileName = exportFileName(meta, scope === "section" ? current.title : null, format)
    const indexOf = (id: string) => config.sections.findIndex((section) => section.id === id) + 1

    try {
      if (format === "xlsx") {
        setProgress({ done: 0, total: 1, label: "Montando as planilhas" })
        const { exportXlsx } = await import("./xlsx")
        await exportXlsx(
          meta,
          chosen.map((section) => ({
            index: indexOf(section.id),
            title: section.title,
            description: section.description,
            tables: sectionTables(config, section, ds, analysis),
          })),
          fileName,
        )
      } else {
        setProgress({ done: 0, total: chosen.length, label: "Preparando" })
        const { exportPdf } = await import("./pdf")
        await exportPdf(
          meta,
          chosen.map((section) => ({
            index: indexOf(section.id),
            title: section.title,
            description: section.description,
            element: <SectionBody config={config} section={section} ds={ds} analysis={analysis} exportMode />,
          })),
          fileName,
          setProgress,
          controller.signal,
        )
      }
      onClose()
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setError("Não foi possível gerar o arquivo. Tente novamente.")
      console.error(caught)
    } finally {
      setProgress(null)
      abort.current = null
    }
  }

  const percent = progress ? Math.round((progress.done / Math.max(1, progress.total)) * 100) : 0

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={() => !busy && onClose()} />
      <div role="dialog" aria-modal="true" aria-label="Exportar" className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Exportar</h2>
            <p className="mt-0.5 text-xs text-ink-3">
              {config.title} · {analysis ? analysis.series.map((item) => item.label).join(" × ") : ""}
              {chips.length ? ` · ${chips.length} filtro(s)` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => (busy ? abort.current?.abort() : onClose())}
            className="rounded-lg p-1 text-ink-3 hover:bg-plane hover:text-ink"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Conteúdo</p>
            <Segmented<Scope>
              ariaLabel="Conteúdo"
              value={scope}
              onChange={setScope}
              options={[
                { value: "section", label: "Esta seção" },
                { value: "survey", label: `Pesquisa inteira (${sections.length} seções)` },
              ]}
            />
            <p className="mt-1.5 text-[11px] text-ink-3">
              {scope === "section" ? `${current.title}` : `Todas as seções de ${config.title}`}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-ink-2">Formato</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "pdf", label: "PDF", hint: "Gráficos como na tela", icon: FileText },
                  { value: "xlsx", label: "Excel (.xlsx)", hint: "Tabelas com os números", icon: FileSpreadsheet },
                ] as const
              ).map((option) => {
                const Icon = option.icon
                const active = format === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormat(option.value)}
                    aria-pressed={active}
                    className={
                      active
                        ? "flex items-start gap-2.5 rounded-xl bg-navy-700/[0.06] p-3 text-left ring-2 ring-navy-700"
                        : "flex items-start gap-2.5 rounded-xl p-3 text-left ring-1 ring-line hover:bg-plane"
                    }
                  >
                    <Icon className="mt-0.5 h-5 w-5 text-navy-700" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold text-ink">{option.label}</span>
                      <span className="block text-[11px] text-ink-3">{option.hint}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          <p className="rounded-lg bg-plane px-3 py-2 text-[11px] leading-relaxed text-ink-2">
            O arquivo segue o recorte, a comparação e os filtros aplicados agora e traz só resultados agregados.
          </p>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-orange-800">
            <Lock className="h-3.5 w-3.5" aria-hidden /> {BRAND.disclaimer}
          </p>

          {busy && (
            <div role="status" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-plane">
                <div className="h-full rounded-full bg-navy-700 transition-[width] duration-300" style={{ width: `${Math.max(6, percent)}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-ink-2">
                {progress!.total > 1 ? `Gerando seção ${Math.min(progress!.done + 1, progress!.total)} de ${progress!.total}: ` : ""}
                {progress!.label}…
              </p>
            </div>
          )}
          {error && <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => (busy ? abort.current?.abort() : onClose())}>
            Cancelar
          </Button>
          <Button onClick={run} loading={busy} disabled={!query.data || !analysis}>
            <Download className="h-4 w-4" aria-hidden /> Exportar
          </Button>
        </div>
      </div>
    </div>
  )
}
