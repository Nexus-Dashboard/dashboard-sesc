// Cálculos ponderados sobre o Dataset. Regras validadas contra os relatórios:
//  - todo resultado é ponderado (peso da pesquisa);
//  - a base exclui o código 0 (em branco = pergunta não feita) e inclui NS/NR;
//  - indicador e dimensões = média ponderada das colunas prontas.

import type { Codes, Dataset } from "./decode"
import { UF_TO_REGION, type RegionSlug } from "../lib/geo"

export type Mask = Uint8Array

export function fullMask(n: number): Mask {
  return new Uint8Array(n).fill(1)
}

export function andMask(a: Mask, b: Mask): Mask {
  const out = new Uint8Array(a.length)
  for (let i = 0; i < a.length; i++) out[i] = a[i] & b[i]
  return out
}

export function maskFromCodes(column: Codes | undefined, accepted: Iterable<number>, n: number): Mask {
  const out = new Uint8Array(n)
  if (!column) return out
  const set = new Set(accepted)
  for (let i = 0; i < n; i++) if (set.has(column[i])) out[i] = 1
  return out
}

export function countMask(mask: Mask) {
  let count = 0
  for (let i = 0; i < mask.length; i++) count += mask[i]
  return count
}

// ---------------------------------------------------------------- escopo geográfico

export type ScopeKey = { kind: "brasil" } | { kind: "region"; region: RegionSlug } | { kind: "uf"; uf: string }

export function scopeMask(ds: Dataset, scope: ScopeKey): Mask {
  if (scope.kind === "brasil") return fullMask(ds.n)
  const out = new Uint8Array(ds.n)

  if (ds.geo) {
    // state_user: só existem o próprio estado (2) e a própria região (>= 1)
    const own = ds.scope.level === "state" ? ds.scope : null
    if (!own) return out
    if (scope.kind === "uf" && scope.uf !== own.uf) return out
    if (scope.kind === "region" && scope.region !== own.region) return out
    const min = scope.kind === "uf" ? 2 : 1
    for (let i = 0; i < ds.n; i++) if (ds.geo[i] >= min) out[i] = 1
    return out
  }

  if (ds.uf) {
    const accepted = new Set<number>()
    ds.ufValues.forEach((uf, index) => {
      if (scope.kind === "uf" ? uf === scope.uf : UF_TO_REGION[uf] === scope.region) accepted.add(index + 1)
    })
    for (let i = 0; i < ds.n; i++) if (accepted.has(ds.uf[i])) out[i] = 1
  }
  return out
}

/** Região de cada linha (só para o admin, que recebe a UF) */
export function regionCodes(ds: Dataset, regions: RegionSlug[]): Uint8Array | null {
  if (!ds.uf) return null
  const byIndex = ds.ufValues.map((uf) => regions.indexOf(UF_TO_REGION[uf]) + 1)
  const out = new Uint8Array(ds.n)
  for (let i = 0; i < ds.n; i++) out[i] = ds.uf[i] ? byIndex[ds.uf[i] - 1] : 0
  return out
}

// ---------------------------------------------------------------- distribuições

export interface Distribution {
  /** soma dos pesos com resposta (código != 0) */
  base: number
  /** casos com resposta (não ponderado) */
  n: number
  /** peso acumulado por código */
  weights: Float64Array
}

export function distributionOf(codes: Codes | undefined, maxCode: number, ds: Dataset, mask: Mask): Distribution {
  const weights = new Float64Array(maxCode + 1)
  let base = 0
  let n = 0
  if (codes) {
    const w = ds.weight
    for (let i = 0; i < ds.n; i++) {
      if (!mask[i]) continue
      const code = codes[i]
      if (code === 0) continue
      weights[code] += w[i]
      base += w[i]
      n++
    }
  }
  return { base, n, weights }
}

export function distribution(ds: Dataset, column: string, mask: Mask): Distribution {
  return distributionOf(ds.codes[column], ds.maxCode[column] ?? 0, ds, mask)
}

export function share(dist: Distribution, codes: Iterable<number>) {
  if (!dist.base) return NaN
  let sum = 0
  for (const code of codes) sum += dist.weights[code] ?? 0
  return sum / dist.base
}

export interface MultiDistribution extends Distribution {
  byMention: Float64Array[]
}

// Pergunta de múltipla menção (P15_O1/O2, P36_O1..O3): cada linha conta uma
// vez por código mencionado; base = quem respondeu a 1ª menção
export function multiDistribution(ds: Dataset, columns: string[], mask: Mask): MultiDistribution {
  const max = Math.max(0, ...columns.map((column) => ds.maxCode[column] ?? 0))
  const weights = new Float64Array(max + 1)
  const byMention = columns.map(() => new Float64Array(max + 1))
  const first = ds.codes[columns[0]]
  const seen = new Uint8Array(max + 1)
  let base = 0
  let n = 0
  if (first) {
    for (let i = 0; i < ds.n; i++) {
      if (!mask[i] || first[i] === 0) continue
      const w = ds.weight[i]
      base += w
      n++
      seen.fill(0)
      columns.forEach((column, mention) => {
        const code = ds.codes[column]?.[i] ?? 0
        if (code === 0 || seen[code]) return
        seen[code] = 1
        weights[code] += w
        byMention[mention][code] += w
      })
    }
  }
  return { base, n, weights, byMention }
}

export interface MeanResult {
  mean: number
  base: number
  n: number
}

// Média de escala (ex.: concordância 1-5), ignorando brancos e NS/NR
export function codeMean(ds: Dataset, column: string, mask: Mask, min = 1, max = 5): MeanResult {
  const codes = ds.codes[column]
  let sum = 0
  let base = 0
  let n = 0
  if (codes) {
    for (let i = 0; i < ds.n; i++) {
      const code = codes[i]
      if (!mask[i] || code < min || code > max) continue
      sum += code * ds.weight[i]
      base += ds.weight[i]
      n++
    }
  }
  return { mean: base ? sum / base : NaN, base, n }
}

export function numMean(ds: Dataset, column: string, mask: Mask): MeanResult {
  const values = ds.nums[column]
  let sum = 0
  let base = 0
  let n = 0
  if (values) {
    for (let i = 0; i < ds.n; i++) {
      const value = values[i]
      if (!mask[i] || Number.isNaN(value)) continue
      sum += value * ds.weight[i]
      base += ds.weight[i]
      n++
    }
  }
  return { mean: base ? sum / base : NaN, base, n }
}

export function fold(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
}

// Resposta aberta: códigos cujo rótulo casa com o termo (sem caixa/acentos)
export function textCodesMatching(ds: Dataset, column: string, term: string) {
  const wanted = fold(term)
  const out: number[] = []
  ;(ds.texts[column] ?? []).forEach((label, index) => {
    if (fold(label) === wanted) out.push(index + 1)
  })
  return out
}
