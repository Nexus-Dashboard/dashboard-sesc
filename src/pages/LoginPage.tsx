import { useState, type FormEvent } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"
import { Eye, EyeOff, Lock, User } from "lucide-react"
import { ApiError, needsPasswordChange, useAuth } from "../lib/auth/AuthContext"
import { Button } from "../components/ui/primitives"

const LOGIN_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "Usuário ou senha incorretos.",
  ACCOUNT_LOCKED: "Conta bloqueada temporariamente após várias tentativas. Tente novamente em 15 minutos.",
  ACCOUNT_DISABLED: "Esta conta está desativada. Fale com a equipe Nexus.",
  RATE_LIMITED: "Muitas tentativas a partir desta rede. Aguarde alguns minutos.",
  MISSING_FIELDS: "Informe usuário e senha.",
  NETWORK_ERROR: "Sem conexão com o servidor. Verifique sua internet.",
}

export function LoginPage() {
  const { status, session, login, notice, clearNotice } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [identity, setIdentity] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (status === "authenticated" && session) {
    return <Navigate to={needsPasswordChange(session) ? "/trocar-senha" : "/"} replace />
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    clearNotice()
    if (!identity.trim() || !password) {
      setError(LOGIN_MESSAGES.MISSING_FIELDS)
      return
    }
    setLoading(true)
    try {
      const next = await login(identity, password)
      const from = (location.state as { from?: string } | null)?.from
      navigate(needsPasswordChange(next) ? "/trocar-senha" : from || "/", { replace: true })
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : "NETWORK_ERROR"
      setError(LOGIN_MESSAGES[code] ?? (caught as Error).message)
      setPassword("")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <img src="/logo_sesc.svg" alt="Sesc" className="mb-10 h-auto w-56 lg:hidden" />
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">Acesse o painel</h2>
          <p className="mt-1.5 text-sm text-ink-2">Use o acesso individual do seu estado, fornecido pela equipe Nexus.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="Usuário" icon={<User className="h-4 w-4" />}>
              <input
                autoFocus
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="ex.: sesc-sp"
                value={identity}
                onChange={(event) => setIdentity(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-ink outline-none placeholder:text-ink-3"
              />
            </Field>
            <Field
              label="Senha"
              icon={<Lock className="h-4 w-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="rounded p-1 text-ink-3 hover:text-ink"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent py-3 text-sm text-ink outline-none"
              />
            </Field>

            {(error || notice) && (
              <p role="alert" className="rounded-xl bg-orange-50 px-3 py-2.5 text-sm text-orange-800 ring-1 ring-orange-200">
                {error ?? notice}
              </p>
            )}

            <Button type="submit" loading={loading} className="w-full py-3">
              Entrar
            </Button>
          </form>

          <p className="mt-8 text-xs leading-relaxed text-ink-3">
            Esqueceu a senha ou precisa de um novo acesso? Fale com a equipe Nexus: o reset é feito pelo administrador.
          </p>
          <div className="mt-10 flex items-center gap-2 text-[10px] uppercase tracking-widest text-ink-3">
            powered by
            <span className="rounded bg-navy-950 px-2 py-1">
              <img src="/logo-nexus.png" alt="Nexus" className="h-3 w-auto" />
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-brand-blue/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-brand-orange/20 blur-3xl" aria-hidden />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]" aria-hidden>
        <defs>
          <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M36 0H0V36" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      <img src="/logo_sesc.svg" alt="Sesc: A vida acontece com o Sesc · 80 anos" className="relative h-auto w-80 brightness-0 invert" />

      <div className="relative max-w-lg">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-orange">Pesquisa 2026</p>
        <h1 className="mt-3 text-5xl font-bold leading-[1.05] tracking-tight">Reputação &amp; Imagem</h1>
        <p className="mt-4 text-lg leading-relaxed text-white/75">
          A opinião da população brasileira e dos stakeholders sobre o Sesc, com a visão do Brasil, da sua região e do seu estado.
        </p>
        <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-white/15 pt-6">
          {[
            ["5.544", "entrevistas com a população"],
            ["539", "parlamentares e jornalistas"],
            ["27", "unidades da federação"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="text-3xl font-bold tabular-nums">{value}</dt>
              <dd className="mt-1 text-xs leading-snug text-white/60">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="relative text-xs text-white/40">Acesso restrito. Os dados exibidos respeitam o escopo do seu usuário.</p>
    </div>
  )
}

function Field({ label, icon, trailing, children }: { label: string; icon: React.ReactNode; trailing?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-2">{label}</span>
      <span className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 shadow-sm transition focus-within:border-brand-blue focus-within:ring-4 focus-within:ring-brand-blue/10">
        <span className="text-ink-3">{icon}</span>
        {children}
        {trailing}
      </span>
    </label>
  )
}
