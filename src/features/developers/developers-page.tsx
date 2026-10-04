import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, KeyRound, Lock, Play, Search, ShieldAlert, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { API_KEY_PREFIX, generateApiKey, getApiKeyPrefix, hashApiKey, maskDeveloperKey, normalizeScopes } from "@/features/developers/api-keys"
import { apiGroups, apiModels, apiOperations, appFeatures, type ApiField, type ApiOperation } from "@/features/developers/api-catalog"
import { env } from "@/lib/env"
import { useLocale } from "@/lib/locale"
import { supabase } from "@/lib/supabase"

type PlaygroundResult = {
  status: number
  latencyMs: number
  headers: [string, string][]
  body: string
}

type KeyRow = {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

function methodClass(method: string) {
  if (method === "GET") return "bg-emerald-500 text-white"
  if (method === "POST") return "bg-sky-500 text-white"
  if (method === "PATCH") return "bg-amber-500 text-black"
  return "bg-rose-500 text-white"
}

function formatDate(value: string | null, localeTag: string) {
  if (!value) return "—"
  return new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
}

function looksLikePublishableKey(value: string) {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_anon_")
}

function parseLineFilters(raw: string) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const separator = line.indexOf("=")
      return separator >= 0 ? [line.slice(0, separator), line.slice(separator + 1)] as const : [line, ""] as const
    })
}

function tryPrettyJson(body: string) {
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
}

async function copy(text: string, successMessage: string) {
  await navigator.clipboard.writeText(text)
  toast.success(successMessage)
}

function isMissingApiKeysTable(error: unknown) {
  if (!error || typeof error !== "object") return false
  const message = "message" in error && typeof error.message === "string" ? error.message : ""
  return message.includes("api_keys") && (message.includes("does not exist") || message.includes("Could not find the table"))
}

function FieldTable({ fields, tx }: { fields: ApiField[]; tx: (fr: string, en: string) => string }) {
  if (!fields.length) return <p className="text-sm text-muted-foreground">{tx("Aucun champ de corps pour cette opération.", "No request body fields for this operation.")}</p>
  return (
    <Table className="rounded-lg border">
      <TableHeader>
        <TableRow>
          <TableHead>{tx("Champ", "Field")}</TableHead>
          <TableHead>{tx("Type", "Type")}</TableHead>
          <TableHead>{tx("Requis", "Required")}</TableHead>
          <TableHead>{tx("Contraintes", "Constraints")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {fields.map((field) => (
          <TableRow key={field.name}>
            <TableCell className="font-mono text-xs">{field.name}</TableCell>
            <TableCell>{field.type}</TableCell>
            <TableCell>{field.required ? tx("Oui", "Yes") : tx("Non", "No")}</TableCell>
            <TableCell>{field.constraints || "—"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function Playground({
  operation,
  showAuth,
  tx,
}: {
  operation: ApiOperation
  showAuth: boolean
  tx: (fr: string, en: string) => string
}) {
  const [credentialMode, setCredentialMode] = useState<"session" | "paste">("session")
  const [pastedCredential, setPastedCredential] = useState("")
  const [selectValue, setSelectValue] = useState(operation.playground.defaultSelect ?? "")
  const [filtersValue, setFiltersValue] = useState(operation.playground.defaultFilters ?? "")
  const [orderValue, setOrderValue] = useState(operation.playground.defaultOrder ?? "")
  const [limitValue, setLimitValue] = useState(operation.playground.defaultLimit ?? "")
  const [bodyValue, setBodyValue] = useState(operation.playground.defaultBody ?? "")
  const [result, setResult] = useState<PlaygroundResult | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const inputBaseId = operation.id

  async function runRequest() {
    if (!env.supabaseUrl || !env.supabaseKey) {
      toast.error(tx("Les variables Supabase publiques ne sont pas configurées.", "Public Supabase env vars are not configured."))
      return
    }
    const query = new URL(`${env.supabaseUrl}${operation.path}`)
    if (operation.group === "tables") {
      if (selectValue) query.searchParams.set("select", selectValue)
      if (orderValue) query.searchParams.set("order", orderValue)
      if (limitValue) query.searchParams.set("limit", limitValue)
      for (const [key, value] of parseLineFilters(filtersValue)) {
        if (key) query.searchParams.append(key, value)
      }
    } else if (operation.group === "rpcs" && operation.method === "GET") {
      for (const [key, value] of parseLineFilters(filtersValue)) {
        if (key) query.searchParams.append(key, value)
      }
    }

    let authorization = env.supabaseKey
    let apiKey = env.supabaseKey
    if (credentialMode === "session") {
      if (!supabase) {
        toast.error(tx("Le client Supabase n'est pas disponible dans ce build.", "The Supabase client is not available in this build."))
        return
      }
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token
      if (!token) {
        toast.error(tx("Connectez-vous pour utiliser le JWT de session.", "Sign in to use the session JWT."))
        return
      }
      authorization = token
    } else {
      const supplied = pastedCredential.trim()
      if (!supplied) {
        toast.error(tx("Collez un JWT, une clé publishable ou une clé anon.", "Paste a JWT, a publishable key, or an anon key."))
        return
      }
      authorization = supplied
      if (looksLikePublishableKey(supplied)) apiKey = supplied
    }

    const headers = new Headers({ apikey: apiKey, Authorization: `Bearer ${authorization}` })
    let requestBody = ""
    if (operation.method !== "GET" && bodyValue.trim()) {
      headers.set("Content-Type", "application/json")
      requestBody = tryPrettyJson(bodyValue)
    }

    setIsRunning(true)
    const startedAt = performance.now()
    try {
      const response = await fetch(query.toString(), {
        method: operation.method,
        headers,
        body: operation.method === "GET" || operation.method === "DELETE" ? undefined : requestBody || undefined,
      })
      const latencyMs = Math.round(performance.now() - startedAt)
      const rawBody = await response.text()
      setResult({
        status: response.status,
        latencyMs,
        headers: Array.from(response.headers.entries()),
        body: rawBody ? tryPrettyJson(rawBody) : "",
      })
    } catch (error) {
      setResult({
        status: 0,
        latencyMs: Math.round(performance.now() - startedAt),
        headers: [],
        body: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setIsRunning(false)
    }
  }

  const generatedCurl = useMemo(() => {
    const queryPath = (() => {
      const url = new URL(`${BASE_URL_PLACEHOLDER}${operation.path}`)
      if (operation.group === "tables") {
        if (selectValue) url.searchParams.set("select", selectValue)
        if (orderValue) url.searchParams.set("order", orderValue)
        if (limitValue) url.searchParams.set("limit", limitValue)
        for (const [key, value] of parseLineFilters(filtersValue)) {
          if (key) url.searchParams.append(key, value)
        }
      } else if (operation.group === "rpcs" && operation.method === "GET") {
        for (const [key, value] of parseLineFilters(filtersValue)) {
          if (key) url.searchParams.append(key, value)
        }
      }
      return url.toString().replace(BASE_URL_PLACEHOLDER, env.supabaseUrl ?? "https://project.supabase.co")
    })()
    const secretPlaceholder = credentialMode === "session" ? "<session-jwt>" : pastedCredential.trim() || "<pasted-credential>"
    const displayedAuth = showAuth ? secretPlaceholder : "******"
    const displayedApiKey = showAuth ? (looksLikePublishableKey(pastedCredential.trim()) ? pastedCredential.trim() : env.supabaseKey ?? "sb_publishable_xxx") : "******"
    const lines = [
      `curl -X ${operation.method} "${queryPath}"`,
      `  -H "apikey: ${displayedApiKey}"`,
      `  -H "Authorization: Bearer ${displayedAuth}"`,
    ]
    if (operation.method !== "GET" && bodyValue.trim()) {
      lines.push(`  -H "Content-Type: application/json"`)
      lines.push(`  -d '${tryPrettyJson(bodyValue).replace(/'/g, "\\'")}'`)
    }
    return lines.join(" \\\n")
  }, [bodyValue, credentialMode, filtersValue, limitValue, operation.group, operation.method, operation.path, pastedCredential, selectValue, showAuth, orderValue])

  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-base">{tx("Try it", "Try it")}</CardTitle>
        <CardDescription>
          {tx(
            "Les écritures touchent la vraie base et utilisent vos droits RLS. Les jetons restent masqués tant que vous ne les révélez pas.",
            "Write operations touch the real database and use your RLS permissions. Tokens stay masked until you reveal them.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span>{tx("Identité d'appel", "Credential")}</span>
            <Select value={credentialMode} onChange={(event) => setCredentialMode(event.target.value as "session" | "paste")}>
              <option value="session">{tx("JWT de session courant", "Current session JWT")}</option>
              <option value="paste">{tx("Coller un JWT / une clé", "Paste a JWT / key")}</option>
            </Select>
          </label>
          {credentialMode === "paste" && (
            <label className="grid gap-2 text-sm md:col-span-2">
              <span>{tx("Jeton ou clé collé(e)", "Pasted token or key")}</span>
              <Input
                value={pastedCredential}
                onChange={(event) => setPastedCredential(event.target.value)}
                placeholder={`${API_KEY_PREFIX}... / sb_publishable_... / eyJ...`}
              />
            </label>
          )}
          {operation.group === "tables" && (
            <>
              <label className="grid gap-2 text-sm" htmlFor={`${inputBaseId}-select`}>
                <span>select</span>
                <Input id={`${inputBaseId}-select`} value={selectValue} onChange={(event) => setSelectValue(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm" htmlFor={`${inputBaseId}-order`}>
                <span>order</span>
                <Input id={`${inputBaseId}-order`} value={orderValue} onChange={(event) => setOrderValue(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm" htmlFor={`${inputBaseId}-limit`}>
                <span>limit</span>
                <Input id={`${inputBaseId}-limit`} value={limitValue} onChange={(event) => setLimitValue(event.target.value)} />
              </label>
              <label className="grid gap-2 text-sm md:col-span-2" htmlFor={`${inputBaseId}-filters`}>
                <span>{tx("Filtres (une ligne = une paire clé=valeur)", "Filters (one line = one key=value pair)")}</span>
                <Textarea id={`${inputBaseId}-filters`} value={filtersValue} onChange={(event) => setFiltersValue(event.target.value)} rows={4} />
              </label>
            </>
          )}
          {operation.group === "rpcs" && operation.method === "GET" && (
            <label className="grid gap-2 text-sm md:col-span-2" htmlFor={`${inputBaseId}-rpc-filters`}>
              <span>{tx("Arguments RPC", "RPC arguments")}</span>
              <Textarea id={`${inputBaseId}-rpc-filters`} value={filtersValue} onChange={(event) => setFiltersValue(event.target.value)} rows={4} placeholder="p_limit=50" />
            </label>
          )}
          {operation.method !== "GET" && (
            <label className="grid gap-2 text-sm md:col-span-2" htmlFor={`${inputBaseId}-body`}>
              <span>{tx("Corps JSON", "JSON body")}</span>
              <Textarea id={`${inputBaseId}-body`} value={bodyValue} onChange={(event) => setBodyValue(event.target.value)} rows={10} />
            </label>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => (operation.playground.confirmWrite ? setConfirmOpen(true) : void runRequest())} disabled={isRunning}>
              <Play className="size-4" />
              {isRunning ? tx("Exécution...", "Running...") : tx("Exécuter", "Run")}
            </Button>
            <Button variant="outline" onClick={() => void copy(generatedCurl, tx("cURL copié.", "cURL copied."))}>
              <Copy className="size-4" />
              {tx("Copier le cURL", "Copy cURL")}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-6">{generatedCurl}</pre>
        </div>

        {result && (
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant={result.status >= 200 && result.status < 300 ? "highlight" : "destructive"}>
                {tx("Statut", "Status")} {result.status || "ERR"}
              </Badge>
              <Badge variant="outline">
                {tx("Latence", "Latency")} {result.latencyMs} ms
              </Badge>
            </div>
            <Table className="rounded-lg border">
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("En-tête", "Header")}</TableHead>
                  <TableHead>{tx("Valeur", "Value")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.headers.map(([key, value]) => (
                  <TableRow key={key}>
                    <TableCell className="font-mono text-xs">{key}</TableCell>
                    <TableCell className="break-all">{value}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <pre className="overflow-x-auto rounded-xl border bg-card p-4 text-xs leading-6">{result.body || "∅"}</pre>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tx("Confirmer l'écriture réelle", "Confirm real write")}</DialogTitle>
            <DialogDescription>
              {tx(
                "Cette opération modifie la vraie base Supabase. Elle sera exécutée avec le JWT ou la clé fournie et donc soumise au RLS.",
                "This operation changes the real Supabase database. It runs with the supplied JWT or key and is therefore subject to RLS.",
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>{tx("Annuler", "Cancel")}</Button>
            <Button
              onClick={() => {
                setConfirmOpen(false)
                void runRequest()
              }}
            >
              {tx("Continuer", "Continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function ApiKeysPanel() {
  const { tx, tag } = useLocale()
  const { user, backend } = useAuth()
  const queryClient = useQueryClient()
  const [name, setName] = useState("")
  const [scopeInput, setScopeInput] = useState("read")
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const keysQuery = useQuery({
    queryKey: ["developer-api-keys", user?.id],
    enabled: Boolean(user && backend === "supabase" && supabase),
    queryFn: async (): Promise<KeyRow[]> => {
      if (!supabase) return []
      const response = await supabase.from("api_keys").select("id,name,key_prefix,scopes,created_at,last_used_at,revoked_at").order("created_at", { ascending: false })
      if (response.error) throw response.error
      return (response.data ?? []) as KeyRow[]
    },
  })

  const createKey = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error(tx("Supabase indisponible dans ce build.", "Supabase is unavailable in this build."))
      const trimmedName = name.trim()
      if (!trimmedName) throw new Error(tx("Donnez un nom à cette clé.", "Give this key a name."))
      const scopes = normalizeScopes(scopeInput)
      if (!scopes.length) throw new Error(tx("Ajoutez au moins un scope.", "Add at least one scope."))
      const plain = generateApiKey()
      const key_hash = await hashApiKey(plain)
      const key_prefix = getApiKeyPrefix(plain)
      const response = await supabase.from("api_keys").insert({ name: trimmedName, key_prefix, key_hash, scopes }).select("id").single()
      if (response.error) throw response.error
      return plain
    },
    onSuccess: async (plain) => {
      setRevealedKey(plain)
      setName("")
      setScopeInput("read")
      await queryClient.invalidateQueries({ queryKey: ["developer-api-keys", user?.id] })
      toast.success(tx("Clé créée. Copiez-la maintenant : elle ne sera plus affichée.", "Key created. Copy it now: it will not be shown again."))
    },
    onError: (error) => {
      if (isMissingApiKeysTable(error)) toast.error(tx("La table api_keys n'est pas encore déployée dans Supabase.", "The api_keys table has not been deployed to Supabase yet."))
      else toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const revokeKey = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Supabase unavailable")
      const response = await supabase.from("api_keys").update({ revoked_at: new Date().toISOString() }).eq("id", id)
      if (response.error) throw response.error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["developer-api-keys", user?.id] })
      toast.success(tx("Clé révoquée.", "Key revoked."))
    },
    onError: (error) => {
      if (isMissingApiKeysTable(error)) toast.error(tx("La table api_keys n'est pas encore déployée dans Supabase.", "The api_keys table has not been deployed to Supabase yet."))
      else toast.error(error instanceof Error ? error.message : String(error))
    },
  })

  const tableMissing = keysQuery.error && isMissingApiKeysTable(keysQuery.error)

  return (
    <Card id="api-keys">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="size-4" />
          {tx("Clés API développeur", "Developer API keys")}
        </CardTitle>
        <CardDescription>
          {tx(
            "La clé complète n'est jamais stockée : seul le hash SHA-256 et un préfixe visible de 8 caractères sont persistés.",
            "The full key is never stored: only the SHA-256 hash and a visible 8-character prefix are persisted.",
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {backend !== "supabase" || !supabase ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {tx("Cette fonctionnalité nécessite un projet Supabase configuré.", "This feature requires a configured Supabase project.")}
          </p>
        ) : !user ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            {tx("Connectez-vous pour générer et révoquer vos clés.", "Sign in to generate and revoke your keys.")}
          </p>
        ) : tableMissing ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm">
            {tx(
              "La migration api_keys n'est pas encore présente sur ce projet. Déployez `20261004009000_reviews_api_keys_realtime.sql`, puis rechargez cette page.",
              "The api_keys migration is not available on this project yet. Deploy `20261004009000_reviews_api_keys_realtime.sql`, then reload this page.",
            )}
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
              <label className="grid gap-2 text-sm">
                <span>{tx("Nom de la clé", "Key name")}</span>
                <Input value={name} onChange={(event) => setName(event.target.value)} placeholder={tx("Playground local", "Local playground")} />
              </label>
              <label className="grid gap-2 text-sm">
                <span>{tx("Scopes (virgules)", "Scopes (comma-separated)")}</span>
                <Input value={scopeInput} onChange={(event) => setScopeInput(event.target.value)} placeholder="read, reports, reviews" />
              </label>
              <div className="flex items-end">
                <Button onClick={() => createKey.mutate()} disabled={createKey.isPending}>
                  <Sparkles className="size-4" />
                  {tx("Générer", "Generate")}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              {tx(
                "Astuce : les endpoints Supabase ci-dessous attendent encore un JWT utilisateur ou une clé publishable/anon. Les clés développeur générées ici sont utiles pour vos intégrations ou une future passerelle applicative.",
                "Tip: the Supabase endpoints below still expect a user JWT or a publishable/anon key. The developer keys generated here are useful for your own integrations or a future application gateway.",
              )}
            </p>

            {revealedKey && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <strong>{tx("Clé affichée une seule fois", "Key shown only once")}</strong>
                  <Button variant="outline" size="sm" onClick={() => void copy(revealedKey, tx("Clé copiée.", "Key copied."))}>
                    <Copy className="size-4" />
                    {tx("Copier", "Copy")}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-lg border bg-card p-3 text-xs">{revealedKey}</pre>
                <p className="mt-2 text-xs text-muted-foreground">{tx("Une fois fermé, seul le préfixe restera visible.", "After dismissal, only the prefix remains visible.")}</p>
              </div>
            )}

            <Table className="rounded-xl border">
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("Nom", "Name")}</TableHead>
                  <TableHead>{tx("Préfixe", "Prefix")}</TableHead>
                  <TableHead>{tx("Scopes", "Scopes")}</TableHead>
                  <TableHead>{tx("Créée", "Created")}</TableHead>
                  <TableHead>{tx("Dernier usage", "Last used")}</TableHead>
                  <TableHead>{tx("Révoquée", "Revoked")}</TableHead>
                  <TableHead>{tx("Action", "Action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(keysQuery.data ?? []).map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-xs">{maskDeveloperKey(`${API_KEY_PREFIX}${key.key_prefix}`)}</TableCell>
                    <TableCell>{key.scopes.join(", ")}</TableCell>
                    <TableCell>{formatDate(key.created_at, tag)}</TableCell>
                    <TableCell>{formatDate(key.last_used_at, tag)}</TableCell>
                    <TableCell>{formatDate(key.revoked_at, tag)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" disabled={Boolean(key.revoked_at) || revokeKey.isPending} onClick={() => revokeKey.mutate(key.id)}>
                        {tx("Révoquer", "Revoke")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!keysQuery.isLoading && !keysQuery.data?.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {tx("Aucune clé pour le moment.", "No keys yet.")}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  )
}

const BASE_URL_PLACEHOLDER = "https://placeholder.supabase.local"

export function DevelopersPage() {
  const { tx, tag } = useLocale()
  const [search, setSearch] = useState("")
  const [showAuth, setShowAuth] = useState(false)

  const filteredOperations = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return apiOperations
    return apiOperations.filter((operation) => operation.searchableText.toLowerCase().includes(needle))
  }, [search])

  const filteredModels = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return apiModels
    return apiModels.filter((model) => `${model.name} ${model.descriptionFr} ${model.descriptionEn}`.toLowerCase().includes(needle))
  }, [search])

  const filteredFeatures = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return appFeatures
    return appFeatures.filter((feature) => `${feature.titleFr} ${feature.titleEn} ${feature.summaryFr} ${feature.summaryEn}`.toLowerCase().includes(needle))
  }, [search])

  const groupedOperations = useMemo(
    () =>
      apiGroups.map((group) => ({
        ...group,
        operations: filteredOperations.filter((operation) => operation.group === group.id),
      })),
    [filteredOperations],
  )

  return (
    <Container className="max-w-7xl py-10">
      <title>{tx("Développeurs", "Developers")}</title>
      <PageHeader
        eyebrow={tx("Documentation publique", "Public documentation")}
        title={tx("Portail développeur Nova Terra", "Nova Terra developer portal")}
        description={tx(
          "Référence Swagger-like générée à partir de notre schéma Supabase, de nos RPC, Edge Functions et documents produit.",
          "Swagger-like reference built from our Supabase schema, SQL RPCs, Edge Functions, and product documentation.",
        )}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setShowAuth((value) => !value)}>
              <Lock className="size-4" />
              {showAuth ? tx("Masquer Authorization", "Hide Authorization") : tx("Révéler Authorization", "Reveal Authorization")}
            </Button>
            <Button asChild>
              <a href="#tables">{tx("Explorer l'API", "Explore the API")}</a>
            </Button>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle>{tx("Navigation", "Navigation")}</CardTitle>
              <CardDescription>{tx("Recherche, sections et ancres rapides.", "Search, sections, and quick anchors.")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm font-medium">{tx("Recherche", "Search")}</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tx("service_reviews, chatbot, reports…", "service_reviews, chatbot, reports…")} className="pl-9" />
                </div>
              </label>
              <nav className="grid gap-2 text-sm">
                <a href="#app-features" className="rounded-lg px-2 py-1 hover:bg-accent">{tx("Fonctionnalités de l'app", "App features")}</a>
                <a href="#api-keys" className="rounded-lg px-2 py-1 hover:bg-accent">{tx("Clés API", "API keys")}</a>
                {groupedOperations.map((group) => (
                  <a key={group.id} href={`#${group.id}`} className="rounded-lg px-2 py-1 hover:bg-accent">
                    {tx(group.titleFr, group.titleEn)} <span className="text-muted-foreground">({group.operations.length})</span>
                  </a>
                ))}
                <a href="#models" className="rounded-lg px-2 py-1 hover:bg-accent">{tx("Schémas & modèles", "Schemas & models")}</a>
              </nav>
            </CardContent>
          </Card>
        </aside>

        <div className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>{tx("Base publique", "Public foundation")}</CardTitle>
                <CardDescription>{tx("URL, clé publishable et conventions PostgREST.", "URL, publishable key, and PostgREST conventions.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p><strong>URL</strong>: <code>{env.supabaseUrl ?? "not configured"}</code></p>
                <p><strong>apikey</strong>: <code>{showAuth ? env.supabaseKey ?? "not configured" : "******"}</code></p>
                <p>{tx("Les écritures utilisent toujours le JWT de l'utilisateur ou le jeton collé ; aucune clé service_role n'est exposée.", "Write operations always use the user's JWT or the pasted credential; no service_role key is ever exposed.")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{tx("Conventions d'accès", "Access conventions")}</CardTitle>
                <CardDescription>{tx("Ce que lisent les visiteurs et ce que protègent le JWT et le RLS.", "What visitors can read and what JWT + RLS protect.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{tx("Public read: services, actualités publiées, secteurs, base de connaissance, guides et dangers actifs.", "Public read: services, published news, sectors, knowledge base, guides, and active hazards.")}</p>
                <p>{tx("Owner-only or staff-only: citoyens, demandes, signalements, préférences, votes, clés API, modération.", "Owner-only or staff-only: citizens, requests, reports, preferences, votes, API keys, moderation.")}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{tx("Sécurité du playground", "Playground safety")}</CardTitle>
                <CardDescription>{tx("Écrire déclenche toujours une confirmation explicite.", "Writes always require an explicit confirmation step.")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{tx("Les jetons restent masqués dans le cURL affiché tant que vous ne basculez pas l'option.", "Tokens remain masked in the displayed cURL until you reveal them.")}</p>
                <p>{tx("Le résultat affiche le statut HTTP, la latence, les en-têtes et le JSON renvoyé par le projet réel.", "Results show HTTP status, latency, headers, and the JSON returned by the real project.")}</p>
              </CardContent>
            </Card>
          </div>

          <section id="app-features" className="grid gap-4">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-5 text-primary" />
              <h2 className="text-2xl font-semibold">{tx("Fonctionnalités de l'application", "App features")}</h2>
            </div>
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredFeatures.map((feature) => (
                <Card key={feature.id}>
                  <CardHeader>
                    <CardTitle>{tx(feature.titleFr, feature.titleEn)}</CardTitle>
                    <CardDescription>{tx(feature.summaryFr, feature.summaryEn)}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="grid gap-2 text-sm text-muted-foreground">
                      {(tag.startsWith("fr") ? feature.bulletsFr : feature.bulletsEn).map((bullet) => (
                        <li key={bullet} className="flex gap-2">
                          <Check className="mt-0.5 size-4 text-primary" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <ApiKeysPanel />

          <Tabs defaultValue="tables">
            <TabsList>
              {apiGroups.map((group) => (
                <TabsTrigger key={group.id} value={group.id}>
                  {tx(group.titleFr, group.titleEn)}
                </TabsTrigger>
              ))}
            </TabsList>

            {groupedOperations.map((group) => (
              <TabsContent key={group.id} value={group.id}>
                <section id={group.id} className="grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>{tx(group.titleFr, group.titleEn)}</CardTitle>
                      <CardDescription>{tx(group.descriptionFr, group.descriptionEn)}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Accordion className="gap-4">
                        {group.operations.map((operation) => (
                          <AccordionItem key={operation.id} id={`operation-${operation.id}`}>
                            <AccordionTrigger className="items-start">
                              <div className="grid gap-2 text-left">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={methodClass(operation.method)}>{operation.method}</Badge>
                                  <span className="font-mono text-xs sm:text-sm">{operation.path}</span>
                                </div>
                                <div>
                                  <div className="font-semibold">{operation.title}</div>
                                  <p className="text-sm text-muted-foreground">{tx(operation.descriptionFr, operation.descriptionEn)}</p>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="grid gap-5">
                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline">{tx("Auth", "Auth")}: {operation.auth}</Badge>
                                <Badge variant="secondary">{tx("Rôle", "Role")}: {operation.role}</Badge>
                                {operation.modelName && <Badge variant="highlight">{tx("Modèle", "Model")}: {operation.modelName}</Badge>}
                              </div>

                              <div className="grid gap-3 xl:grid-cols-2">
                                <div className="grid gap-2">
                                  <h3 className="font-medium">{tx("Paramètres de requête", "Query parameters")}</h3>
                                  {operation.queryParams.length ? (
                                    <Table className="rounded-lg border">
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{tx("Paramètre", "Parameter")}</TableHead>
                                          <TableHead>{tx("Type", "Type")}</TableHead>
                                          <TableHead>{tx("Description", "Description")}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {operation.queryParams.map((param) => (
                                          <TableRow key={param.name}>
                                            <TableCell className="font-mono text-xs">{param.name}</TableCell>
                                            <TableCell>{param.type}</TableCell>
                                            <TableCell>{tx(param.descriptionFr, param.descriptionEn)}</TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">{tx("Aucun paramètre dédié.", "No dedicated query parameters.")}</p>
                                  )}
                                </div>
                                <div className="grid gap-2">
                                  <h3 className="font-medium">{tx("Champs du corps", "Request body fields")}</h3>
                                  <FieldTable fields={operation.bodyFields} tx={tx} />
                                </div>
                              </div>

                              <div className="grid gap-3 xl:grid-cols-2">
                                <div className="grid gap-2">
                                  <h3 className="font-medium">cURL</h3>
                                  <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-6">{showAuth ? operation.exampleRequestCurl : operation.exampleRequestCurl.replace(/Authorization: Bearer .*/, "Authorization: Bearer ******").replace(/apikey: .*/, "apikey: ******")}</pre>
                                </div>
                                <div className="grid gap-2">
                                  <h3 className="font-medium">supabase-js</h3>
                                  <pre className="overflow-x-auto rounded-xl border bg-muted/40 p-4 text-xs leading-6">{operation.exampleRequestSupabaseJs}</pre>
                                </div>
                              </div>

                              <div className="grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
                                <div className="grid gap-2">
                                  <h3 className="font-medium">{tx("Exemple de réponse", "Example response")}</h3>
                                  <pre className="overflow-x-auto rounded-xl border bg-card p-4 text-xs leading-6">{operation.exampleResponse}</pre>
                                </div>
                                <div className="grid gap-2">
                                  <h3 className="font-medium">{tx("Codes d'erreur", "Error codes")}</h3>
                                  <Table className="rounded-lg border">
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>HTTP</TableHead>
                                        <TableHead>code</TableHead>
                                        <TableHead>{tx("Description", "Description")}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {operation.errorCodes.map((error) => (
                                        <TableRow key={`${operation.id}-${error.status}-${error.code}`}>
                                          <TableCell>{error.status}</TableCell>
                                          <TableCell className="font-mono text-xs">{error.code}</TableCell>
                                          <TableCell>{tx(error.descriptionFr, error.descriptionEn)}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>

                              <Playground operation={operation} showAuth={showAuth} tx={tx} />
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </CardContent>
                  </Card>
                </section>
              </TabsContent>
            ))}
          </Tabs>

          <section id="models" className="grid gap-4">
            <h2 className="text-2xl font-semibold">{tx("Schémas & modèles", "Schemas & models")}</h2>
            {filteredModels.map((model) => (
              <Card key={model.name}>
                <CardHeader>
                  <CardTitle className="font-mono text-lg">{model.name}</CardTitle>
                  <CardDescription>{tx(model.descriptionFr, model.descriptionEn)}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Badge variant="outline">{model.auth}</Badge>
                  <FieldTable fields={model.fields} tx={tx} />
                </CardContent>
              </Card>
            ))}
          </section>
        </div>
      </div>
    </Container>
  )
}

export default DevelopersPage
