import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams } from "react-router"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { formatReputationPoints, getReputationProgress, toReputationLevel, type ReputationProfileRow } from "@/features/reputation/reputation-utils"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface CitizenRef {
  id: string
  profile_id: string
}

interface VoteRow {
  id: string
  from_citizen_id: string
  points: number
  reason: string | null
  created_at: string
}

interface OwnVoteRow {
  id: string
  points: number
  reason: string | null
}

interface ReputationProfileData {
  profile: ReputationProfileRow | null
  targetCitizen: CitizenRef | null
  ownCitizenId: string | null
  ownVote: OwnVoteRow | null
  receivedVotes: VoteRow[]
  votersByCitizenId: Record<string, { profileId: string; displayName: string }>
}

function VoteEditor({
  initialVote,
  disabledReason,
  isSaving,
  isDeleting,
  onSave,
  onDelete,
  tx,
}: {
  initialVote: OwnVoteRow | null
  disabledReason: string | null
  isSaving: boolean
  isDeleting: boolean
  onSave: (input: { points: 2 | 1 | -1 | -2; reason: string }) => void
  onDelete: () => void
  tx: (fr: string, en: string) => string
}) {
  const [points, setPoints] = useState<2 | 1 | -1 | -2>((initialVote?.points as 2 | 1 | -1 | -2 | undefined) ?? 1)
  const [reason, setReason] = useState(initialVote?.reason ?? "")

  return (
    <div className="grid gap-3 rounded-xl border bg-background p-4">
      <h2 className="text-lg font-semibold">{tx("Noter ce profil", "Rate this profile")}</h2>
      <div className="flex flex-wrap gap-2">
        {([-2, -1, 1, 2] as const).map((value) => (
          <Button
            key={value}
            type="button"
            variant={points === value ? "default" : "outline"}
            disabled={Boolean(disabledReason) || isSaving || isDeleting}
            onClick={() => setPoints(value)}
          >
            {value > 0 ? `+${value}` : value}
          </Button>
        ))}
      </div>
      <Textarea
        value={reason}
        maxLength={280}
        onChange={(event) => setReason(event.target.value)}
        placeholder={tx("Raison facultative (280 caractères max.)", "Optional reason (280 chars max.)")}
        disabled={Boolean(disabledReason) || isSaving || isDeleting}
      />
      <p className="text-xs text-muted-foreground">{reason.length}/280</p>
      {disabledReason && <p className="rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">{disabledReason}</p>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={Boolean(disabledReason) || isSaving || isDeleting} onClick={() => onSave({ points, reason })}>
          {initialVote ? tx("Mettre à jour mon vote", "Update my vote") : tx("Enregistrer mon vote", "Save my vote")}
        </Button>
        {initialVote && (
          <Button variant="outline" disabled={Boolean(disabledReason) || isSaving || isDeleting} onClick={onDelete}>
            {tx("Supprimer mon vote", "Delete my vote")}
          </Button>
        )}
      </div>
    </div>
  )
}

async function resolveCitizenDisplayNames(citizenIds: string[]) {
  const unique = Array.from(new Set(citizenIds.filter(Boolean)))
  const empty: Record<string, { profileId: string; displayName: string }> = {}
  if (!supabase || unique.length === 0) return empty

  const citizens = unwrap(await supabase.from("citizens").select("id,profile_id").in("id", unique), []) as CitizenRef[]
  if (citizens.length === 0) return empty

  const profiles = unwrap(await supabase.from("public_profiles").select("id,display_name").in("id", citizens.map((citizen) => citizen.profile_id)), []) as { id: string; display_name: string | null }[]
  const profileById = new Map(profiles.map((profile) => [profile.id, profile.display_name ?? "—"]))

  return citizens.reduce<Record<string, { profileId: string; displayName: string }>>((accumulator, citizen) => {
    const displayName = profileById.get(citizen.profile_id)
    if (displayName) accumulator[citizen.id] = { profileId: citizen.profile_id, displayName }
    return accumulator
  }, {})
}

export function ReputationProfilePage() {
  const { profileId } = useParams()
  const { user } = useAuth()
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()

  const detail = useQuery({
    queryKey: ["reputation-profile", profileId, user?.id, user?.citizenId],
    enabled: Boolean(supabase && profileId),
    queryFn: async (): Promise<ReputationProfileData> => {
      if (!supabase || !profileId) {
        return { profile: null, targetCitizen: null, ownCitizenId: null, ownVote: null, receivedVotes: [], votersByCitizenId: {} }
      }

      const [profileResponse, targetCitizenResponse, ownCitizenResponse] = await Promise.all([
        supabase.from("public_profiles").select("id,display_name,avatar_url,reputation_points,reputation_level").eq("id", profileId).maybeSingle(),
        supabase.from("citizens").select("id,profile_id").eq("profile_id", profileId).maybeSingle(),
        supabase.rpc("my_citizen_id"),
      ])

      if (profileResponse.error) throw new Error(profileResponse.error.message)
      const profile = (profileResponse.data ?? null) as ReputationProfileRow | null
      const targetCitizen = (targetCitizenResponse.data ?? null) as CitizenRef | null
      const ownCitizenId = (ownCitizenResponse.data ?? user?.citizenId ?? null) as string | null

      const [ownVoteResponse, receivedVotesResponse] = await Promise.all([
        ownCitizenId && targetCitizen?.id
          ? supabase.from("reputation_votes").select("id,points,reason").eq("from_citizen_id", ownCitizenId).eq("to_citizen_id", targetCitizen.id).maybeSingle()
          : Promise.resolve({ data: null, error: null }),
        targetCitizen?.id
          ? supabase.from("reputation_votes").select("id,from_citizen_id,points,reason,created_at").eq("to_citizen_id", targetCitizen.id).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (ownVoteResponse.error) throw new Error(ownVoteResponse.error.message)
      if (receivedVotesResponse.error) throw new Error(receivedVotesResponse.error.message)

      const receivedVotes = (receivedVotesResponse.data ?? []) as VoteRow[]
      const votersByCitizenId = await resolveCitizenDisplayNames(receivedVotes.map((vote) => vote.from_citizen_id))

      return {
        profile,
        targetCitizen,
        ownCitizenId,
        ownVote: (ownVoteResponse.data ?? null) as OwnVoteRow | null,
        receivedVotes,
        votersByCitizenId,
      }
    },
  })

  const progress = getReputationProgress(detail.data?.profile?.reputation_points ?? 0)
  const isSelf = Boolean(user?.id && profileId && user.id === profileId)
  const canVote = user?.kycStatus === "verified"
  const ratingDisabledReason = useMemo(() => {
    if (!user) return tx("Vous devez être connecté pour voter.", "You must be signed in to vote.")
    if (isSelf) return tx("L'auto-évaluation est interdite.", "Self-rating is not allowed.")
    if (!canVote) return tx("Seuls les citoyens vérifiés peuvent voter.", "Only verified citizens can vote.")
    if (!detail.data?.ownCitizenId) return tx("Votre fiche citoyenne est introuvable.", "Your citizen record could not be found.")
    if (!detail.data?.targetCitizen?.id) return tx("Ce profil ne peut pas être relié à une fiche citoyenne accessible depuis votre rôle actuel.", "This profile cannot be linked to an accessible citizen record from your current role.")
    return null
  }, [canVote, detail.data?.ownCitizenId, detail.data?.targetCitizen?.id, isSelf, tx, user])

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["reputation-profile", profileId] }),
      queryClient.invalidateQueries({ queryKey: ["reputation-overview"] }),
      queryClient.invalidateQueries({ queryKey: ["public-reports"] }),
    ])
  }

  const saveVote = useMutation({
    mutationFn: async (input: { points: 2 | 1 | -1 | -2; reason: string }) => {
      if (!supabase || !detail.data?.ownCitizenId || !detail.data?.targetCitizen?.id) throw new Error("Supabase")
      const { error } = await supabase.from("reputation_votes").upsert(
        {
          from_citizen_id: detail.data.ownCitizenId,
          to_citizen_id: detail.data.targetCitizen.id,
          points: input.points,
          reason: input.reason.trim() || null,
        },
        { onConflict: "from_citizen_id,to_citizen_id" },
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Vote enregistré.", "Vote saved."))
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteVote = useMutation({
    mutationFn: async () => {
      if (!supabase || !detail.data?.ownCitizenId || !detail.data?.targetCitizen?.id) throw new Error("Supabase")
      const { error } = await supabase.from("reputation_votes")
        .delete()
        .eq("from_citizen_id", detail.data.ownCitizenId)
        .eq("to_citizen_id", detail.data.targetCitizen.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Vote supprimé.", "Vote deleted."))
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-4xl">
      <title>{detail.data?.profile?.display_name ? `${detail.data.profile.display_name} · ${tx("Réputation", "Reputation")}` : tx("Réputation", "Reputation")}</title>
      <PageHeader
        eyebrow={tx("Réputation citoyenne", "Citizen reputation")}
        title={detail.data?.profile?.display_name ?? tx("Profil", "Profile")}
        description={tx("Points et niveau publics, avec vote personnel si les règles d'identité et de confidentialité le permettent.", "Public points and level, with personal voting when identity and privacy rules allow it.")}
      />

      <DataState
        data={detail.data}
        isLoading={detail.isLoading}
        error={detail.error}
        onRetry={() => void detail.refetch()}
        emptyTitle={tx("Profil introuvable", "Profile not found")}
      >
        {(data) => (
          <>
            <nav className="mb-4 text-sm text-muted-foreground">
              <Link to="/app/reputation" className="underline-offset-4 hover:underline">{tx("Réputation", "Reputation")}</Link> / <span>{data.profile?.display_name ?? "—"}</span>
            </nav>

            <section className="mb-6 grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-[0.9fr,1.1fr]">
              <div>
                <h2 className="text-lg font-semibold">{data.profile?.display_name ?? "—"}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge>{toReputationLevel(data.profile?.reputation_level)}</Badge>
                  <Badge variant="secondary">{data.profile?.reputation_points ?? 0} {tx("points", "points")}</Badge>
                </div>
                <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${progress.progressPercent}%` }} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {progress.nextLevel
                    ? tx(`${progress.progressPercent}% vers ${progress.nextLevel}.`, `${progress.progressPercent}% toward ${progress.nextLevel}.`)
                    : tx("Niveau maximum public atteint.", "Maximum public level reached.")}
                </p>
              </div>

              <VoteEditor
                key={data.ownVote?.id ?? `${profileId ?? "profile"}-new-vote`}
                initialVote={data.ownVote}
                disabledReason={ratingDisabledReason}
                isSaving={saveVote.isPending}
                isDeleting={deleteVote.isPending}
                onSave={(input) => saveVote.mutate(input)}
                onDelete={() => deleteVote.mutate()}
                tx={tx}
              />
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="mb-3 text-lg font-semibold">{tx("Votes reçus", "Received votes")}</h2>
              {user?.isAdmin ? (
                data.receivedVotes.length ? (
                  <div className="rounded-xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tx("Auteur", "Author")}</TableHead>
                          <TableHead>{tx("Points", "Points")}</TableHead>
                          <TableHead>{tx("Raison", "Reason")}</TableHead>
                          <TableHead>{tx("Date", "Date")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.receivedVotes.map((vote) => {
                          const voter = data.votersByCitizenId[vote.from_citizen_id]
                          return (
                            <TableRow key={vote.id}>
                              <TableCell>
                                {voter
                                  ? <Link to={`/app/reputation/${voter.profileId}`} className="underline-offset-4 hover:underline">{voter.displayName}</Link>
                                  : tx("Profil non exposé", "Profile not exposed")}
                              </TableCell>
                              <TableCell className={vote.points > 0 ? "text-emerald-600" : "text-destructive"}>{formatReputationPoints(vote.points)}</TableCell>
                              <TableCell>{vote.reason || "—"}</TableCell>
                              <TableCell>{formatDateTime(vote.created_at, tag)}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{tx("Aucun vote reçu n'est visible pour ce profil.", "No received vote is visible for this profile.")}</p>
                )
              ) : (
                <p className="text-sm text-muted-foreground">
                  {tx("Le détail des votes reçus n'est pas public avec les règles actuelles ; seuls les points et le niveau agrégés sont exposés.", "Detailed received votes are not public under the current rules; only aggregated points and level are exposed.")}
                </p>
              )}
            </section>
          </>
        )}
      </DataState>
    </Container>
  )
}
