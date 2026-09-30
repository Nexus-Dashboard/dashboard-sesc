import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import clsx from "clsx"
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  KeyRound,
  Lock,
  LockOpen,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldCheck,
  X,
} from "lucide-react"
import { api, ApiError } from "../../lib/api"
import type { ClientUser } from "../../lib/types"
import { REGION_LABELS, UFS, UF_LABELS, UF_TO_REGION, type RegionSlug } from "../../lib/geo"
import { useAuth } from "../../lib/auth/AuthContext"
import { Button, Card, EmptyState, Segmented, Skeleton } from "../../components/ui/primitives"
import { date, int } from "../../lib/format"

// Gestão de acessos (papel nexus_admin), sobre /api/clients/users.

interface Stats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  lockedUsers: number
  neverLoggedIn: number
  byClient: Record<string, number>
}

interface ListResponse {
  data: { users: ClientUser[]; pagination: { currentPage: number; totalPages: number; totalUsers: number; hasNext: boolean; hasPrev: boolean } }
}

interface Coverage {
  expected: number
  created: number
  missing: string[]
}

type ClientFilter = "sesc" | "senac" | "all"
type StatusFilter = "all" | "active" | "inactive"

function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : "Erro inesperado. Tente novamente."
}

export function UsersPage() {
  const client = useQueryClient()
  const { session } = useAuth()
  const [clientFilter, setClientFilter] = useState<ClientFilter>("sesc")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [search])
  useEffect(() => setPage(1), [clientFilter, status, debounced])

  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: () => api<{ stats: Stats }>("/api/clients/users/stats/overview") })
  const coverage = useQuery({
    queryKey: ["admin", "coverage", clientFilter],
    queryFn: () => api<Coverage>(`/api/clients/users/meta/expected-logins?client=${clientFilter}`),
    enabled: clientFilter !== "all",
  })

  const params = new URLSearchParams({ page: String(page), limit: "30" })
  if (clientFilter !== "all") params.set("client", clientFilter)
  if (status !== "all") params.set("isActive", String(status === "active"))
  if (debounced) params.set("search", debounced)

  const list = useQuery({
    queryKey: ["admin", "users", params.toString()],
    queryFn: () => api<ListResponse>(`/api/clients/users?${params}`),
    placeholderData: keepPreviousData,
  })

  const refresh = () => client.invalidateQueries({ queryKey: ["admin"] })

  const cards = [
    { label: "Acessos", value: stats.data?.stats.totalUsers },
    { label: "Ativos", value: stats.data?.stats.activeUsers },
    { label: "Bloqueados agora", value: stats.data?.stats.lockedUsers },
    { label: "Nunca entraram", value: stats.data?.stats.neverLoggedIn },
  ]

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-16 pt-7 sm:px-6 lg:px-10">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-orange">Administração</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-navy-950 sm:text-[28px]">
            <ShieldCheck className="h-7 w-7 text-navy-700" aria-hidden /> Gestão de acessos
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-2">
            Um acesso por estado para cada cliente. Senhas provisórias aparecem uma única vez: copie e envie por canal seguro.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create" })}>
          <Plus className="h-4 w-4" aria-hidden /> Novo acesso
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="p-4">
            <p className="text-xs font-semibold text-ink-3">{card.label}</p>
            {card.value === undefined ? <Skeleton className="mt-2 h-8 w-16" /> : <p className="mt-1 text-3xl font-bold tabular-nums text-navy-700">{int(card.value)}</p>}
          </Card>
        ))}
      </div>

      {clientFilter !== "all" && coverage.data && (
        <Card className="mt-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              Cobertura {clientFilter.toUpperCase()}: {coverage.data.created} de {coverage.data.expected} UFs com acesso
            </p>
            {coverage.data.missing.length === 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Todos os estados cobertos
              </span>
            ) : (
              <span className="text-xs text-orange-700">Faltam: {coverage.data.missing.join(", ")}</span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {UFS.map((uf) => (
              <span
                key={uf}
                title={UF_LABELS[uf]}
                className={clsx(
                  "rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  coverage.data!.missing.includes(uf) ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200" : "bg-navy-700/10 text-navy-700",
                )}
              >
                {uf}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card className="mt-4">
        <div className="flex flex-col gap-3 border-b border-line p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<ClientFilter>
              ariaLabel="Cliente"
              value={clientFilter}
              onChange={setClientFilter}
              size="sm"
              options={[
                { value: "sesc", label: "Sesc" },
                { value: "senac", label: "Senac" },
                { value: "all", label: "Todos" },
              ]}
            />
            <Segmented<StatusFilter>
              ariaLabel="Situação"
              value={status}
              onChange={setStatus}
              size="sm"
              options={[
                { value: "all", label: "Todos" },
                { value: "active", label: "Ativos" },
                { value: "inactive", label: "Inativos" },
              ]}
            />
          </div>
          <label className="flex items-center gap-2 rounded-xl border border-line px-3 lg:w-72">
            <Search className="h-4 w-4 text-ink-3" aria-hidden />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar login ou nome"
              className="w-full bg-transparent py-2 text-sm outline-none"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-plane/70 text-[11px] uppercase tracking-wide text-ink-3">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Acesso</th>
                <th className="px-4 py-2.5 font-semibold">UF / região</th>
                <th className="px-4 py-2.5 font-semibold">Situação</th>
                <th className="px-4 py-2.5 font-semibold">Último acesso</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody>
              {list.isPending &&
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={index} className="border-t border-line/70">
                    <td colSpan={5} className="px-4 py-3">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))}
              {list.data?.data.users.map((user) => (
                <tr key={user.id} className="border-t border-line/70 hover:bg-plane/50">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{user.identity}</p>
                    <p className="text-xs text-ink-3">
                      {user.name}
                      {user.role === "nexus_admin" && <span className="ml-1.5 rounded bg-navy-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">admin</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {user.uf ? (
                      <>
                        {UF_LABELS[user.uf]} <span className="text-ink-3">· {REGION_LABELS[user.region as RegionSlug]}</span>
                      </>
                    ) : (
                      <span className="text-ink-3">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      <StatusPill tone={user.isActive ? "ok" : "off"}>{user.isActive ? "Ativo" : "Inativo"}</StatusPill>
                      {user.isLocked && <StatusPill tone="warn">Bloqueado</StatusPill>}
                      {user.mustChangePassword && <StatusPill tone="info">Senha provisória</StatusPill>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-2">{user.lastLogin ? date(user.lastLogin) : <span className="text-ink-3">Nunca</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <IconAction title="Editar" onClick={() => setDialog({ kind: "edit", user })}>
                        <Pencil className="h-4 w-4" />
                      </IconAction>
                      <IconAction title="Resetar senha" onClick={() => setDialog({ kind: "reset", user })}>
                        <KeyRound className="h-4 w-4" />
                      </IconAction>
                      {user.isLocked && (
                        <IconAction title="Desbloquear" onClick={() => setDialog({ kind: "unlock", user })}>
                          <LockOpen className="h-4 w-4" />
                        </IconAction>
                      )}
                      {user.id !== session?.user.id && (
                        <IconAction title={user.isActive ? "Desativar" : "Ativar"} onClick={() => setDialog({ kind: "status", user })}>
                          {user.isActive ? <Power className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                        </IconAction>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.data && list.data.data.users.length === 0 && <EmptyState title="Nenhum acesso encontrado">Ajuste a busca ou os filtros.</EmptyState>}
          {list.isError && <EmptyState title="Não foi possível carregar os acessos">{errorMessage(list.error)}</EmptyState>}
        </div>

        {list.data && list.data.data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-ink-2">
            <span>
              Página {list.data.data.pagination.currentPage} de {list.data.data.pagination.totalPages} · {int(list.data.data.pagination.totalUsers)} acessos
            </span>
            <div className="flex gap-1">
              <IconAction title="Anterior" disabled={!list.data.data.pagination.hasPrev} onClick={() => setPage((value) => value - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </IconAction>
              <IconAction title="Próxima" disabled={!list.data.data.pagination.hasNext} onClick={() => setPage((value) => value + 1)}>
                <ChevronRight className="h-4 w-4" />
              </IconAction>
            </div>
          </div>
        )}
      </Card>

      {dialog && <UserDialog dialog={dialog} onClose={() => setDialog(null)} onDone={refresh} />}
    </div>
  )
}

function StatusPill({ tone, children }: { tone: "ok" | "off" | "warn" | "info"; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
        tone === "ok" && "bg-emerald-50 text-emerald-700",
        tone === "off" && "bg-slate-100 text-slate-600",
        tone === "warn" && "bg-orange-50 text-orange-700",
        tone === "info" && "bg-sky-50 text-sky-700",
      )}
    >
      {children}
    </span>
  )
}

function IconAction({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-lg p-2 text-ink-3 transition hover:bg-plane hover:text-navy-700 disabled:opacity-40"
    >
      {children}
    </button>
  )
}

// ---------------------------------------------------------------- diálogos

type Dialog =
  | { kind: "create" }
  | { kind: "edit"; user: ClientUser }
  | { kind: "reset"; user: ClientUser }
  | { kind: "unlock"; user: ClientUser }
  | { kind: "status"; user: ClientUser }

function UserDialog({ dialog, onClose, onDone }: { dialog: Dialog; onClose: () => void; onDone: () => void }) {
  const [temporaryPassword, setTemporaryPassword] = useState<{ identity: string; password: string } | null>(null)

  if (temporaryPassword) {
    return <TemporaryPasswordDialog {...temporaryPassword} onClose={onClose} />
  }

  switch (dialog.kind) {
    case "create":
      return (
        <UserForm
          onClose={onClose}
          onSaved={(user, password) => {
            onDone()
            if (password) setTemporaryPassword({ identity: user.identity, password })
            else onClose()
          }}
        />
      )
    case "edit":
      return <UserForm user={dialog.user} onClose={onClose} onSaved={() => (onDone(), onClose())} />
    case "reset":
      return (
        <ConfirmDialog
          title={`Resetar a senha de ${dialog.user.identity}?`}
          body="Uma senha provisória nova será gerada, as sessões abertas desse acesso serão encerradas e o usuário terá de criar uma senha pessoal no próximo login."
          confirmLabel="Gerar senha provisória"
          action={() => api<{ temporaryPassword?: string }>(`/api/clients/users/${dialog.user.id}/reset-password`, { method: "POST", body: {} })}
          onSuccess={(result) => {
            onDone()
            if (result.temporaryPassword) setTemporaryPassword({ identity: dialog.user.identity, password: result.temporaryPassword })
            else onClose()
          }}
          onClose={onClose}
        />
      )
    case "unlock":
      return (
        <ConfirmDialog
          title={`Desbloquear ${dialog.user.identity}?`}
          body="O contador de tentativas é zerado e o acesso volta a funcionar imediatamente."
          confirmLabel="Desbloquear"
          action={() => api(`/api/clients/users/${dialog.user.id}/unlock`, { method: "POST" })}
          onSuccess={() => (onDone(), onClose())}
          onClose={onClose}
        />
      )
    case "status": {
      const deactivate = dialog.user.isActive
      return (
        <ConfirmDialog
          title={`${deactivate ? "Desativar" : "Reativar"} ${dialog.user.identity}?`}
          body={
            deactivate
              ? "O acesso deixa de funcionar na hora, inclusive sessões já abertas. É possível reativar depois."
              : "O acesso volta a funcionar com a senha atual."
          }
          confirmLabel={deactivate ? "Desativar acesso" : "Reativar acesso"}
          danger={deactivate}
          action={() => api(`/api/clients/users/${dialog.user.id}/status`, { method: "PATCH", body: { isActive: !deactivate } })}
          onSuccess={() => (onDone(), onClose())}
          onClose={onClose}
        />
      )
    }
  }
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-navy-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-ink-3 hover:bg-plane hover:text-ink" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function ConfirmDialog<T>({
  title,
  body,
  confirmLabel,
  danger,
  action,
  onSuccess,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  danger?: boolean
  action: () => Promise<T>
  onSuccess: (result: T) => void
  onClose: () => void
}) {
  const mutation = useMutation({ mutationFn: action, onSuccess })
  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-ink-2">{body}</p>
      {mutation.isError && <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">{errorMessage(mutation.error)}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant={danger ? "danger" : "primary"} loading={mutation.isPending} onClick={() => mutation.mutate()}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

function UserForm({
  user,
  onClose,
  onSaved,
}: {
  user?: ClientUser
  onClose: () => void
  onSaved: (user: ClientUser, temporaryPassword?: string) => void
}) {
  const editing = Boolean(user)
  const [client, setClient] = useState<"sesc" | "senac">((user?.client as "sesc" | "senac") ?? "sesc")
  const [uf, setUf] = useState(user?.uf ?? "")
  const [login, setLogin] = useState(user?.login ?? "")
  const [name, setName] = useState(user?.name ?? "")
  const [loginTouched, setLoginTouched] = useState(false)

  // Sugestão do padrão do seeder: login = UF minúscula, nome = "SESC São Paulo"
  useEffect(() => {
    if (editing || !uf) return
    if (!loginTouched) setLogin(uf.toLowerCase())
    setName(`${client.toUpperCase()} ${UF_LABELS[uf]}`)
  }, [client, uf, editing, loginTouched])

  const loginValid = /^[a-z0-9][a-z0-9._-]{0,30}$/.test(login)
  // A API responde 500 para UF inválida: só envia UF da lista
  const ufValid = UFS.includes(uf)
  const valid = ufValid && name.trim().length > 0 && (editing || loginValid)

  const mutation = useMutation({
    mutationFn: async () => {
      if (editing) {
        const result = await api<{ user: ClientUser }>(`/api/clients/users/${user!.id}`, { method: "PUT", body: { name: name.trim(), uf } })
        return { user: result.user, temporaryPassword: undefined }
      }
      return api<{ user: ClientUser; temporaryPassword?: string }>("/api/clients/users", {
        method: "POST",
        body: { client, login, name: name.trim(), uf, role: "state_user" },
      })
    },
    onSuccess: (result) => onSaved(result.user, result.temporaryPassword),
  })

  const region = useMemo(() => (ufValid ? REGION_LABELS[UF_TO_REGION[uf]] : null), [uf, ufValid])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (valid) mutation.mutate()
  }

  return (
    <Modal title={editing ? `Editar ${user!.identity}` : "Novo acesso estadual"} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {!editing && (
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-ink-2">Cliente</span>
            <Segmented
              ariaLabel="Cliente"
              value={client}
              onChange={setClient}
              options={[
                { value: "sesc", label: "Sesc" },
                { value: "senac", label: "Senac" },
              ]}
            />
          </div>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">Estado (UF)</span>
          <select
            value={uf}
            onChange={(event) => setUf(event.target.value)}
            className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Selecione…</option>
            {UFS.map((item) => (
              <option key={item} value={item}>
                {UF_LABELS[item]} ({item})
              </option>
            ))}
          </select>
          {region && <span className="mt-1 block text-[11px] text-ink-3">Região {region}: derivada automaticamente da UF.</span>}
        </label>
        {!editing && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-ink-2">Login</span>
            <div className="flex items-center rounded-xl border border-line focus-within:ring-2 focus-within:ring-brand-blue/30">
              <span className="pl-3 text-sm text-ink-3">{client}-</span>
              <input
                value={login}
                onChange={(event) => {
                  setLoginTouched(true)
                  setLogin(event.target.value.toLowerCase())
                }}
                className="w-full bg-transparent py-2.5 pr-3 text-sm outline-none"
              />
            </div>
            {!loginValid && login && <span className="mt-1 block text-[11px] text-orange-700">Use letras minúsculas, números, ponto, hífen ou sublinhado.</span>}
          </label>
        )}
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-ink-2">Nome de exibição</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
            className="w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </label>
        {editing && user?.uf !== uf && ufValid && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Trocar a UF encerra as sessões abertas desse acesso.</p>
        )}
        {!editing && <p className="text-xs text-ink-3">A senha provisória é gerada pelo servidor e mostrada uma única vez.</p>}
        {mutation.isError && <p className="rounded-lg bg-orange-50 px-3 py-2 text-sm text-orange-800">{errorMessage(mutation.error)}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!valid} loading={mutation.isPending}>
            {editing ? "Salvar" : "Criar acesso"}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function TemporaryPasswordDialog({ identity, password, onClose }: { identity: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Usuário: ${identity}\nSenha provisória: ${password}`)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <Modal title="Senha provisória gerada" onClose={onClose}>
      <p className="text-sm text-ink-2">
        Envie para o responsável por <strong>{identity}</strong> por um canal seguro. Ela <strong>não será mostrada novamente</strong>; no primeiro acesso, o usuário cria a senha pessoal.
      </p>
      <div className="mt-4 rounded-xl bg-navy-950 px-4 py-3 font-mono text-lg tracking-wider text-white">{password}</div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden /> {copied ? "Copiado" : "Copiar usuário e senha"}
        </Button>
        <Button onClick={onClose}>Concluir</Button>
      </div>
    </Modal>
  )
}
