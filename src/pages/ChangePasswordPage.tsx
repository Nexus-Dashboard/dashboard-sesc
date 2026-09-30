import { useMemo, useState, type FormEvent } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import clsx from "clsx"
import { Check, KeyRound, X } from "lucide-react"
import { ApiError, needsPasswordChange, useAuth } from "../lib/auth/AuthContext"
import { Button } from "../components/ui/primitives"
import { BrandPanel } from "./LoginPage"

// Espelha api/utils/clientPassword.js (validatePassword): o servidor valida de
// novo; aqui é só para o usuário ver as regras antes de enviar.
function passwordRules(password: string, current: string, terms: string[]) {
  const lower = password.toLowerCase()
  return [
    { ok: password.length >= 12, label: "Pelo menos 12 caracteres" },
    { ok: new Set(password).size >= 5, label: "Pelo menos 5 caracteres diferentes" },
    {
      ok: password.length > 0 && terms.every((term) => term.length < 2 || !lower.includes(term.toLowerCase())),
      label: `Não conter ${terms.filter((term) => term.length >= 2).map((term) => `"${term}"`).join(", ")}`,
    },
    { ok: password.length > 0 && password !== current, label: "Diferente da senha atual" },
  ]
}

export function ChangePasswordPage() {
  const { session, changePassword, logout, skipPasswordChangeInDev } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const terms = useMemo(() => {
    const user = session?.user
    if (!user) return []
    return [...new Set([user.client, user.login, user.uf ?? "", user.identity].filter(Boolean).map((term) => term.toLowerCase()))]
  }, [session])

  if (!session) return <Navigate to="/login" replace />
  const forced = needsPasswordChange(session)
  const rules = passwordRules(next, current, terms)
  const valid = rules.every((rule) => rule.ok) && next === confirm && current.length > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    setError(null)
    setLoading(true)
    try {
      await changePassword(current, next)
      navigate("/", { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === "INVALID_CREDENTIALS") setError("A senha atual está incorreta.")
      else if (caught instanceof ApiError && caught.code === "WEAK_PASSWORD") setError(caught.message)
      else setError((caught as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1.1fr_1fr]">
      <BrandPanel />
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-orange/15 text-brand-orange-deep">
            <KeyRound className="h-5 w-5" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-950">{forced ? "Crie sua senha pessoal" : "Trocar senha"}</h2>
          <p className="mt-1.5 text-sm text-ink-2">
            {forced
              ? "Este é o seu primeiro acesso com a senha provisória. Para continuar, defina uma senha nova, que só você saiba."
              : "Defina uma nova senha para o seu acesso."}
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <PasswordInput label="Senha atual (provisória)" value={current} onChange={setCurrent} autoComplete="current-password" />
            <PasswordInput label="Nova senha" value={next} onChange={setNext} autoComplete="new-password" />
            <ul className="space-y-1 rounded-xl bg-plane px-3.5 py-3 text-xs">
              {rules.map((rule) => (
                <li key={rule.label} className={clsx("flex items-center gap-2", rule.ok ? "text-emerald-700" : "text-ink-3")}>
                  {rule.ok ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
                  {rule.label}
                </li>
              ))}
            </ul>
            <PasswordInput label="Confirme a nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" />
            {confirm.length > 0 && confirm !== next && <p className="text-xs text-orange-700">As senhas não conferem.</p>}

            {error && (
              <p role="alert" className="rounded-xl bg-orange-50 px-3 py-2.5 text-sm text-orange-800 ring-1 ring-orange-200">
                {error}
              </p>
            )}

            <Button type="submit" loading={loading} disabled={!valid} className="w-full py-3">
              Salvar nova senha
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs">
            <button type="button" onClick={() => logout()} className="font-medium text-ink-3 hover:text-ink">
              Sair
            </button>
            {!forced && (
              <button type="button" onClick={() => navigate(-1)} className="font-medium text-ink-3 hover:text-ink">
                Cancelar
              </button>
            )}
            {import.meta.env.DEV && forced && (
              <button
                type="button"
                onClick={() => {
                  skipPasswordChangeInDev()
                  navigate("/", { replace: true })
                }}
                className="rounded-lg border border-dashed border-amber-400 px-2.5 py-1 font-medium text-amber-700 hover:bg-amber-50"
                title="Só existe em ambiente de desenvolvimento"
              >
                Pular (apenas dev)
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function PasswordInput({
  label,
  value,
  onChange,
  autoComplete,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-ink-2">{label}</span>
      <input
        type="password"
        value={value}
        autoComplete={autoComplete}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-line px-3.5 py-3 text-sm shadow-sm outline-none transition focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10"
      />
    </label>
  )
}
