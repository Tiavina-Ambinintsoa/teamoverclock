import { Download } from "lucide-react"
import { useLocation } from "react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { collectVisibleData, downloadFile, exportFilename, toCsv, toJson } from "@/lib/export"
import { useLocale } from "@/lib/locale"

/** Exporte en CSV ou JSON les données affichées dans la zone de contenu (tableaux, sinon listes). */
export function ExportMenu() {
  const { pathname } = useLocation()
  const { tx } = useLocale()

  const run = (format: "csv" | "json") => {
    const root = document.getElementById("contenu")
    const rows = root ? collectVisibleData(root) : []
    if (rows.length === 0) {
      toast.info(tx("Aucune donnée à exporter sur cette page.", "No data to export on this page."))
      return
    }
    const content = format === "csv" ? toCsv(rows) : toJson(rows)
    downloadFile(exportFilename(pathname, format), content, format === "csv" ? "text/csv" : "application/json")
    toast.success(tx(`${rows.length} ligne(s) exportée(s).`, `${rows.length} row(s) exported.`))
  }

  return (
    <fieldset className="m-0 flex items-center gap-1 border-0 p-0" aria-label={tx("Exporter les données affichées", "Export displayed data")}>
      <Download className="size-4 text-muted-foreground" aria-hidden="true" />
      <Button type="button" size="sm" variant="ghost" onClick={() => run("csv")}>CSV</Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => run("json")}>JSON</Button>
    </fieldset>
  )
}
