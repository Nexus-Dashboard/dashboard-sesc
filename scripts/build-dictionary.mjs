// scripts/build-dictionary.mjs
//
// Gera src/surveys/dictionary/<pesquisa>.json a partir dos CODEBOOKs (xlsx).
// Os CODEBOOKs são lidos no lugar onde estão, sem cópia nem movimentação.
//
// Uso: npm run dictionary
//
// Cada CODEBOOK tem duas abas:
//   1. "Informações da variável": Variável | Posição (Coluna) | Rótulo
//   2. "Valores de variáveis":    Valor | Código | Rótulo (a variável só aparece na
//      primeira linha de cada bloco)

import { readFile, writeFile, mkdir } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import path from "node:path"
import XLSX from "xlsx"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT_DIR = path.join(ROOT, "src", "surveys", "dictionary")

const SOURCES = [
  { id: "populacao", file: "Nexus - Sesc - População - Reputação e Imagem - CODEBOOK.xlsx" },
  { id: "stakeholders", file: "Nexus - Sesc - Stakeholders - Reputação e Imagem - CODEBOOK.xlsx" },
]

function cellText(value) {
  return value === null || value === undefined ? "" : String(value)
}

function tidy(text) {
  return cellText(text)
    .replace(/&nbsp;/gi, " ")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// "6a" -> "6", "99,00a" -> "99", 3 -> "3"
function normalizeCode(raw) {
  const match = /^(\d+)/.exec(tidy(raw))
  return match ? String(Number(match[1])) : null
}

const NS_NR = "NS/NR"

function cleanValueLabel(raw) {
  let label = tidy(raw)
  label = label.replace(/\s*\((?:n[ãa]o ler)\)/gi, "")
  if (/^(n[ãa]o sabe\s*\/\s*n[ãa]o respondeu|ns\/nr)$/i.test(label)) return NS_NR
  if (/^prefere não responder\s*\/\s*não respondeu$/i.test(label)) return "Prefere não responder"
  if (/^outr[oa]s?\b.*(especifi|quais|anotar)/i.test(label)) return "Outros"
  label = label.replace(/^Muita importante$/i, "Muito importante")
  label = label.replace(/^1\s*-\s*Discorda totalmente$/i, "1 - Discorda totalmente")
  label = label.replace(/^5\s*-\s*Concorda totalmente$/i, "5 - Concorda totalmente")
  return label
}

// "P7 - Baseado em ... (ESTIMULADA E ÚNICA)" -> { text, instruction }
function splitQuestionLabel(raw) {
  let text = tidy(raw)
  if (!text || text === "<none>") return { text: "", instruction: "" }
  text = text.replace(/^[A-Z]{1,3}\d+[\w.]*\s+-\s+/, "")
  let instruction = ""
  const match = /\s*\(((?:ESTIMULADA|ESPONT[ÂA]NEA)[^)]*)\)\s*$/i.exec(text)
  if (match) {
    instruction = match[1]
    text = text.slice(0, match.index).trim()
  }
  text = text.replace(/\s*\((?:NÃO LER AS ALTERNAT\w*)\)/gi, "").replace(/:$/, "").trim()
  return { text, instruction }
}

async function readCodebook(file) {
  const workbook = XLSX.read(await readFile(path.join(ROOT, file)), { type: "buffer" })
  const [infoSheet, valuesSheet] = workbook.SheetNames.map((name) =>
    XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: null, raw: true }),
  )

  const variables = {}

  infoSheet.slice(2).forEach((row) => {
    const name = tidy(row[0])
    if (!name) return
    const rawLabel = tidy(row[2])
    const { text, instruction } = splitQuestionLabel(rawLabel)
    variables[name] = {
      position: Number(row[1]) || null,
      label: text,
      ...(instruction ? { instruction } : {}),
      rawLabel,
      values: {},
    }
  })

  let current = null
  valuesSheet.slice(2).forEach((row) => {
    const name = tidy(row[0])
    if (name) {
      current = name
      if (!variables[current]) variables[current] = { position: null, label: "", rawLabel: "", values: {} }
    }
    if (!current) return
    const code = normalizeCode(row[1])
    const label = tidy(row[2])
    if (code === null || !label) return
    variables[current].values[code] = cleanValueLabel(label)
  })

  return variables
}

await mkdir(OUT_DIR, { recursive: true })

for (const source of SOURCES) {
  const variables = await readCodebook(source.file)
  const output = {
    survey: source.id,
    source: source.file,
    generatedAt: new Date().toISOString(),
    variables,
  }
  const target = path.join(OUT_DIR, `${source.id}.json`)
  await writeFile(target, JSON.stringify(output, null, 2) + "\n", "utf8")
  const withValues = Object.values(variables).filter((variable) => Object.keys(variable.values).length).length
  console.log(`✔ ${source.id}: ${Object.keys(variables).length} variáveis (${withValues} com rótulos de valor) -> ${path.relative(ROOT, target)}`)
}
