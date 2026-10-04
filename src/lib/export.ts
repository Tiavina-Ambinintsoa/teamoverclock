export type ExportRow = Record<string, string>

function cellText(cell: Element): string {
  return (cell.textContent ?? "").replace(/\s+/g, " ").trim()
}

/** Lit les tableaux affichés ; à défaut, les listes de cartes (ul > li) de la zone de contenu. */
export function collectVisibleData(root: ParentNode): ExportRow[] {
  const rows: ExportRow[] = []
  root.querySelectorAll("table").forEach((table, tableIndex) => {
    const headers = Array.from(table.querySelectorAll("thead th")).map(cellText)
    table.querySelectorAll("tbody tr").forEach((tr) => {
      const cells = Array.from(tr.querySelectorAll("td")).map(cellText)
      if (cells.length === 0) return
      const row: ExportRow = {}
      cells.forEach((value, i) => {
        row[headers[i] || `col_${i + 1}`] = value
      })
      if (tableIndex > 0) row.table = String(tableIndex + 1)
      rows.push(row)
    })
  })
  if (rows.length > 0) return rows

  root.querySelectorAll("ul > li").forEach((li) => {
    if (li.closest("nav, header, footer, [role='navigation'], [aria-label*='readcrumb' i]")) return
    const text = cellText(li)
    if (text) rows.push({ item: text })
  })
  return rows
}

function csvEscape(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows: ExportRow[]): string {
  const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const lines = [columns.map(csvEscape).join(",")]
  for (const row of rows) lines.push(columns.map((column) => csvEscape(row[column] ?? "")).join(","))
  return `﻿${lines.join("\r\n")}`
}

export function toJson(rows: ExportRow[]): string {
  return JSON.stringify(rows, null, 2)
}

export function downloadFile(filename: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: `${mime};charset=utf-8` }))
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function exportFilename(pathname: string, extension: "csv" | "json"): string {
  const slug = pathname.replace(/^\/+|\/+$/g, "").replace(/[^a-z0-9]+/gi, "-") || "accueil"
  return `nova-terra-${slug}-${new Date().toISOString().slice(0, 10)}.${extension}`
}
