// Grafia padrão das unidades: "Sesc em São Paulo", "Sesc no Rio de Janeiro",
// "Sesc na Bahia" (preposição + artigo que o nome de cada estado pede).

import { UF_LABELS } from "./geo"
import { BRAND } from "./brand"

type Preposition = "em" | "no" | "na"

const PREPOSITION: Record<string, Preposition> = {
  AC: "no", AP: "no", AM: "no", CE: "no", DF: "no", ES: "no", MA: "no", PA: "no",
  PR: "no", PI: "no", RJ: "no", RN: "no", RS: "no", TO: "no",
  BA: "na", PB: "na",
  AL: "em", GO: "em", MG: "em", MT: "em", MS: "em", PE: "em", RO: "em", RR: "em",
  SC: "em", SP: "em", SE: "em",
}

const OF: Record<Preposition, string> = { em: "de", no: "do", na: "da" }

/** "no Rio de Janeiro", "em São Paulo", "na Bahia" */
export function inState(uf: string) {
  const label = UF_LABELS[uf]
  return label ? `${PREPOSITION[uf] ?? "em"} ${label}` : uf
}

/** "do Rio de Janeiro", "de São Paulo", "da Bahia" */
export function ofState(uf: string) {
  const label = UF_LABELS[uf]
  return label ? `${OF[PREPOSITION[uf] ?? "em"]} ${label}` : uf
}

const CLIENT_NAMES: Record<string, string> = { sesc: "Sesc", senac: "Senac", nexus: "Nexus" }

/** "Sesc em São Paulo" (cliente do painel ou o informado) */
export function unitName(uf: string | null | undefined, client?: string) {
  const name = (client && CLIENT_NAMES[client]) || BRAND.name
  return uf ? `${name} ${inState(uf)}` : name
}
