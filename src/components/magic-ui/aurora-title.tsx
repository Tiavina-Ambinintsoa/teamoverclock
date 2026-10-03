import type { ReactNode } from "react"

import { AuroraText } from "@/components/magic-ui/aurora-text"

const COLORS = ["var(--primary)", "var(--chart-2)", "var(--highlight)", "var(--primary)"]

/** AuroraText branché sur les couleurs du thème actif (titres de page). */
export function AuroraTitle({ children }: { children: ReactNode }) {
  return <AuroraText colors={COLORS}>{children}</AuroraText>
}
