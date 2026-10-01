import { ArrowDownRight, ArrowUpRight, Users, Wallet, Zap } from "lucide-react"

import { Container } from "@/components/layout/container"
import { BarChart } from "@/components/charts/bar-chart"
import { DonutChart } from "@/components/charts/donut-chart"
import { Sparkline } from "@/components/charts/sparkline"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useCountUp } from "@/hooks/use-count-up"
import { useMounted } from "@/hooks/use-mounted"
import { formatAriary } from "@/lib/format"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Tableau de bord : cartes KPI, graphiques (SVG pur, aucune dépendance ajoutée),
 * liste d'activité. Remplacez WEEKLY / SPLIT / ACTIVITY par vos données réelles (idéalement via
 * une fonction features/<x>/<x>-api.ts + un hook TanStack Query, comme features/items).
 */

const WEEKLY = [
  { label: "Lun", value: 42 },
  { label: "Mar", value: 58 },
  { label: "Mer", value: 51 },
  { label: "Jeu", value: 74 },
  { label: "Ven", value: 88 },
  { label: "Sam", value: 63 },
  { label: "Dim", value: 35 },
]

const SPLIT = [
  { label: "Mobile", value: 62 },
  { label: "Ordinateur", value: 31 },
  { label: "Tablette", value: 7 },
]

const ACTIVITY = [
  { who: "Voahangy R.", what: "a publié une note", when: "il y a 2 min" },
  { who: "Tojo M.", what: "a créé un compte", when: "il y a 18 min" },
  { who: "Fenosoa A.", what: "a supprimé une note", when: "il y a 1 h" },
  { who: "Hery L.", what: "a modifié son profil", when: "il y a 3 h" },
]

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  format = (n: number) => n.toLocaleString("fr-FR"),
  deltaPct,
  spark,
}: {
  icon: typeof Users
  label: string
  value: number
  suffix?: string
  /** Personnalise l'affichage du nombre animé (ex. formatAriary pour un montant). Par défaut : séparateurs de milliers. */
  format?: (value: number) => string
  deltaPct: number
  spark: number[]
}) {
  const mounted = useMounted()
  const count = useCountUp(value, mounted)
  const positive = deltaPct >= 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <Icon className="size-5 text-primary" aria-hidden />
          <Badge variant={positive ? "secondary" : "destructive"} className="gap-1">
            {positive ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(deltaPct)}%
          </Badge>
        </div>
        <p className="mt-3 font-display text-3xl font-semibold tabular-nums">
          {format(count)}
          {suffix}
        </p>
        <p className="text-sm text-muted-foreground">{label}</p>
        <Sparkline values={spark} className="mt-3 h-9 w-full" />
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  return (
    <Container className="py-10">
      <title>Modèle : Tableau de bord</title>
      <TemplateNotice title="Tableau de bord" usage="KPI, graphiques et activité récente — admin, statistiques, suivi" />

      <h1 className="text-3xl font-semibold sm:text-4xl">Tableau de bord</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">Chiffres d'exemple à remplacer par vos vraies données.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <KpiCard icon={Users} label="Utilisateurs actifs" value={1284} deltaPct={12} spark={[4, 6, 5, 8, 7, 9, 11]} />
        <KpiCard icon={Wallet} label="Revenu" value={2450000} format={formatAriary} deltaPct={8} spark={[10, 9, 12, 11, 14, 13, 16]} />
        <KpiCard icon={Zap} label="Actions aujourd'hui" value={342} deltaPct={-4} spark={[9, 11, 10, 8, 9, 7, 6]} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Activité cette semaine</CardTitle>
            <CardDescription>Actions par jour</CardDescription>
          </CardHeader>
          <CardContent>
            <BarChart data={WEEKLY} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appareils</CardTitle>
            <CardDescription>Répartition des visites</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <DonutChart segments={SPLIT} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {ACTIVITY.map((item, i) => (
              <li key={i} className="flex items-center justify-between px-6 py-3 text-sm">
                <span>
                  <span className="font-medium">{item.who}</span> <span className="text-muted-foreground">{item.what}</span>
                </span>
                <span className="text-xs text-muted-foreground">{item.when}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Container>
  )
}
