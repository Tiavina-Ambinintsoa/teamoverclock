import { useState } from "react"
import { Play, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { ConfirmDialog } from "@/components/confirm-dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Avatar } from "@/components/ui/avatar"
import { Breadcrumb } from "@/components/ui/breadcrumb"
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/empty-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { useTheme } from "@/components/theme-context"
import { ModeToggle, MorphismPicker, PresetPicker, TypographyPicker } from "@/components/theme-switcher"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useNow } from "@/hooks/use-now"
import { env } from "@/lib/env"
import { formatAriary, formatDuration } from "@/lib/format"
import { PRESETS } from "@/lib/presets"
import { safeStorage } from "@/lib/storage"
import { isBackendConfigured } from "@/lib/supabase"
import { cn } from "@/lib/utils"

/** Page d'outils pour l'équipe : NE PAS la montrer au jury (VITE_ENABLE_KIT=false en production). */

const TOKENS = ["background", "foreground", "primary", "secondary", "muted", "accent", "highlight", "destructive", "border"]

const CHRONO_KEY = "webcup:chrono-start"
const DAY_MS = 24 * 3600 * 1000

// Même découpage que docs/02-plan-24h.md
const PHASES = [
  { until: 1, label: "Comprendre le sujet : lire, noter les exigences, ne pas coder" },
  { until: 2, label: "Concevoir : données, écrans, direction artistique, rôles" },
  { until: 3, label: "Squelette et premier déploiement sur le serveur HODI" },
  { until: 11, label: "Construire les parcours, un par un, de bout en bout" },
  { until: 14, label: "Point mi-parcours, relais de sommeil, réduire le périmètre si besoin" },
  { until: 18, label: "Terminer les parcours, effet waouh, vrais contenus" },
  { until: 21, label: "Gel des fonctionnalités : finition, tests mobile, accessibilité" },
  { until: 23, label: "Dossier jury, vidéo, déploiement final" },
  { until: 24, label: "Verrouillage : rien de nouveau, vérifier l'URL finale" },
]

function Chrono() {
  const [start, setStart] = useState<number | null>(() => {
    const value = Number(safeStorage.get(CHRONO_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  })
  const now = useNow(1000)

  const begin = () => {
    const value = Date.now()
    safeStorage.set(CHRONO_KEY, String(value))
    setStart(value)
  }
  const reset = () => {
    safeStorage.remove(CHRONO_KEY)
    setStart(null)
  }

  const elapsed = start === null ? 0 : now - start
  const remaining = DAY_MS - elapsed
  const phase = PHASES.find((item) => elapsed / 3_600_000 < item.until) ?? PHASES[PHASES.length - 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chrono 24h</CardTitle>
        <CardDescription>À lancer à l'annonce du sujet, à garder ouvert sur un écran de l'équipe.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="font-display text-5xl font-semibold tabular-nums sm:text-7xl" aria-live="off">
          {start === null ? "24:00:00" : formatDuration(remaining)}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {start === null ? "Pas encore lancé." : `Écoulé : ${formatDuration(elapsed)}`}
        </p>
        {start !== null && <p className="mt-4 font-medium">{remaining > 0 ? phase.label : "Temps écoulé : le serveur est coupé."}</p>}
      </CardContent>
      <CardFooter className="gap-2">
        <Button onClick={begin} disabled={start !== null}>
          <Play />
          Lancer le chrono
        </Button>
        <Button variant="outline" onClick={reset} disabled={start === null}>
          <RotateCcw />
          Remettre à zéro
        </Button>
      </CardFooter>
    </Card>
  )
}

export function KitPage() {
  const { preset, setPreset, mode, resolvedMode, typography, morphism } = useTheme()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [demoPage, setDemoPage] = useState(1)
  const [switchDemo, setSwitchDemo] = useState(true)
  const [sliderDemo, setSliderDemo] = useState(62)

  const diagnostics: [string, string][] = [
    ["Backend", isBackendConfigured ? "Supabase configuré" : "Mode démo local (Supabase absent)"],
    ["Compte démo jury", env.demoEmail && env.demoPassword ? "Renseigné (VITE_DEMO_*)" : "Non renseigné : utilisateur local"],
    ["Routeur", env.hashRouter ? "Hash (/#/route), aucune réécriture serveur requise" : "Navigateur (nécessite .htaccess ou équivalent)"],
    ["Base d'URL", import.meta.env.BASE_URL],
    ["Environnement", import.meta.env.DEV ? "Développement" : "Production"],
    ["Thème actif", `${preset}, ${mode === "system" ? `système (${resolvedMode})` : mode}`],
    ["Police active", typography],
    ["Morphisme actif", morphism],
  ]

  return (
    <Container className="py-10">
      <title>Kit d'équipe</title>
      <PageHeader
        title="Kit d'équipe"
        description="Galerie de composants, palettes, chrono et diagnostics. Cachez cette page pour le rendu au jury."
        className="mb-10"
        actions={<div className="flex flex-wrap items-center gap-2"><PresetPicker /><TypographyPicker /><MorphismPicker /><ModeToggle /></div>}
      />

      <section aria-labelledby="palettes" className="mb-14">
        <h2 id="palettes" className="mb-2 text-2xl font-semibold">
          Palettes
        </h2>
        <p className="mb-6 max-w-prose text-muted-foreground">
          Choisissez celle qui colle au sujet révélé. Les aperçus suivent le mode clair ou sombre.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              data-theme={item.id}
              onClick={() => setPreset(item.id)}
              aria-pressed={preset === item.id}
              className={cn(
                "rounded-(--radius) border bg-background p-4 text-left text-foreground transition-shadow",
                preset === item.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
              )}
            >
              <span className="font-display text-3xl font-semibold">Aa</span>
              <span className="mt-3 flex gap-1.5" aria-hidden>
                <span className="size-5 rounded-full bg-primary" />
                <span className="size-5 rounded-full bg-highlight" />
                <span className="size-5 rounded-full bg-secondary ring-1 ring-border" />
                <span className="size-5 rounded-full bg-foreground" />
              </span>
              <span className="mt-3 block font-medium">{item.label}</span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.hint}</span>
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
          {TOKENS.map((token) => (
            <div key={token}>
              <div className="h-12 rounded-md border" style={{ background: `var(--${token})` }} />
              <p className="mt-1 text-xs text-muted-foreground">{token}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="mb-14" />

      <section aria-labelledby="typo" className="mb-14">
        <h2 id="typo" className="mb-6 text-2xl font-semibold">
          Typographie
        </h2>
        <div className="grid gap-4">
          <p className="font-display text-5xl font-semibold sm:text-6xl">Titre principal</p>
          <p className="font-display text-3xl font-semibold">Titre de section</p>
          <p className="font-display text-xl font-semibold">Titre de bloc</p>
          <p className="max-w-prose text-base leading-relaxed">
            Texte courant en Instrument Sans. Gardez des lignes de moins de 80 caractères et un contraste suffisant.
            Prix affiché à la malgache : {formatAriary(50000)}.
          </p>
          <p className="text-sm text-muted-foreground">Texte secondaire, légendes, aides à la saisie.</p>
        </div>
      </section>

      <Separator className="mb-14" />

      <section aria-labelledby="composants" className="mb-14">
        <h2 id="composants" className="mb-6 text-2xl font-semibold">
          Composants
        </h2>

        <div className="mb-8 flex flex-wrap items-center gap-3">
          <Button>Principal</Button>
          <Button variant="secondary">Secondaire</Button>
          <Button variant="outline">Contour</Button>
          <Button variant="ghost">Discret</Button>
          <Button variant="highlight">Accent</Button>
          <Button variant="soft">Doux</Button>
          <Button variant="destructive">Supprimer</Button>
          <Button variant="link">Lien</Button>
          <Button variant="gradient">Dégradé</Button>
          <Button variant="glass">Verre</Button>
          <Button variant="inverse">Inversé</Button>
          <Button shape="rounded">Arrondi</Button>
          <Button shape="squircle">Squircle</Button>
          <Button shape="asymmetric" variant="outline">Asymétrique</Button>
          <Button shape="pill">Pilule</Button>
          <Button shape="square" variant="outline">Carré</Button>
          <Button size="sm">Petit</Button>
          <Button size="lg" shape="pill">Grand pilule</Button>
          <Button size="xl" shape="squircle">Extra large</Button>
          <Button size="icon-sm" variant="outline" aria-label="Petit bouton icône">+</Button>
          <Button size="icon-lg" variant="soft" shape="pill" aria-label="Grand bouton icône">+</Button>
          <Button disabled>Désactivé</Button>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <Badge>Par défaut</Badge>
          <Badge variant="secondary">Secondaire</Badge>
          <Badge variant="outline">Contour</Badge>
          <Badge variant="highlight">Accent</Badge>
          <Badge variant="destructive">Erreur</Badge>
        </div>

        <h3 className="mb-4 text-lg font-semibold">Composants de contenu et de saisie</h3>
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Navigation et contenu</CardTitle><CardDescription>Fil d'Ariane, avatar, progression, accordéon et onglets.</CardDescription></CardHeader>
            <CardContent className="grid gap-5">
              <Breadcrumb items={[{ label: "Accueil", to: "/" }, { label: "Kit", to: "/kit" }, { label: "Composants" }]} />
              <div className="flex items-center gap-3"><Avatar fallback="AN" /><div><p className="font-medium">Andry N.</p><p className="text-xs text-muted-foreground">Membre de l'équipe</p></div></div>
              <div className="grid gap-2"><div className="flex justify-between text-sm"><span>Avancement</span><span>72 %</span></div><Progress value={72} label="Avancement du projet" /></div>
              <Accordion><AccordionItem><AccordionTrigger>À quoi sert cet accordéon ?</AccordionTrigger><AccordionContent>Il replie les détails, la FAQ ou les options secondaires sans ajouter de dépendance.</AccordionContent></AccordionItem></Accordion>
              <Tabs defaultValue="resume">
                <TabsList><TabsTrigger value="resume">Résumé</TabsTrigger><TabsTrigger value="activite">Activité</TabsTrigger></TabsList>
                <TabsContent value="resume" className="text-sm text-muted-foreground">Contenu du premier onglet.</TabsContent>
                <TabsContent value="activite" className="text-sm text-muted-foreground">Contenu du deuxième onglet.</TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Contrôles et tableau</CardTitle><CardDescription>Éléments contrôlés simples, sémantiques et réutilisables.</CardDescription></CardHeader>
            <CardContent className="grid gap-5">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label htmlFor="kit-updates" className="inline-flex items-center gap-2 text-sm"><Checkbox id="kit-updates" defaultChecked /> Recevoir les mises à jour</label>
                <div className="inline-flex items-center gap-2 text-sm"><span>Notifications</span><Switch aria-label="Notifications" checked={switchDemo} onCheckedChange={setSwitchDemo} /></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="kit-select">Priorité</Label><Select id="kit-select" defaultValue="normale"><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></Select></div>
              <div className="grid gap-2"><Label htmlFor="kit-slider">Charge {sliderDemo}%</Label><Slider id="kit-slider" value={sliderDemo} onValueChange={setSliderDemo} aria-label="Charge du projet" /></div>
              <Table>
                <TableHeader><TableRow><TableHead>Élément</TableHead><TableHead>État</TableHead><TableHead className="text-right">Score</TableHead></TableRow></TableHeader>
                <TableBody>
                  <TableRow><TableCell>Parcours</TableCell><TableCell>Prêt</TableCell><TableCell className="text-right">92</TableCell></TableRow>
                  <TableRow><TableCell>Contenu</TableCell><TableCell>En cours</TableCell><TableCell className="text-right">68</TableCell></TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <h3 className="mb-4 text-lg font-semibold">Grille bento</h3>
        <BentoGrid className="mb-10 lg:grid-cols-3">
          <BentoCard className="sm:col-span-2" title="Carte principale" description="Présentez ici le bénéfice principal de votre idée." action="Un exemple réutilisable" />
          <BentoCard title="Un second signal" description="Associez texte court, icône et appel à l'action." />
        </BentoGrid>

        <h3 className="mb-4 text-lg font-semibold">Primitives de parcours</h3>
        <div className="mb-10 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>État vide</CardTitle>
              <CardDescription>Pour une liste sans résultat ou un espace qui attend son premier contenu.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState title="Aucun élément pour le moment" description="Ajoutez votre premier contenu pour commencer." action={<Button shape="pill">Créer un élément</Button>} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Actions protégées</CardTitle>
              <CardDescription>Confirmation accessible, état de chargement et pagination réutilisable.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <Button type="button" variant="destructive" shape="pill" className="w-fit" onClick={() => setConfirmOpen(true)}>Essayer la confirmation</Button>
              <Pagination page={demoPage} pageCount={4} onPageChange={setDemoPage} label="Pagination de démonstration" />
            </CardContent>
          </Card>
        </div>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Confirmer cette action ?"
          description="Cette fenêtre est un exemple réutilisable. L'action réelle n'est pas exécutée."
          confirmLabel="Confirmer"
          onConfirm={() => {
            toast.success("Confirmation de démonstration")
          }}
        />

        <div className="grid gap-8 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Formulaire</CardTitle>
              <CardDescription>Champs, libellés, aide et état d'erreur.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="kit-nom">Nom</Label>
                <Input id="kit-nom" placeholder="Rakoto Andry" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kit-erreur">Adresse e-mail</Label>
                <Input id="kit-erreur" defaultValue="pas-un-email" aria-invalid="true" />
                <p className="text-sm text-destructive">Adresse e-mail invalide</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="kit-message">Message</Label>
                <Textarea id="kit-message" placeholder="Écrivez ici…" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retours à l'utilisateur</CardTitle>
              <CardDescription>Notifications et états de chargement.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => toast.success("Note publiée")}>
                  Toast de succès
                </Button>
                <Button variant="outline" onClick={() => toast.error("Impossible d'enregistrer : réessayez")}>
                  Toast d'erreur
                </Button>
              </div>
              <div className="grid gap-2" aria-hidden>
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Separator className="mb-14" />

      <section aria-labelledby="outils" className="grid gap-8 lg:grid-cols-2">
        <h2 id="outils" className="sr-only">
          Outils d'équipe
        </h2>
        <Chrono />
        <Card>
          <CardHeader>
            <CardTitle>Diagnostics</CardTitle>
            <CardDescription>État de la configuration actuelle.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm">
              {diagnostics.map(([label, value]) => (
                <div key={label} className="grid grid-cols-[9rem_1fr] gap-3 border-t pt-3 first:border-t-0 first:pt-0">
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>
      </section>
    </Container>
  )
}
