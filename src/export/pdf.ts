// Exportação em PDF (download direto). Cada seção é montada fora da tela com
// os mesmos componentes do painel (SectionBody em exportMode), capturada como
// imagem e paginada em A4 paisagem. Os cortes de página caem sempre entre
// blocos (KPIs, cards), nunca no meio de um gráfico, salvo blocos maiores que
// uma página. jspdf e html-to-image só são carregados ao exportar.

import type { ReactElement } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"
import type { jsPDF as JsPdf } from "jspdf"
import { BRAND } from "../lib/brand"
import { formatDateTime, type ExportMeta } from "./meta"

export interface PdfSection {
  index: number
  title: string
  description: string
  element: ReactElement
}

export interface ExportProgress {
  done: number
  total: number
  label: string
}

const PAGE_W = 297
const PAGE_H = 210
const MARGIN = 10
const CONTENT_X = MARGIN
const CONTENT_W = PAGE_W - 2 * MARGIN
const CONTENT_TOP = 26
const CONTENT_BOTTOM = PAGE_H - 14
const RENDER_WIDTH = 1200
const PIXEL_RATIO = 2

const hexToRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
const NAVY = hexToRgb(BRAND.accent)
const INK: [number, number, number] = [15, 27, 45]
const MUTED: [number, number, number] = [122, 132, 148]
const WARN: [number, number, number] = [180, 65, 12]

interface Logo {
  data: string
  ratio: number
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))

async function loadLogo(src: string): Promise<Logo | null> {
  try {
    const image = new Image()
    image.src = src
    await image.decode()
    const width = Math.min(image.naturalWidth || 600, 900)
    const height = Math.round((width * (image.naturalHeight || 1)) / (image.naturalWidth || 1))
    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    canvas.getContext("2d")!.drawImage(image, 0, 0, width, height)
    return { data: canvas.toDataURL("image/png"), ratio: width / height }
  } catch {
    return null
  }
}

// Linhas de corte seguras (em px CSS, relativas ao topo do conteúdo): no meio
// do espaço entre um bloco e o seguinte, onde nenhum bloco é atravessado
function safeCuts(container: HTMLElement) {
  const origin = container.getBoundingClientRect().top
  const blocks = Array.from(container.querySelectorAll<HTMLElement>("[data-export-block]")).map((element) => {
    const rect = element.getBoundingClientRect()
    return { top: rect.top - origin, bottom: rect.bottom - origin }
  })
  const end = container.scrollHeight
  const cuts = new Set<number>([end])
  for (const block of blocks) {
    const y = block.bottom
    if (blocks.some((other) => other.top < y - 0.5 && other.bottom > y + 0.5)) continue
    const nextTop = Math.min(end, ...blocks.filter((other) => other.top >= y - 0.5).map((other) => other.top))
    cuts.add(Math.min(end, (y + nextTop) / 2))
  }
  return { cuts: [...cuts].sort((a, b) => a - b), end }
}

function drawHeader(doc: JsPdf, meta: ExportMeta, logo: Logo | null, section: PdfSection) {
  if (logo) doc.addImage(logo.data, "PNG", MARGIN, MARGIN - 1, 9 * logo.ratio, 9)
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...INK)
  doc.text(`${meta.client} · ${meta.title} · ${meta.survey}`, PAGE_W - MARGIN, MARGIN + 3, { align: "right" })
  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED)
  doc.text(`${String(section.index).padStart(2, "0")} · ${section.title}  ·  Recorte: ${meta.scope}`, PAGE_W - MARGIN, MARGIN + 7.5, { align: "right" })
  doc.setDrawColor(227, 231, 236).setLineWidth(0.3).line(MARGIN, MARGIN + 11, PAGE_W - MARGIN, MARGIN + 11)
}

function drawCover(doc: JsPdf, meta: ExportMeta, logo: Logo | null, sections: PdfSection[]) {
  doc.setFillColor(244, 246, 249).rect(0, 0, PAGE_W, PAGE_H, "F")
  doc.setFillColor(...NAVY).rect(0, 0, 8, PAGE_H, "F")
  if (logo) doc.addImage(logo.data, "PNG", 24, 24, 22 * logo.ratio, 22)

  doc.setFont("helvetica", "bold").setFontSize(30).setTextColor(...INK)
  doc.text(meta.title, 24, 74)
  doc.setFont("helvetica", "normal").setFontSize(16).setTextColor(...NAVY)
  doc.text(meta.survey, 24, 84)

  const content =
    sections.length === 1 ? `Seção ${String(sections[0].index).padStart(2, "0")} · ${sections[0].title}` : `Pesquisa completa (${sections.length} seções)`
  const lines: [string, string][] = [
    ["Conteúdo", content],
    ["Recorte", meta.series.map((item) => `${item.label} (n=${item.n.toLocaleString("pt-BR")})`).join("  ·  ")],
    ...(meta.audience ? ([["Público", meta.audience]] as [string, string][]) : []),
    ["Filtros", meta.filters.length ? meta.filters.join("  ·  ") : "Nenhum"],
    ["Gerado em", `${formatDateTime(meta.generatedAt)} por ${meta.user}`],
  ]
  let y = 104
  for (const [label, value] of lines) {
    doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...MUTED)
    doc.text(label.toUpperCase(), 24, y)
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(...INK)
    const wrapped = doc.splitTextToSize(value, PAGE_W - 24 - 70)
    doc.text(wrapped, 62, y)
    y += 8 + (wrapped.length - 1) * 5
  }

  doc.setFont("helvetica", "normal").setFontSize(8).setTextColor(...MUTED)
  doc.text(doc.splitTextToSize(meta.sampleNote, PAGE_W - 48), 24, PAGE_H - 34)

  doc.setFillColor(255, 244, 236).setDrawColor(...WARN).setLineWidth(0.3)
  doc.roundedRect(24, PAGE_H - 24, 112, 9, 2, 2, "FD")
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...WARN)
  doc.text(meta.disclaimer, 28, PAGE_H - 18.3)
}

function drawFooters(doc: JsPdf, meta: ExportMeta) {
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    doc.setPage(page)
    const y = PAGE_H - 6
    doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(...WARN)
    doc.text(meta.disclaimer, MARGIN, y)
    doc.setFont("helvetica", "normal").setTextColor(...MUTED)
    doc.text(`Gerado em ${formatDateTime(meta.generatedAt)} por ${meta.user}`, PAGE_W / 2, y, { align: "center" })
    doc.text(`Página ${page} de ${total}`, PAGE_W - MARGIN, y, { align: "right" })
  }
}

function addSection(doc: JsPdf, canvas: HTMLCanvasElement, cuts: number[], end: number, section: PdfSection, meta: ExportMeta, logo: Logo | null) {
  const mmPerPx = CONTENT_W / RENDER_WIDTH
  const slice = (from: number, to: number) => {
    const out = document.createElement("canvas")
    out.width = canvas.width
    out.height = Math.max(1, Math.round((to - from) * PIXEL_RATIO))
    out.getContext("2d")!.drawImage(canvas, 0, Math.round(from * PIXEL_RATIO), canvas.width, out.height, 0, 0, out.width, out.height)
    return out.toDataURL("image/jpeg", 0.9)
  }

  doc.addPage()
  drawHeader(doc, meta, logo, section)
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...INK)
  doc.text(section.title, CONTENT_X, CONTENT_TOP + 2)
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED)
  doc.text(doc.splitTextToSize(section.description, CONTENT_W), CONTENT_X, CONTENT_TOP + 8)
  let top = CONTENT_TOP + 13

  let y0 = 0
  while (y0 < end - 1) {
    const availablePx = (CONTENT_BOTTOM - top) / mmPerPx
    const fitting = cuts.filter((cut) => cut > y0 + 1 && cut <= y0 + availablePx)
    let y1 = fitting.length ? fitting[fitting.length - 1] : 0
    let scale = 1

    if (!y1) {
      // Bloco maior que o espaço da página: reduz se for até 60% maior; senão corta
      const next = cuts.find((cut) => cut > y0 + 1) ?? end
      if (next - y0 <= availablePx * 1.6) {
        y1 = next
        scale = availablePx / (next - y0)
      } else {
        y1 = Math.min(end, y0 + availablePx)
      }
    }

    const height = (y1 - y0) * mmPerPx * scale
    const width = CONTENT_W * scale
    doc.addImage(slice(y0, y1), "JPEG", CONTENT_X + (CONTENT_W - width) / 2, top, width, height, undefined, "FAST")
    y0 = y1
    if (y0 < end - 1) {
      doc.addPage()
      drawHeader(doc, meta, logo, section)
      top = CONTENT_TOP
    }
  }
}

export async function exportPdf(
  meta: ExportMeta,
  sections: PdfSection[],
  fileName: string,
  onProgress: (progress: ExportProgress) => void,
  signal: AbortSignal,
) {
  const [{ jsPDF }, htmlToImage] = await Promise.all([import("jspdf"), import("html-to-image")])
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4", compress: true })
  const logo = await loadLogo(BRAND.logo)

  const host = document.createElement("div")
  host.setAttribute("aria-hidden", "true")
  Object.assign(host.style, { position: "fixed", left: "-20000px", top: "0", width: `${RENDER_WIDTH}px`, pointerEvents: "none" })
  const container = document.createElement("div")
  container.style.width = `${RENDER_WIDTH}px`
  container.style.background = "#F4F6F9"
  container.style.padding = "4px"
  host.appendChild(container)
  document.body.appendChild(host)
  const root = createRoot(container)

  try {
    drawCover(doc, meta, logo, sections)
    let fontEmbedCSS: string | undefined
    for (const [position, section] of sections.entries()) {
      if (signal.aborted) throw new DOMException("Exportação cancelada", "AbortError")
      onProgress({ done: position, total: sections.length, label: section.title })
      flushSync(() => root.render(section.element))
      await document.fonts.ready
      await nextFrame()
      await wait(60)
      fontEmbedCSS ??= await htmlToImage.getFontEmbedCSS(container)
      const canvas = await htmlToImage.toCanvas(container, {
        pixelRatio: PIXEL_RATIO,
        backgroundColor: "#F4F6F9",
        fontEmbedCSS,
        width: RENDER_WIDTH,
      })
      const { cuts, end } = safeCuts(container)
      addSection(doc, canvas, cuts, end, section, meta, logo)
    }
    if (signal.aborted) throw new DOMException("Exportação cancelada", "AbortError")
    onProgress({ done: sections.length, total: sections.length, label: "Finalizando o arquivo" })
    drawFooters(doc, meta)
    doc.save(fileName)
  } finally {
    root.unmount()
    host.remove()
  }
}
