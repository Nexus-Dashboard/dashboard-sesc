import type { OptionGroup, Scale, TopBox } from "./types"

// Escalas de 5 pontos + NS/NR (códigos 1..6 do CODEBOOK, 1 = mais positivo)
const FIVE_PLUS_NS: Scale = { codes: [1, 2, 3, 4, 5, 6], roles: ["pos2", "pos1", "neu", "neg1", "neg2", "ns"] }

export const SCALES = {
  conhecimento: FIVE_PLUS_NS,
  confianca: FIVE_PLUS_NS,
  advocacy: FIVE_PLUS_NS,
  imagem: FIVE_PLUS_NS,
  importancia: FIVE_PLUS_NS,
  informacao: FIVE_PLUS_NS,
  qualidade: FIVE_PLUS_NS,
  /** Muita / Alguma / Pouca / Nenhuma falta + NS/NR */
  falta: { codes: [1, 2, 3, 4, 5], roles: ["pos2", "pos1", "neg1", "neg2", "ns"] } as Scale,
  /** Muito / Algum / Nenhum interesse + NS/NR */
  interesse: { codes: [1, 2, 3, 4], roles: ["pos2", "pos1", "neg2", "ns"] } as Scale,
  /** Concordância 1-5, exibida de "concorda" para "discorda" */
  concordancia: { codes: [5, 4, 3, 2, 1], roles: ["pos2", "pos1", "neu", "neg1", "neg2"] } as Scale,
  /** Sim / Não / NS/NR */
  simNao: { codes: [1, 2, 3], roles: ["pos1", "neg1", "ns"] } as Scale,
  simNaoSemNs: { codes: [1, 2], roles: ["pos1", "neg1"] } as Scale,
}

export const TOP_BOX = {
  conhecimento: { label: "Alto conhecimento", codes: [1, 2] },
  confianca: { label: "Alta confiança", codes: [1, 2] },
  advocacy: { label: "Promotores", codes: [1, 2] },
  imagem: { label: "Imagem positiva", codes: [1, 2] },
  importancia: { label: "Alta importância", codes: [1, 2] },
  informacao: { label: "Informados", codes: [1, 2] },
  qualidade: { label: "Ótima + boa", codes: [1, 2] },
  falta: { label: "Muita falta", codes: [1] },
  interesse: { label: "Tem interesse", codes: [1, 2] },
  concordancia: { label: "Concorda (4+5)", codes: [4, 5] },
  sim: { label: "Sim", codes: [1] },
} satisfies Record<string, TopBox>

/** Grupos de conhecimento usados no relatório (alto / algum / baixo) */
export const KNOWLEDGE_GROUPS: OptionGroup[] = [
  { key: "alto", label: "Alto (conhece muito bem / bem)", codes: [1, 2] },
  { key: "algum", label: "Conhece um pouco", codes: [3] },
  { key: "baixo", label: "Baixo (só de ouvir falar / nada)", codes: [4, 5] },
  { key: "ns", label: "NS/NR", codes: [6] },
]

export const INSTITUTIONS = ["Sesc", "Senac", "Sesi", "Senai", "Sebrae", "Sest", "Senat"]
