import type { ScaleRole } from "../../surveys/types"

// Paleta derivada da marca Sesc (azul-marinho, azul, laranja).
// Séries validadas com o validador da skill de dataviz (fundo #ffffff):
// lightness, chroma, separação CVD e visão normal passam; contraste < 3:1 no
// azul-claro -> rótulos de valor sempre visíveis.
export const SERIES_COLORS = {
  geo: { brasil: "#1569A0", region: "#5AB0E5", uf: "#DD7A16" } as Record<"brasil" | "region" | "uf", string>,
  audience: ["#1569A0", "#DD7A16"],
}

export const SINGLE_SERIES = "#1569A0"
export const HIGHLIGHT = "#DD7A16"
export const RESIDUAL = "#A3ABB6"

// Divergente: azuis (positivo) <-> laranjas (negativo), neutro cinza claro,
// NS/NR cinza médio (sempre distinguível do neutro pela luminosidade)
export const ROLE_COLORS: Record<ScaleRole, string> = {
  pos2: "#0E5A8A",
  pos1: "#4E9FD6",
  neu: "#D3D9E0",
  neg1: "#F2A964",
  neg2: "#D5641B",
  ns: "#8A939F",
}

/** texto sobre o segmento: claro nos fundos escuros */
export const ROLE_TEXT: Record<ScaleRole, string> = {
  pos2: "#FFFFFF",
  pos1: "#FFFFFF",
  neu: "#27313F",
  neg1: "#3A2410",
  neg2: "#FFFFFF",
  ns: "#FFFFFF",
}

// Zonas do Indicador de Reputação & Imagem (relatório)
export const SCORE_ZONES = [
  { from: 0, to: 20, label: "Péssima", color: "#C9543A" },
  { from: 20, to: 40, label: "Ruim", color: "#E9965C" },
  { from: 40, to: 60, label: "Regular", color: "#E8D9A8" },
  { from: 60, to: 80, label: "Boa", color: "#7FB8E3" },
  { from: 80, to: 100.01, label: "Ótima", color: "#1569A0" },
]

export function zoneOf(score: number) {
  return SCORE_ZONES.find((zone) => score >= zone.from && score < zone.to) ?? SCORE_ZONES[0]
}
