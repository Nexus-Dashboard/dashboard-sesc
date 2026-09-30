import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { useAuth } from "../lib/auth/AuthContext"
import type { ScopeKey } from "../data/engine"
import type { RegionSlug } from "../lib/geo"

export type SurveyId = "populacao" | "stakeholders"
/** stakeholders: público fixo (1 Legislativo, 2 Mídia) ou comparação dos dois */
export type AudienceMode = "compare" | number
/** filtros por pesquisa: id do filtro -> chaves selecionadas (código ou grupo) */
export type FilterState = Record<string, string[]>

interface ViewState {
  scope: ScopeKey
  compare: boolean
  audience: AudienceMode
  filters: Record<SurveyId, FilterState>
}

interface ViewContextValue extends ViewState {
  ownUF: string | null
  ownRegion: RegionSlug | null
  isAdmin: boolean
  setScope: (scope: ScopeKey) => void
  setCompare: (compare: boolean) => void
  setAudience: (audience: AudienceMode) => void
  setFilters: (survey: SurveyId, filters: FilterState) => void
}

const ViewContext = createContext<ViewContextValue | null>(null)

const STORAGE_PREFIX = "sesc-dash.view."

export function ViewProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const isAdmin = session?.user.role === "nexus_admin"
  const ownUF = isAdmin ? null : session?.user.uf ?? null
  const ownRegion = (isAdmin ? null : (session?.user.region as RegionSlug | null)) ?? null
  const storageKey = STORAGE_PREFIX + (session?.user.id ?? "anon")

  const initial = useMemo<ViewState>(() => {
    const fallback: ViewState = {
      scope: ownUF ? { kind: "uf", uf: ownUF } : { kind: "brasil" },
      compare: false,
      audience: "compare",
      filters: { populacao: {}, stakeholders: {} },
    }
    try {
      const stored = sessionStorage.getItem(storageKey)
      if (!stored) return fallback
      const parsed = JSON.parse(stored) as ViewState
      // Nunca confiar num escopo guardado fora do permitido
      if (!isAdmin && !allowedForState(parsed.scope, ownUF, ownRegion)) return fallback
      return { ...fallback, ...parsed }
    } catch {
      return fallback
    }
  }, [storageKey, isAdmin, ownUF, ownRegion])

  const [state, setState] = useState<ViewState>(initial)
  useEffect(() => setState(initial), [initial])

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state))
    } catch {
      // storage indisponível: estado fica só em memória
    }
  }, [state, storageKey])

  const setScope = useCallback(
    (scope: ScopeKey) => {
      if (!isAdmin && !allowedForState(scope, ownUF, ownRegion)) return
      setState((current) => ({ ...current, scope }))
    },
    [isAdmin, ownUF, ownRegion],
  )

  const value = useMemo<ViewContextValue>(
    () => ({
      ...state,
      ownUF,
      ownRegion,
      isAdmin,
      setScope,
      setCompare: (compare) => setState((current) => ({ ...current, compare })),
      setAudience: (audience) => setState((current) => ({ ...current, audience })),
      setFilters: (survey, filters) =>
        setState((current) => ({ ...current, filters: { ...current.filters, [survey]: filters } })),
    }),
    [state, ownUF, ownRegion, isAdmin, setScope],
  )

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>
}

function allowedForState(scope: ScopeKey, uf: string | null, region: RegionSlug | null) {
  if (scope.kind === "brasil") return true
  if (scope.kind === "region") return scope.region === region
  return scope.uf === uf
}

export function useView() {
  const context = useContext(ViewContext)
  if (!context) throw new Error("useView precisa estar dentro de <ViewProvider>")
  return context
}
