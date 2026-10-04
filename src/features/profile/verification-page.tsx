import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { useAuth } from "@/features/auth/auth-context"
import { cinSchema, isMinorBirthDate } from "@/features/auth/schema"
import { useSectors } from "@/features/city/city-queries"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface VerificationRow {
  id: string
  status: "pending" | "validated" | "rejected"
  ai_score: number | null
  rejection_reason: string | null
  submitted_at: string
}

/** 1.5 — complétion du profil citoyen, parrainage des mineurs et vérification du CIN fictif. */
export function VerificationPage() {
  const { user, refreshProfile } = useAuth()
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()
  const sectors = useSectors()
  const [birthDate, setBirthDate] = useState("")
  const [sectorId, setSectorId] = useState("")
  const [sponsorCin, setSponsorCin] = useState("")
  const [cin, setCin] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const history = useQuery({
    queryKey: ["verifications", user?.citizenId],
    enabled: Boolean(user?.citizenId && supabase),
    queryFn: async (): Promise<VerificationRow[]> => {
      if (!supabase || !user?.citizenId) return []
      return unwrap(
        await supabase
          .from("citizen_verifications")
          .select("id,status,ai_score,rejection_reason,submitted_at")
          .eq("citizen_id", user.citizenId)
          .order("submitted_at", { ascending: false }),
        []
      )
    },
  })

  const completeProfile = useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error(tx("Connexion Supabase requise.", "A Supabase connection is required."))
      if (!birthDate || !sectorId) throw new Error(tx("Renseignez votre date de naissance et votre secteur.", "Enter your date of birth and your sector."))
      const minor = isMinorBirthDate(birthDate)
      if (minor && !cinSchema.safeParse({ cin: sponsorCin }).success) {
        throw new Error(tx("Le CIN du parrain doit suivre le format NT-CIN-000000.", "The sponsor CIN must follow the format NT-CIN-000000."))
      }
      const { error } = await supabase.rpc("complete_citizen_profile", {
        p_birth_date: birthDate,
        p_sector_id: sectorId,
        p_sponsor_cin: minor ? sponsorCin.trim() : null,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Profil citoyen créé.", "Citizen profile created."))
      await refreshProfile()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const submitCin = useMutation({
    mutationFn: async () => {
      if (!supabase || !user) throw new Error(tx("Connexion requise.", "Sign-in required."))
      const parsed = cinSchema.safeParse({ cin })
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "CIN invalide")
      let path: string | null = null
      if (file) {
        if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) || file.size > 5 * 1024 * 1024) {
          throw new Error(tx("Fichier refusé : JPG, PNG, WEBP ou PDF de 5 Mo maximum.", "File refused: JPG, PNG, WEBP or PDF up to 5 MB."))
        }
        path = `${user.id}/cin-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        const { error: uploadError } = await supabase.storage.from("cin-documents").upload(path, file, { contentType: file.type })
        if (uploadError) throw new Error(uploadError.message)
      }
      const { data, error } = await supabase.rpc("submit_cin_verification", { p_cin: parsed.data.cin, p_image_path: path })
      if (error) throw new Error(error.message)
      return data as string
    },
    onSuccess: async (result) => {
      if (result === "validated") toast.success(tx("Identité vérifiée.", "Identity verified."))
      else toast.error(tx("Le document n'a pas été validé.", "The document was not validated."))
      setCin("")
      setFile(null)
      await queryClient.invalidateQueries({ queryKey: ["verifications"] })
      await refreshProfile()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const onCompleteProfile = (event: FormEvent) => {
    event.preventDefault()
    completeProfile.mutate()
  }
  const onSubmitCin = (event: FormEvent) => {
    event.preventDefault()
    submitCin.mutate()
  }

  const minorDraft = birthDate ? isMinorBirthDate(birthDate) : false

  return (
    <Container className="max-w-3xl">
      <title>{tx("Vérification d'identité", "Identity verification")}</title>
      <PageHeader
        eyebrow={tx("Mon espace", "My space")}
        title={tx("Vérification d'identité", "Identity verification")}
        description={tx(
          "Seuls les habitants dont l'identité est vérifiée peuvent déposer un signalement. Vous pouvez toutefois consulter les informations et poser des questions.",
          "Only residents whose identity is verified can file reports. You can still read information and ask questions."
        )}
      />

      {!user?.citizenId ? (
        <form onSubmit={onCompleteProfile} className="grid gap-4 rounded-xl border bg-card p-6" aria-labelledby="complete-title">
          <h2 id="complete-title" className="text-lg font-semibold">{tx("Compléter mon profil citoyen", "Complete my citizen profile")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="v-birth">{tx("Date de naissance", "Date of birth")}</Label>
              <Input id="v-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-sector">{tx("Secteur de résidence", "Home sector")}</Label>
              <Select id="v-sector" value={sectorId} onChange={(e) => setSectorId(e.target.value)} required>
                <option value="">{tx("Choisir…", "Choose…")}</option>
                {(sectors.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.code} — {s.name}</option>)}
              </Select>
            </div>
          </div>
          {minorDraft && (
            <div className="grid gap-2">
              <Label htmlFor="v-sponsor">{tx("CIN du parrain (majeur vérifié)", "Sponsor CIN (verified adult)")}</Label>
              <Input id="v-sponsor" value={sponsorCin} onChange={(e) => setSponsorCin(e.target.value)} placeholder="NT-CIN-000000" />
            </div>
          )}
          <Button type="submit" disabled={completeProfile.isPending} className="w-fit">{tx("Créer mon profil citoyen", "Create my citizen profile")}</Button>
        </form>
      ) : (
        <div className="grid gap-6">
          <section className="rounded-xl border bg-card p-6" aria-labelledby="status-title">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="status-title" className="flex items-center gap-2 text-lg font-semibold">
                <ShieldCheck className="size-5 text-primary" aria-hidden /> {tx("Statut", "Status")}
              </h2>
              {user.kycStatus && <StatusBadge kind="kyc" value={user.kycStatus} />}
            </div>
            {user.isMinor ? (
              <p className="mt-3 text-sm text-muted-foreground">
                {tx("Votre compte de mineur est rattaché à un parrain vérifié.", "Your minor account is linked to a verified sponsor.")}
              </p>
            ) : user.kycStatus === "verified" ? (
              <p className="mt-3 text-sm text-muted-foreground">{tx("Votre identité est vérifiée : vous pouvez déposer des signalements.", "Your identity is verified: you can file reports.")}</p>
            ) : null}
          </section>

          {!user.isMinor && user.kycStatus !== "verified" && (
            <form onSubmit={onSubmitCin} className="grid gap-4 rounded-xl border bg-card p-6" aria-labelledby="cin-title">
              <h2 id="cin-title" className="text-lg font-semibold">{tx("Soumettre mon CIN", "Submit my CIN")}</h2>
              <p className="text-sm text-muted-foreground">
                {tx("Le modèle de vérification attend un CIN au format NT-CIN-000000.", "The verification model expects a CIN in the format NT-CIN-000000.")}
              </p>
              <div className="grid gap-2">
                <Label htmlFor="v-cin">CIN</Label>
                <Input id="v-cin" value={cin} onChange={(e) => setCin(e.target.value)} placeholder="NT-CIN-000000" autoComplete="off" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="v-file">{tx("Photo du document (facultatif)", "Document photo (optional)")}</Label>
                <input id="v-file" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-sm" />
              </div>
              <Button type="submit" disabled={submitCin.isPending} className="w-fit">{tx("Vérifier mon identité", "Verify my identity")}</Button>
            </form>
          )}

          {(history.data?.length ?? 0) > 0 && (
            <section className="rounded-xl border bg-card p-6" aria-labelledby="history-title">
              <h2 id="history-title" className="text-lg font-semibold">{tx("Historique", "History")}</h2>
              <ul className="mt-3 grid gap-2">
                {history.data?.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                    <span>{formatDateTime(row.submitted_at, tag)}</span>
                    <StatusBadge kind="validation" value={row.status} />
                    {row.rejection_reason && <span className="w-full text-muted-foreground">{row.rejection_reason}</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Container>
  )
}
