import { useMounted } from "@/hooks/use-mounted"
import { cn } from "@/lib/utils"

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const SIZE = 120
const STROKE = 16
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export interface DonutSegment {
  label: string
  value: number
}

/** Anneau de progression (un seul pourcentage) ou de répartition (plusieurs segments), en SVG pur. */
export function DonutChart({
  segments,
  centerLabel,
  className,
}: {
  segments: DonutSegment[]
  centerLabel?: string
  className?: string
}) {
  const mounted = useMounted()
  const total = Math.max(
    1,
    segments.reduce((sum, s) => sum + s.value, 0)
  )
  // Précalcul pur des décalages cumulés (pas de mutation pendant le rendu du JSX ci-dessous).
  const offsets: number[] = []
  segments.reduce((acc, s) => {
    offsets.push(acc)
    return acc + (s.value / total) * CIRCUMFERENCE
  }, 0)

  return (
    <div className={cn("inline-flex flex-col items-center gap-3", className)}>
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        // Voir la même justification que bar-chart.tsx : graphique composite, annonce consolidée.
        // eslint-disable-next-line jsx-a11y/prefer-tag-over-role
        role="img"
        aria-label={segments.map((s) => `${s.label} : ${s.value}`).join(", ")}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {segments.map((s, i) => {
            const fraction = s.value / total
            const dash = mounted ? fraction * CIRCUMFERENCE : 0
            return (
              <circle
                key={s.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-offsets[i]}
                strokeLinecap={segments.length > 1 ? "butt" : "round"}
                className="transition-[stroke-dasharray] duration-700 ease-out"
                style={{ transitionDelay: `${i * 80}ms` }}
              />
            )
          })}
        </g>
        {centerLabel && (
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-semibold">
            {centerLabel}
          </text>
        )}
      </svg>
      {segments.length > 1 && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {segments.map((s, i) => (
            <li key={s.label} className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} aria-hidden />
              {s.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
