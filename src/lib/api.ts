// Cliente HTTP da API Nexus (módulo /api/clients). Todo erro vira ApiError
// com o `code` da API: a interface decide pelo código, nunca pelo status.

const BASE_URL = (import.meta.env.VITE_API_URL || "https://api-nexus-dashboard.vercel.app").replace(/\/+$/, "")

export class ApiError extends Error {
  status: number
  code: string
  details?: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

// Códigos que significam "a sessão acabou": qualquer rota autenticada que os
// devolva derruba o login. INVALID_CREDENTIALS NÃO está aqui: na troca de
// senha ele quer dizer "senha atual incorreta" e a sessão continua válida.
export const SESSION_ENDED_CODES = new Set([
  "NO_TOKEN",
  "INVALID_TOKEN",
  "TOKEN_EXPIRED",
  "TOKEN_STALE",
  "ACCOUNT_DISABLED",
  "ACCOUNT_LOCKED",
  "NOT_AUTHENTICATED",
])

type Listener = (error: ApiError) => void
const sessionListeners = new Set<Listener>()

export function onSessionEnded(listener: Listener) {
  sessionListeners.add(listener)
  return () => {
    sessionListeners.delete(listener)
  }
}

let currentToken: string | null = null

export function setApiToken(token: string | null) {
  currentToken = token
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  auth?: boolean
  signal?: AbortSignal
}

export async function api<T>(path: string, { method = "GET", body, auth = true, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth && currentToken) headers.Authorization = `Bearer ${currentToken}`

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if ((error as Error).name === "AbortError") throw error
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível conectar ao servidor. Verifique sua conexão.")
  }

  const data = await response.json().catch(() => null)

  if (!response.ok || (data && data.success === false)) {
    const code = data?.code || (response.status === 429 ? "RATE_LIMITED" : `HTTP_${response.status}`)
    const message = data?.message || data?.error || "Erro inesperado. Tente novamente."
    const error = new ApiError(response.status, code, message, data)
    if (auth && SESSION_ENDED_CODES.has(code)) sessionListeners.forEach((listener) => listener(error))
    throw error
  }

  return data as T
}
