// Dicionário de rótulos. A base vem dos CODEBOOKs (JSON gerado por
// scripts/build-dictionary.mjs); aqui ficam só as exceções que o CODEBOOK
// não cobre, conferidas contra os dados e os relatórios.

import populacaoJson from "./populacao.json"
import stakeholdersJson from "./stakeholders.json"

interface VariableEntry {
  label: string
  instruction?: string
  values: Record<string, string>
}

export interface Dictionary {
  variables: Record<string, VariableEntry>
  /** coluna da planilha -> nome da variável no CODEBOOK */
  aliases: Record<string, string>
}

function build(json: { variables: Record<string, VariableEntry> }, aliases: Record<string, string>): Dictionary {
  return { variables: structuredClone(json.variables), aliases }
}

export const populacaoDictionary = build(populacaoJson, {
  Idade: "Idade_CAT",
  Filhos: "Filhos_CAT",
  "Região": "Região_CAT",
  PERFIL_USO: "P10_CAT",
})

// COR 99 existe nos dados mas não no CODEBOOK
populacaoDictionary.variables.COR.values["99"] = "Prefere não responder"
// edu_cotas vem sem acentos no CODEBOOK
Object.assign(populacaoDictionary.variables.edu_cotas.values, {
  "1": "Até fundamental completo",
  "2": "Até médio completo",
  "3": "Superior incompleto ou mais",
})
// PF13 8: o rótulo do CODEBOOK junta duas opções com " | "
populacaoDictionary.variables.PF13.values["8"] = "Religioso sem religião definida / Agnóstico"

export const stakeholdersDictionary = build(stakeholdersJson, {})

// P11R* e P18R* vêm sem o nome do item no CODEBOOK. Os itens são os mesmos da
// População (P20_* e T_P30_*), na mesma ordem: confirmado nos dados (P11 no
// Legislativo: Bibliotecas 33% e Combate à fome 34% de "não conhece nada",
// como no relatório de Stakeholders).
for (let k = 1; k <= 14; k++) {
  stakeholdersDictionary.variables[`P11R${k}`].label = populacaoDictionary.variables[`P20_${k}`].label
}
for (let k = 1; k <= 16; k++) {
  stakeholdersDictionary.variables[`P18R${k}`].label = populacaoDictionary.variables[`T_P30_${k}`].label
}

function entry(dictionary: Dictionary, column: string) {
  return dictionary.variables[dictionary.aliases[column] ?? column]
}

export function valueLabel(dictionary: Dictionary, column: string, code: number) {
  return entry(dictionary, column)?.values[String(code)] ?? `Código ${code}`
}

export function variableLabel(dictionary: Dictionary, column: string) {
  return entry(dictionary, column)?.label ?? column
}

export function valueCodes(dictionary: Dictionary, column: string) {
  return Object.keys(entry(dictionary, column)?.values ?? {})
    .map(Number)
    .sort((a, b) => a - b)
}
