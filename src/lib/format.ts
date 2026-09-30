const intFormat = new Intl.NumberFormat("pt-BR")
const oneDecimal = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

/** 0.591 -> "59%" (inteiro, como no relatório) */
export function pct(value: number) {
  if (!Number.isFinite(value)) return "–"
  return `${Math.round(value * 100)}%`
}

export function score(value: number) {
  return Number.isFinite(value) ? oneDecimal.format(value) : "–"
}

export function int(value: number) {
  return intFormat.format(Math.round(value))
}

export function points(delta: number) {
  if (!Number.isFinite(delta)) return ""
  const rounded = Math.round(delta * 100)
  return `${rounded > 0 ? "+" : ""}${rounded} p.p.`
}

export function date(iso: string | null | undefined) {
  if (!iso) return ""
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
}
