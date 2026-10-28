import clsx from "clsx"
import { Download, Lock, LogOut, ShieldCheck, X } from "lucide-react"
import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { useAuth, isAdmin } from "../../lib/auth/AuthContext"
import { SURVEYS, SURVEY_ORDER } from "../../surveys"
import type { SurveyConfig } from "../../surveys/types"
import { useView } from "../../view/ViewContext"
import { BRAND } from "../../lib/brand"
import { unitName } from "../../lib/places"
import { StateFlag } from "../ui/StateFlag"
import { ExportDialog } from "../../export/ExportDialog"

export function SesLogo({ className }: { className?: string }) {
  // Logo oficial (preta) invertida para branco sobre o azul-marinho
  return <img src="/logo_sesc.svg" alt="Sesc: A vida acontece com o Sesc · 80 anos" className={clsx("brightness-0 invert", className)} />
}

export function Sidebar({
  config,
  sectionId,
  onNavigate,
  onClose,
}: {
  config: SurveyConfig | null
  sectionId?: string
  onNavigate?: () => void
  onClose?: () => void
}) {
  const { session, logout } = useAuth()
  const view = useView()
  const navigate = useNavigate()
  const admin = isAdmin(session)
  const [exporting, setExporting] = useState(false)
  // Exportação só existe dentro de uma pesquisa (não na tela de admin)
  const canExport = Boolean(config && sectionId)

  const goToSurvey = (id: SurveyConfig["id"]) => {
    const target = SURVEYS[id]
    const section = target.sections.find((item) => item.id === sectionId) ?? target.sections[0]
    navigate(`/${id}/${section.id}`)
    onNavigate?.()
  }

  const visibleSections = (config?.sections ?? []).filter(
    (section) => !section.audience || view.audience === "compare" || Number(view.audience) === section.audience,
  )

  return (
    <aside className="flex h-full w-72 flex-col bg-gradient-to-b from-navy-950 via-navy-900 to-navy-800 text-white">
      <div className="flex items-start justify-between gap-2 px-6 pb-5 pt-6">
        <div>
          <SesLogo className="h-auto w-52" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-orange">Reputação & Imagem · 2026</p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Fechar menu">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="px-4">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Pesquisa</p>
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1 ring-1 ring-white/10">
          {SURVEY_ORDER.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => goToSurvey(id)}
              className={clsx(
                "rounded-lg px-2 py-2 text-xs font-semibold transition",
                config?.id === id ? "bg-white text-navy-950 shadow" : "text-white/70 hover:bg-white/10 hover:text-white",
              )}
            >
              {SURVEYS[id].short}
            </button>
          ))}
        </div>
      </div>

      <nav className="mt-5 flex-1 overflow-y-auto px-4 pb-4" aria-label="Seções">
        <p className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Seções</p>
        <ul className="space-y-0.5">
          {visibleSections.map((section, index) => {
            const Icon = section.icon
            return (
              <li key={section.id}>
                <NavLink
                  to={`/${config!.id}/${section.id}`}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    clsx(
                      "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                      isActive ? "bg-white/10 font-semibold text-white ring-1 ring-white/15" : "text-white/70 hover:bg-white/5 hover:text-white",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className={clsx("text-[10px] font-bold tabular-nums", isActive ? "text-brand-orange" : "text-white/35")}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                      <span className="leading-tight">{section.title}</span>
                    </>
                  )}
                </NavLink>
              </li>
            )
          })}
        </ul>

        {admin && (
          <>
            <p className="px-2 pb-2 pt-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">Administração</p>
            <NavLink
              to="/admin/usuarios"
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  isActive ? "bg-white/10 font-semibold text-white ring-1 ring-white/15" : "text-white/70 hover:bg-white/5 hover:text-white",
                )
              }
            >
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Gestão de acessos
            </NavLink>
          </>
        )}
      </nav>

      <div className="space-y-3 border-t border-white/10 px-4 py-4">
        {canExport && (
          <button
            type="button"
            onClick={() => setExporting(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/10 px-3 py-2.5 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/15"
          >
            <Download className="h-4 w-4" aria-hidden />
            Exportar (PDF / Excel)
          </button>
        )}
        <p className="flex items-start gap-2 rounded-lg px-1 text-[11px] font-semibold leading-snug text-brand-orange">
          <Lock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {BRAND.disclaimer}
        </p>
        <div className="flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
          <StateFlag uf={admin ? null : session?.user.uf} fallback="NX" className="ring-white/25" />
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-semibold leading-tight" title={admin ? session?.user.name : unitName(session?.user.uf)}>
              {admin ? session?.user.name : unitName(session?.user.uf)}
            </p>
            <p className="truncate text-[11px] text-white/55">
              {admin ? "Administrador Nexus" : session?.user.identity}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest text-white/35">
          powered by
          <img src="/logo-nexus.png" alt="Nexus" className="h-3.5 w-auto opacity-80" />
        </div>
      </div>
      {exporting && config && <ExportDialog config={config} sectionId={sectionId} onClose={() => setExporting(false)} />}
    </aside>
  )
}
