import { useMemo, useRef, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useForm, useWatch } from "react-hook-form"
import { Link, Navigate, useNavigate, useSearchParams } from "react-router"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { useBuildings, useSectors } from "@/features/city/city-queries"
import { safeFileName, validateAttachments } from "@/features/requests/request-workflow"
import {
  REPORT_CATEGORIES,
  reportSchema,
  transcriptNeedsReview,
  type ReportFormValues,
} from "@/features/reports/report-workflow"
import { DictationButton } from "@/features/voice/dictation-button"
import { useLocale } from "@/lib/locale"
import { pickLabel, REPORT_CATEGORY_LABELS } from "@/lib/status-labels"
import { supabase } from "@/lib/supabase"
import { AuroraTitle } from "@/components/magic-ui/aurora-title"

function localDateTimeValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

/** Signalement : localisation fictive par secteur et bâtiment, dictée vocale relue, preuves jointes, brouillon ou envoi. */
export function ReportNewPage() {
  const { user } = useAuth()
  const { tx, locale } = useLocale()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const sectors = useSectors()
  const buildings = useBuildings()
  const [files, setFiles] = useState<File[]>([])
  const [altText, setAltText] = useState("")
  const [transcript, setTranscript] = useState("")
  const [reviewed, setReviewed] = useState(false)
  const reportId = useRef(crypto.randomUUID())

  const { register, handleSubmit, control, setValue, getValues, formState: { errors } } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: params.get("title") ?? "",
      description: params.get("description") ?? "",
      category: (REPORT_CATEGORIES as string[]).includes(params.get("category") ?? "") ? (params.get("category") as ReportFormValues["category"]) : "infrastructure",
      sectorId: params.get("sector") ?? user?.sectorId ?? "",
      buildingId: params.get("building") ?? "",
      observedAt: localDateTimeValue(new Date()),
      priority: "medium",
    },
  })
  const sectorId = useWatch({ control, name: "sectorId" })
  const sectorBuildings = useMemo(() => (buildings.data ?? []).filter((b) => b.sector_id === sectorId), [buildings.data, sectorId])

  const submit = useMutation({
    mutationFn: async (input: { values: ReportFormValues; draft: boolean }) => {
      if (!supabase || !user) throw new Error(tx("Connexion requise.", "Sign-in required."))
      if (transcriptNeedsReview(transcript, reviewed)) {
        throw new Error(tx("Relisez la transcription vocale et cochez la case de confirmation.", "Review the voice transcript and tick the confirmation box."))
      }
      const fileError = validateAttachments(files)
      if (fileError) throw new Error(fileError)
      if (files.length > 0 && altText.trim().length < 3) throw new Error(tx("Décrivez brièvement l'image (texte alternatif).", "Briefly describe the image (alt text)."))

      const building = buildings.data?.find((b) => b.id === input.values.buildingId)
      const paramX = params.get("x")
      const paramY = params.get("y")
      const x = building?.x ?? (paramX !== null && Number.isFinite(Number(paramX)) ? Number(paramX) : null)
      const y = building?.y ?? (paramY !== null && Number.isFinite(Number(paramY)) ? Number(paramY) : null)
      const { error } = await supabase.from("reports").insert({
        id: reportId.current,
        title: input.values.title,
        description: input.values.description,
        category: input.values.category,
        sector_id: input.values.sectorId,
        building_id: input.values.buildingId || null,
        x,
        y,
        observed_at: new Date(input.values.observedAt).toISOString(),
        source: "citizen",
        priority: input.values.priority,
        status: input.draft ? "draft" : "received",
        voice_transcript: transcript.trim() || null,
        transcript_reviewed: transcript.trim() ? reviewed : false,
      })
      if (error && error.code !== "23505") throw new Error(error.message)

      for (const file of files) {
        const path = `${user.id}/${reportId.current}/${Date.now()}-${safeFileName(file.name)}`
        const upload = await supabase.storage.from("report-evidence").upload(path, file, { contentType: file.type })
        if (upload.error) throw new Error(upload.error.message)
        const { error: evidenceError } = await supabase.from("report_evidence").insert({
          report_id: reportId.current, source: "citizen", file_path: path, mime_type: file.type, alt_text: altText.trim(), visibility: "confidential",
        })
        if (evidenceError) throw new Error(evidenceError.message)
      }
      return input.draft
    },
    onSuccess: async (draft) => {
      toast.success(draft ? tx("Brouillon enregistré.", "Draft saved.") : tx("Signalement envoyé. Il sera vérifié par le service concerné.", "Report sent. The relevant service will review it."))
      await queryClient.invalidateQueries({ queryKey: ["my-reports"] })
      await navigate(`/app/reports/${reportId.current}`)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  if (user && user.profileLoaded && user.kycStatus !== "verified" && !user.isAdmin && !["agent", "service_admin"].includes(user.profileRole)) {
    return (
      <Container className="max-w-xl">
        <title>{tx("Signaler un problème", "Report a problem")}</title>
        <div role="alert" className="rounded-xl border bg-card p-8 text-center">
          <h1 className="text-2xl font-semibold"><AuroraTitle>{tx("Identité à vérifier", "Identity verification needed")}</AuroraTitle></h1>
          <p className="mt-2 text-muted-foreground">{tx("Seuls les habitants dont l'identité est vérifiée peuvent déposer un signalement.", "Only residents whose identity is verified can file a report.")}</p>
          <Button asChild className="mt-4"><Link to="/app/verification">{tx("Vérifier mon identité", "Verify my identity")}</Link></Button>
        </div>
      </Container>
    )
  }
  if (!user) return <Navigate to="/connexion" replace />

  const field = (name: keyof ReportFormValues) => errors[name]?.message ? <p role="alert" className="text-sm text-destructive">{errors[name]?.message}</p> : null
  const send = (draft: boolean) => handleSubmit((values) => submit.mutate({ values, draft }))

  return (
    <Container className="max-w-3xl">
      <title>{tx("Signaler un problème", "Report a problem")}</title>
      <PageHeader eyebrow={tx("Mon espace", "My space")} title={tx("Signaler un problème", "Report a problem")} description={tx("Précisez le secteur et le bâtiment concernés. Vous pouvez dicter votre description à voix haute puis la relire.", "Specify the sector and building concerned. You can dictate your description out loud, then review it.")} />
      <form onSubmit={(e) => e.preventDefault()} noValidate className="grid gap-4 rounded-xl border bg-card p-6" aria-busy={submit.isPending} data-tour="report-form">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="rp-sector">{tx("Secteur", "Sector")}</Label>
            <Select id="rp-sector" aria-invalid={errors.sectorId ? true : undefined} {...register("sectorId", { onChange: () => setValue("buildingId", "") })}>
              <option value="">{tx("Choisir…", "Choose…")}</option>
              {(sectors.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
            </Select>
            {field("sectorId")}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rp-building">{tx("Bâtiment (facultatif)", "Building (optional)")}</Label>
            <Select id="rp-building" disabled={!sectorId} {...register("buildingId")}>
              <option value="">—</option>
              {sectorBuildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </Select>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="rp-category">{tx("Catégorie", "Category")}</Label>
            <Select id="rp-category" {...register("category")}>
              {REPORT_CATEGORIES.map((c) => <option key={c} value={c}>{pickLabel(REPORT_CATEGORY_LABELS, c, locale)}</option>)}
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="rp-priority">{tx("Priorité estimée", "Estimated priority")}</Label>
            <Select id="rp-priority" {...register("priority")}>
              <option value="low">{tx("Basse", "Low")}</option>
              <option value="medium">{tx("Moyenne", "Medium")}</option>
              <option value="high">{tx("Haute", "High")}</option>
            </Select>
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rp-title">{tx("Titre", "Title")}</Label>
          <Input id="rp-title" aria-invalid={errors.title ? true : undefined} {...register("title")} />
          {field("title")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rp-desc">{tx("Description", "Description")}</Label>
          <Textarea id="rp-desc" className="min-h-32" aria-invalid={errors.description ? true : undefined} {...register("description")} />
          {field("description")}
          <DictationButton
            onText={(text) => {
              setTranscript((t) => `${t} ${text}`.trim())
              setReviewed(false)
              setValue("description", `${getValues("description")} ${text}`.trim(), { shouldValidate: true })
            }}
          />
        </div>
        {transcript && (
          <div className="grid gap-2 rounded-lg border border-highlight/60 bg-highlight/10 p-3">
            <p className="text-sm font-medium">{tx("Transcription vocale à relire", "Voice transcript to review")}</p>
            <p className="text-sm italic">{transcript}</p>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />{tx("J'ai relu et corrigé la transcription si nécessaire.", "I reviewed and corrected the transcript if needed.")}</label>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor="rp-when">{tx("Constaté le", "Observed on")}</Label>
          <Input id="rp-when" type="datetime-local" max={localDateTimeValue(new Date())} {...register("observedAt")} />
          {field("observedAt")}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="rp-files">{tx("Photos / preuves (facultatif)", "Photos / evidence (optional)")}</Label>
          <input id="rp-files" type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm" onChange={(e) => {
            const list = Array.from(e.target.files ?? [])
            const problem = validateAttachments(list)
            if (problem) { toast.error(problem); e.target.value = ""; setFiles([]) } else setFiles(list)
          }} />
          {files.length > 0 && (
            <>
              <Label htmlFor="rp-alt">{tx("Description de l'image (accessibilité)", "Image description (accessibility)")}</Label>
              <Input id="rp-alt" value={altText} onChange={(e) => setAltText(e.target.value)} />
            </>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" disabled={submit.isPending} onClick={() => void send(true)()}>{tx("Enregistrer le brouillon", "Save draft")}</Button>
          <Button type="button" data-voice="envoyer le signalement" data-voice-confirm disabled={submit.isPending} onClick={() => void send(false)()}>{submit.isPending ? tx("Envoi…", "Sending…") : tx("Envoyer le signalement", "Send the report")}</Button>
        </div>
      </form>
    </Container>
  )
}
