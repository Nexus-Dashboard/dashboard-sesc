// Exportação em Excel (.xlsx): uma aba "Sobre" + uma aba por seção.
// A biblioteca só é carregada quando o usuário exporta.

import type { ExportCell, ExportTable } from "./tables"
import { formatDateTime, type ExportMeta } from "./meta"
import { BRAND } from "../lib/brand"

export interface XlsxSection {
  index: number
  title: string
  description: string
  tables: ExportTable[]
}

const NAVY = BRAND.accent
const HEADER_BG = "#E8EEF4"

function sheetName(index: number, title: string, used: Set<string>) {
  let name = `${String(index).padStart(2, "0")} ${title}`.replace(/[\/?*[\]:]/g, " ").slice(0, 31).trim()
  while (used.has(name)) name = `${name.slice(0, 28)} ${used.size}`
  used.add(name)
  return name
}

export async function exportXlsx(meta: ExportMeta, sections: XlsxSection[], fileName: string) {
  const { default: writeXlsxFile } = await import("write-excel-file/browser")
  type Cell = Record<string, unknown> | null

  const text = (value: string, extra: Record<string, unknown> = {}): Cell => ({ value, type: String, ...extra })
  const cell = (value: ExportCell): Cell => {
    if (value === null || value === undefined) return null
    if (typeof value === "string") return text(value, { wrap: true })
    if (typeof value === "number") return { value, type: Number, format: "#,##0" }
    return { value: value.value, type: Number, format: value.format === "pct" ? "0%" : "0.0" }
  }

  const about: Cell[][] = [
    [text(`${meta.client} · ${meta.title}`, { fontWeight: "bold", fontSize: 14, textColor: NAVY })],
    [text(meta.survey, { fontWeight: "bold" })],
    [],
    [text("Recorte", { fontWeight: "bold" }), text(meta.scope)],
    [text("Séries", { fontWeight: "bold" }), text(meta.series.map((item) => `${item.label} (n=${item.n})`).join(" · "))],
    ...(meta.audience ? [[text("Público", { fontWeight: "bold" }), text(meta.audience)]] : []),
    [text("Filtros", { fontWeight: "bold" }), text(meta.filters.length ? meta.filters.join(" · ") : "Nenhum")],
    [text("Usuário", { fontWeight: "bold" }), text(meta.user)],
    [text("Gerado em", { fontWeight: "bold" }), text(formatDateTime(meta.generatedAt))],
    [],
    [text("Nota", { fontWeight: "bold" }), text(meta.sampleNote, { wrap: true })],
    [
      text("Leitura", { fontWeight: "bold" }),
      text("Percentuais ponderados sobre quem respondeu a cada pergunta. As bases são o número de entrevistas (não ponderado).", { wrap: true }),
    ],
    [],
    [text(meta.disclaimer, { fontWeight: "bold", textColor: "#B4410C" })],
  ]

  const used = new Set<string>(["Sobre"])
  const sheets = sections.map((section) => {
    const data: Cell[][] = [
      [text(`${String(section.index).padStart(2, "0")} · ${section.title}`, { fontWeight: "bold", fontSize: 14, textColor: NAVY })],
      [text(section.description, { textColor: "#4A5565" })],
      [text(`${meta.survey} · Recorte: ${meta.scope}${meta.filters.length ? ` · Filtros: ${meta.filters.join(", ")}` : ""}`, { textColor: "#7A8494" })],
    ]
    let width = 2
    for (const table of section.tables) {
      width = Math.max(width, table.header.length, ...table.rows.map((row) => row.length))
      data.push([])
      data.push([text(`${table.code} · ${table.title}`, { fontWeight: "bold", textColor: NAVY })])
      if (table.question) data.push([text(table.question, { fontStyle: "italic", textColor: "#4A5565", wrap: false })])
      if (table.note) data.push([text(`Base: ${table.note}`, { textColor: "#7A8494" })])
      if (table.header.length) {
        data.push(table.header.map((label) => text(label, { fontWeight: "bold", backgroundColor: HEADER_BG, wrap: true })))
      }
      for (const row of table.rows) data.push(row.map(cell))
    }
    data.push([], [text(meta.disclaimer, { fontWeight: "bold", textColor: "#B4410C" })])
    return {
      sheet: sheetName(section.index, section.title, used),
      data: data as never,
      columns: [{ width: 46 }, ...Array.from({ length: width - 1 }, () => ({ width: 18 }))],
    }
  })

  await writeXlsxFile([{ sheet: "Sobre", data: about as never, columns: [{ width: 16 }, { width: 110 }] }, ...sheets]).toFile(fileName)
}
