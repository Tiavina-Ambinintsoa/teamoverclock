import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "react-router"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Pagination } from "@/components/pagination"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/features/auth/auth-context"
import {
  filterAndSortProfiles,
  formatReputationPoints,
  getReputationProgress,
  toReputationLevel,
  type ReputationFilterOptions,
  type ReputationLevel,
  type ReputationProfileRow,
  type ReputationSort,
} from "@/features/reputation/reputation-utils"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface VoteRow {
  id: string
  to_citizen_id: string
  points: number
  reason: string | null
  created_at: string
}

interface ResolvedCitizenTarget {
  citizenId: string
  profileId: string
  displayName: string
}

interface ReputationOverviewData {
  profiles: ReputationProfileRow[]
  myProfile: ReputationProfileRow | null
  myVotes: VoteRow[]
  targetByCitizenId: Record<string, ResolvedCitizenTarget>
}

const PAGE_SIZE = 12

async function resolveCitizenTargets(citizenIds: string[]) {
  const unique = Array.from(new Set(citizenIds.filter(Boolean)))
  const empty: Record<string, ResolvedCitizenTarget> = {}
  if (!supabase || unique.length === 0) return empty

  const citizens = unwrap(
    await supabase.from("citizens").select("id,profile_id").in("id", unique),
    [],
  ) as { id: string; profile_id: string }[]

  if (citizens.length === 0) return empty
  const profiles = unwrap(
    await supabase.from("public_profiles").select("id,display_name").in("id", citizens.map((citizen) => citizen.profile_id)),
    [],
  ) as { id: string; display_name: string | null }[]
  const profileById = new Map(profiles.map((profile) => [profile.id, profile.display_name ?? "—"]))

  return citizens.reduce<Record<string, ResolvedCitizenTarget>>((accumulator, citizen) => {
    const displayName = profileById.get(citizen.profile_id)
    if (displayName) accumulator[citizen.id] = { citizenId: citizen.id, profileId: citizen.profile_id, displayName }
    return accumulator
  }, {})
}

export function ReputationPage() {
  const { user } = useAuth()
  const { tx, tag } = useLocale()
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState<"" | ReputationLevel>("")
  const [sort, setSort] = useState<ReputationSort>("points-desc")
  const [page, setPage] = useState(1)

  const overview = useQuery({
    queryKey: ["reputation-overview", user?.id],
    enabled: Boolean(supabase && user?.id),
    queryFn: async (): Promise<ReputationOverviewData> => {
      if (!supabase || !user?.id) return { profiles: [], myProfile: null, myVotes: [], targetByCitizenId: {} }

      const [profilesResponse, myVotesResponse] = await Promise.all([
        supabase.from("public_profiles").select("id,display_name,avatar_url,reputation_points,reputation_level").order("reputation_points", { ascending: false }).limit(500),
        user.citizenId
          ? supabase.from("reputation_votes").select("id,to_citizen_id,points,reason,created_at").eq("from_citizen_id", user.citizenId).order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])

      if (profilesResponse.error) throw new Error(profilesResponse.error.message)
      if (myVotesResponse.error) throw new Error(myVotesResponse.error.message)

      const profiles = (profilesResponse.data ?? []) as ReputationProfileRow[]
      const myVotes = (myVotesResponse.data ?? []) as VoteRow[]
      const targetByCitizenId = await resolveCitizenTargets(myVotes.map((vote) => vote.to_citizen_id))

      return {
        profiles,
        myProfile: profiles.find((profile) => profile.id === user.id) ?? null,
        myVotes,
        targetByCitizenId,
      }
    },
  })

  const filterOptions = useMemo<ReputationFilterOptions>(() => ({ search, level, sort }), [search, level, sort])
  const visibleProfiles = useMemo(
    () => filterAndSortProfiles(overview.data?.profiles ?? [], filterOptions),
    [overview.data?.profiles, filterOptions],
  )
  const paginated = useMemo(() => {
    const pageCount = Math.max(1, Math.ceil(visibleProfiles.length / PAGE_SIZE))
    const currentPage = Math.min(page, pageCount)
    const start = (currentPage - 1) * PAGE_SIZE
    return { pageCount, currentPage, rows: visibleProfiles.slice(start, start + PAGE_SIZE) }
  }, [page, visibleProfiles])

  const ownProgress = getReputationProgress(overview.data?.myProfile?.reputation_points ?? 0)
  const voteEligibility = user?.kycStatus === "verified"

  return (
    <Container className="max-w-6xl">
      <title>{tx("Réputation et votes", "Reputation & votes")}</title>
      <PageHeader
        eyebrow={tx("Espace citoyen", "Citizen space")}
        title={tx("Réputation et votes", "Reputation & votes")}
        description={tx("La réputation citoyenne se construit par des votes entre habitants vérifiés et reste distincte des validations officielles de la ville.", "Citizen reputation is built through votes between verified residents and remains separate from official city validations.")}
      />

      <section className="mb-6 grid gap-4 rounded-xl border bg-card p-5 lg:grid-cols-[1.2fr,0.8fr]">
        <div className="grid gap-3 text-sm">
          <h2 className="text-lg font-semibold">{tx("Comment ça fonctionne", "How it works")}</h2>
          <p>{tx("Chaque vote attribue un score non nul entre -2 et +2 à une autre personne, avec un commentaire facultatif de 280 caractères maximum.", "Each vote gives another person a non-zero score between -2 and +2, with an optional reason up to 280 characters.")}</p>
          <p>{tx("Un seul vote est autorisé par paire de citoyens, l'auto-évaluation est interdite, et un trigger Supabase recalcule automatiquement les points reçus.", "Only one vote is allowed per citizen pair, self-rating is forbidden, and a Supabase trigger automatically recalculates received points.")}</p>
          <p>{tx("Seuls les citoyens dont l'identité est vérifiée peuvent créer ou modifier un vote d'après les règles RLS.", "Only identity-verified citizens can create or update a vote according to the RLS rules.")}</p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{tx("Newcomer", "Newcomer")} · 0+</Badge>
            <Badge variant="secondary">{tx("Regular", "Regular")} · 10+</Badge>
            <Badge variant="secondary">{tx("Trusted", "Trusted")} · 50+</Badge>
            <Badge variant="secondary">{tx("Guardian", "Guardian")} · 100+</Badge>
          </div>
        </div>

        <div className="rounded-xl border bg-background p-4">
          <h2 className="text-lg font-semibold">{tx("Mon niveau", "My level")}</h2>
          <p className="mt-2 text-3xl font-semibold">{overview.data?.myProfile?.reputation_points ?? 0}</p>
          <p className="text-sm text-muted-foreground">{tx("points de réputation", "reputation points")}</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge>{toReputationLevel(overview.data?.myProfile?.reputation_level)}</Badge>
            <span className="text-sm text-muted-foreground">
              {ownProgress.nextLevel
                ? tx(`Prochain palier : ${ownProgress.nextThreshold} points`, `Next milestone: ${ownProgress.nextThreshold} points`)
                : tx("Niveau maximum atteint", "Maximum level reached")}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${ownProgress.progressPercent}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {ownProgress.nextLevel
              ? tx(`${ownProgress.progressPercent}% du niveau ${ownProgress.nextLevel}.`, `${ownProgress.progressPercent}% toward ${ownProgress.nextLevel}.`)
              : tx("Vous êtes au sommet de l'échelle publique.", "You are at the top of the public ladder.")}
          </p>
          {!voteEligibility && (
            <p className="mt-3 rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-xs">
              {tx("Votre identité doit être vérifiée pour voter sur la réputation d'un autre citoyen.", "Your identity must be verified before you can vote on another citizen's reputation.")}
            </p>
          )}
        </div>
      </section>

      <section className="mb-6 rounded-xl border bg-card p-5">
        <h2 className="mb-3 text-lg font-semibold">{tx("Votes que j'ai donnés", "Votes I gave")}</h2>
        {overview.data?.myVotes.length ? (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tx("Profil", "Profile")}</TableHead>
                  <TableHead>{tx("Points", "Points")}</TableHead>
                  <TableHead>{tx("Raison", "Reason")}</TableHead>
                  <TableHead>{tx("Date", "Date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overview.data.myVotes.map((vote) => {
                  const target = overview.data.targetByCitizenId[vote.to_citizen_id]
                  return (
                    <TableRow key={vote.id}>
                      <TableCell>
                        {target
                          ? <Link to={`/app/reputation/${target.profileId}`} className="underline-offset-4 hover:underline">{target.displayName}</Link>
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
          <p className="text-sm text-muted-foreground">{tx("Vous n'avez encore attribué aucun vote.", "You have not given any vote yet.")}</p>
        )}
      </section>

      <section className="rounded-xl border bg-card p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="grid gap-1">
            <label htmlFor="rep-search" className="text-sm font-medium">{tx("Rechercher", "Search")}</label>
            <Input
              id="rep-search"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1) }}
              placeholder={tx("Nom affiché…", "Display name…")}
              className="w-64"
            />
          </div>
          <div className="grid gap-1">
            <label htmlFor="rep-level" className="text-sm font-medium">{tx("Niveau", "Level")}</label>
            <Select id="rep-level" value={level} onChange={(event) => { setLevel(event.target.value as "" | ReputationLevel); setPage(1) }} className="w-48">
              <option value="">{tx("Tous les niveaux", "All levels")}</option>
              {(["newcomer", "regular", "trusted", "guardian"] as ReputationLevel[]).map((item) => <option key={item} value={item}>{item}</option>)}
            </Select>
          </div>
          <div className="grid gap-1">
            <label htmlFor="rep-sort" className="text-sm font-medium">{tx("Tri", "Sort")}</label>
            <Select id="rep-sort" value={sort} onChange={(event) => { setSort(event.target.value as ReputationSort); setPage(1) }} className="w-52">
              <option value="points-desc">{tx("Points décroissants", "Points descending")}</option>
              <option value="points-asc">{tx("Points croissants", "Points ascending")}</option>
              <option value="level-desc">{tx("Niveaux les plus élevés", "Highest levels first")}</option>
              <option value="name-asc">{tx("Nom A → Z", "Name A → Z")}</option>
              <option value="name-desc">{tx("Nom Z → A", "Name Z → A")}</option>
            </Select>
          </div>
        </div>

        <DataState
          data={overview.data?.profiles}
          isLoading={overview.isLoading}
          error={overview.error}
          onRetry={() => void overview.refetch()}
          emptyTitle={tx("Aucun profil public", "No public profile")}
        >
          {() => (
            <>
              <div className="mb-3 rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tx("Profil", "Profile")}</TableHead>
                      <TableHead>{tx("Niveau", "Level")}</TableHead>
                      <TableHead>{tx("Points", "Points")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginated.rows.map((profile) => (
                      <TableRow key={profile.id}>
                        <TableCell>
                          <Link to={`/app/reputation/${profile.id}`} className="font-medium underline-offset-4 hover:underline">
                            {profile.display_name ?? "—"}
                          </Link>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{toReputationLevel(profile.reputation_level)}</Badge></TableCell>
                        <TableCell>{profile.reputation_points ?? 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination page={paginated.currentPage} pageCount={paginated.pageCount} onPageChange={setPage} />
            </>
          )}
        </DataState>
      </section>
    </Container>
  )
}
