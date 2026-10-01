import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

export interface BarChartDatum {
  label: string
  value: number
}

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

/** Barres verticales légères (SVG pur, aucune dépendance), colorées avec les tokens du thème. */
export function BarChart({
  data,
  className,
  valueFormatter = (v: number) => String(v),
}: {
  data: BarChartDatum[]
  className?: string
  valueFormatter?: (value: number) => string
}) {
  const mounted = useMounted()
  const max = Math.max(1, ...data.map((d) => d.value))

  return (
    <div
      className={cn("flex h-48 gap-3", className)}
      // Graphique composite : role="img" + aria-label consolident les barres en une seule annonce
      // pour les lecteurs d'écran, au lieu de lire chaque barre séparément (pattern ARIA standard
      // pour les graphiques). Une vraie balise <img> n'aurait pas de sens ici (pas de fichier image).
      // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
      role="img"
      aria-label={data.map((d) => `${d.label} : ${valueFormatter(d.value)}`).join(", ")}
    >
      {data.map((d, i) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <span className="text-xs font-medium tabular-nums text-muted-foreground">{valueFormatter(d.value)}</span>
          <div className="flex min-h-0 w-full flex-1 items-end overflow-hidden rounded-t-md bg-muted">
            <div
              className="w-full rounded-t-md transition-[height] duration-700 ease-out"
              style={{
                height: mounted ? `${(d.value / max) * 100}%` : "0%",
                background: COLORS[i % COLORS.length],
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </div>
          <span className="max-w-full truncate text-xs text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  )
}
