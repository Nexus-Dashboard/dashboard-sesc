// Espelha api/utils/brazilRegions.js: região é sempre derivada da UF.

export type RegionSlug = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul"

export const UF_TO_REGION: Record<string, RegionSlug> = {
  AC: "norte", AP: "norte", AM: "norte", PA: "norte", RO: "norte", RR: "norte", TO: "norte",
  AL: "nordeste", BA: "nordeste", CE: "nordeste", MA: "nordeste", PB: "nordeste", PE: "nordeste",
  PI: "nordeste", RN: "nordeste", SE: "nordeste",
  DF: "centro-oeste", GO: "centro-oeste", MT: "centro-oeste", MS: "centro-oeste",
  ES: "sudeste", MG: "sudeste", RJ: "sudeste", SP: "sudeste",
  PR: "sul", RS: "sul", SC: "sul",
}

export const UF_LABELS: Record<string, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia", CE: "Ceará",
  DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás", MA: "Maranhão", MG: "Minas Gerais",
  MS: "Mato Grosso do Sul", MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte", RO: "Rondônia",
  RR: "Roraima", RS: "Rio Grande do Sul", SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo",
  TO: "Tocantins",
}

export const REGIONS: RegionSlug[] = ["norte", "nordeste", "centro-oeste", "sudeste", "sul"]

export const REGION_LABELS: Record<RegionSlug, string> = {
  norte: "Norte",
  nordeste: "Nordeste",
  "centro-oeste": "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
}

export const UFS = Object.keys(UF_LABELS).sort((a, b) => UF_LABELS[a].localeCompare(UF_LABELS[b], "pt-BR"))

export function ufsOfRegion(region: RegionSlug) {
  return UFS.filter((uf) => UF_TO_REGION[uf] === region)
}
