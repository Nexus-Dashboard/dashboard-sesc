import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { ApiError, api, onSessionEnded, setApiToken } from "../api"
import type { AuthResponse, ClientScope, ClientUser } from "../types"

// Token em sessionStorage: some ao fechar a aba e não é compartilhado entre
// abas. A API não usa cookies, só Bearer.
const STORAGE_KEY = "sesc-dash.session"
const REFRESH_MARGIN_MS = 10 * 60 * 1000

interface Session {
  token: string
  expiresAt: number
  user: ClientUser
  scope: ClientScope
  mustChangePassword: boolean
  devSkipPasswordChange?: boolean
}

type Status = "loading" | "anonymous" | "authenticated"

interface AuthContextValue {
  status: Status
  session: Session | null
  notice: string | null
  login: (identity: string, password: string) => Promise<Session>
  logout: (notice?: string) => void
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  skipPasswordChangeInDev: () => void
  clearNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStored(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Session
    return parsed.expiresAt > Date.now() ? parsed : null
  } catch {
    return null
  }
}

function store(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // modo privado / storage bloqueado: a sessão segue só em memória
  }
}

function fromResponse(response: AuthResponse, previous?: Session | null): Session {
  return {
    token: response.token,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: response.user,
    scope: response.scope,
    mustChangePassword: response.mustChangePassword ?? response.user.mustChangePassword,
    devSkipPasswordChange: previous?.devSkipPasswordChange,
  }
}

const SESSION_NOTICES: Record<string, string> = {
  TOKEN_EXPIRED: "Sua sessão expirou. Entre novamente.",
  TOKEN_STALE: "Suas permissões ou sua senha mudaram. Entre novamente.",
  ACCOUNT_DISABLED: "Esta conta foi desativada. Fale com a equipe Nexus.",
  ACCOUNT_LOCKED: "Conta temporariamente bloqueada por excesso de tentativas. Tente em 15 minutos.",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => readStored())
  const [status, setStatus] = useState<Status>(() => (readStored() ? "loading" : "anonymous"))
  const [notice, setNotice] = useState<string | null>(null)
  const sessionRef = useRef(session)
  sessionRef.current = session

  const apply = useCallback((next: Session | null) => {
    setApiToken(next?.token ?? null)
    store(next)
    setSession(next)
    setStatus(next ? "authenticated" : "anonymous")
  }, [])

  const logout = useCallback(
    (message?: string) => {
      apply(null)
      setNotice(message ?? null)
    },
    [apply],
  )

  // Revalida a sessão guardada (a conta pode ter sido desativada ou a UF trocada)
  useEffect(() => {
    const stored = readStored()
    if (!stored) return
    setApiToken(stored.token)
    api<{ user: ClientUser; scope: ClientScope }>("/api/clients/auth/me")
      .then(({ user, scope }) => apply({ ...stored, user, scope, mustChangePassword: user.mustChangePassword }))
      .catch(() => apply(null))
  }, [apply])

  useEffect(
    () => onSessionEnded((error) => logout(SESSION_NOTICES[error.code] ?? "Sua sessão terminou. Entre novamente.")),
    [logout],
  )

  // Renova o token antes de expirar (o /refresh exige token ainda válido)
  useEffect(() => {
    if (!session) return
    const delay = Math.max(session.expiresAt - Date.now() - REFRESH_MARGIN_MS, 5_000)
    const timer = window.setTimeout(() => {
      api<AuthResponse>("/api/clients/auth/refresh", { method: "POST" })
        .then((response) => apply(fromResponse(response, sessionRef.current)))
        .catch(() => undefined)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [session, apply])

  const login = useCallback(
    async (identity: string, password: string) => {
      const response = await api<AuthResponse>("/api/clients/auth/login", {
        method: "POST",
        auth: false,
        body: { identity: identity.trim().toLowerCase(), password },
      })
      const next = fromResponse(response)
      apply(next)
      setNotice(null)
      return next
    },
    [apply],
  )

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const response = await api<AuthResponse>("/api/clients/auth/change-password", {
        method: "PUT",
        body: { currentPassword, newPassword },
      })
      // O token antigo vira TOKEN_STALE: troca imediatamente
      apply({ ...fromResponse(response, sessionRef.current), mustChangePassword: false })
    },
    [apply],
  )

  const skipPasswordChangeInDev = useCallback(() => {
    if (!import.meta.env.DEV || !sessionRef.current) return
    apply({ ...sessionRef.current, devSkipPasswordChange: true })
  }, [apply])

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      notice,
      login,
      logout,
      changePassword,
      skipPasswordChangeInDev,
      clearNotice: () => setNotice(null),
    }),
    [status, session, notice, login, logout, changePassword, skipPasswordChangeInDev],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("useAuth precisa estar dentro de <AuthProvider>")
  return context
}

export function needsPasswordChange(session: Session | null) {
  return Boolean(session?.mustChangePassword && !(import.meta.env.DEV && session.devSkipPasswordChange))
}

export function isAdmin(session: Session | null) {
  return session?.user.role === "nexus_admin"
}

export { ApiError }
