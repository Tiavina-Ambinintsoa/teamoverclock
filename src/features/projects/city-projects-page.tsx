import { useState, type FormEvent } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "react-router"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuth } from "@/features/auth/auth-context"
import { useServices } from "@/features/city/city-queries"
import { canParticipateInCivicVoting, type CityProjectStats } from "@/features/projects/project-voting"
import { ProjectEditDialog } from "@/features/projects/project-edit-dialog"
import { localizedField, type FieldTranslations } from "@/features/i18n/content-translations"
import { canEditProject } from "@/features/reports/editability"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface PublicCityProjectRow {
  id: string
  service_id: string
  title: string
  description: string
  status: "draft" | "published" | "closed"
  created_at: string
  translations?: FieldTranslations
}

interface ManagedCityProjectRow extends PublicCityProjectRow {
  created_by: string
  status_changed_at?: string | null
  taken_over_at?: string | null
}

interface ProjectCommentRow {
  id: string
  project_id: string
  body: string
  created_at: string
}

interface ProjectVoteRow {
  project_id: string
  support: boolean
}

function useProjectStats() {
  return useQuery({
    queryKey: ["city-project-stats"],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<CityProjectStats[]> => {
      if (!supabase) return []
      return unwrap(await supabase.rpc("get_city_project_stats"), []) as CityProjectStats[]
    },
  })
}

export function CityProjectsPage() {
  const { user } = useAuth()
  const { tx, tag, locale } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices()
  const projects = useQuery({
    queryKey: ["city-projects"],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<PublicCityProjectRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase.from("city_projects").select("id,service_id,title,description,status,created_at,translations").in("status", ["published", "closed"]).order("created_at", { ascending: false }),
        []
      ) as PublicCityProjectRow[]
    },
  })
  const projectIds = (projects.data ?? []).map((project) => project.id)
  const comments = useQuery({
    queryKey: ["city-project-comments", projectIds],
    enabled: Boolean(supabase && projects.data),
    queryFn: async (): Promise<ProjectCommentRow[]> => {
      if (!supabase || projectIds.length === 0) return []
      return unwrap(
        await supabase.from("city_project_comments").select("id,project_id,body,created_at").in("project_id", projectIds).order("created_at"),
        []
      ) as ProjectCommentRow[]
    },
  })
  const myVotes = useQuery({
    queryKey: ["my-city-project-votes", user?.citizenId],
    enabled: Boolean(supabase && user?.citizenId),
    queryFn: async (): Promise<ProjectVoteRow[]> => {
      if (!supabase || !user?.citizenId) return []
      return unwrap(
        await supabase.from("city_project_votes").select("project_id,support").eq("citizen_id", user.citizenId),
        []
      ) as ProjectVoteRow[]
    },
  })
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const verified = canParticipateInCivicVoting(user?.kycStatus)
  const votesByProject = new Map((myVotes.data ?? []).map((vote) => [vote.project_id, vote.support]))

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["city-project-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["city-project-comments"] }),
      queryClient.invalidateQueries({ queryKey: ["my-city-project-votes"] }),
    ])
  }
  const castVote = useMutation({
    mutationFn: async (input: { projectId: string; support: boolean }) => {
      if (!supabase || !user?.citizenId || !verified) throw new Error(tx("La vérification du compte est requise pour voter.", "Account verification is required to vote."))
      const { error } = await supabase.from("city_project_votes").upsert(
        { project_id: input.projectId, citizen_id: user.citizenId, support: input.support },
        { onConflict: "project_id,citizen_id" }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Vote enregistré.", "Vote saved."))
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const addComment = useMutation({
    mutationFn: async (input: { projectId: string; body: string }) => {
      if (!supabase || !user?.id || !verified) throw new Error(tx("La vérification du compte est requise pour commenter.", "Account verification is required to comment."))
      const { error } = await supabase.from("city_project_comments").insert({
        project_id: input.projectId,
        author_id: user.id,
        body: input.body,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async (_, input) => {
      setCommentDrafts((drafts) => ({ ...drafts, [input.projectId]: "" }))
      toast.success(tx("Commentaire publié.", "Comment posted."))
      await refresh()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-5xl">
      <title>{tx("Projets de la ville", "City projects")}</title>
      <PageHeader
        eyebrow={tx("La ville", "The city")}
        title={tx("Projets de la ville", "City projects")}
        description={tx("Découvrez les projets proposés par la ville, votez et partagez votre avis.", "Explore city projects, cast your vote, and share your thoughts.")}
      />
      {!verified && (
        <p role="note" className="mb-5 rounded-lg border border-highlight/60 bg-highlight/10 p-3 text-sm">
          {user
            ? tx("La vérification de votre identité est nécessaire pour voter ou commenter.", "Identity verification is required to vote or comment.")
            : tx("Connectez-vous et vérifiez votre identité pour voter ou commenter.", "Sign in and verify your identity to vote or comment.")}
          {user && <> <Link to="/app/verification" className="underline underline-offset-4">{tx("Vérifier mon identité", "Verify my identity")}</Link></>}
        </p>
      )}
      {services.isError && <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">{tx("Impossible de charger les services municipaux.", "Could not load city services.")}</p>}
      {comments.isError && (
        <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">
          {tx("Impossible de charger les commentaires.", "Could not load comments.")}{" "}
          <Button type="button" variant="link" size="sm" onClick={() => void comments.refetch()}>{tx("Réessayer", "Retry")}</Button>
        </p>
      )}
      {myVotes.isError && (
        <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">
          {tx("Impossible de charger votre vote enregistré.", "Could not load your saved vote.")}{" "}
          <Button type="button" variant="link" size="sm" onClick={() => void myVotes.refetch()}>{tx("Réessayer", "Retry")}</Button>
        </p>
      )}
      <DataState data={projects.data} isLoading={projects.isLoading} error={projects.error} onRetry={() => void projects.refetch()} emptyTitle={tx("Aucun projet publié", "No published projects")}>
        {(items) => (
          <ul className="grid gap-5">
            {items.map((project) => {
              const commentsForProject = (comments.data ?? []).filter((comment) => comment.project_id === project.id)
              const myVote = votesByProject.get(project.id)
              const service = services.data?.find((item) => item.id === project.service_id)
              return (
                <li key={project.id} className="rounded-xl border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold">{localizedField(project.translations, "title", locale, project.title)}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {(service ? localizedField(service.translations, "name", locale, service.name) : tx("Service municipal", "City service"))} · {new Intl.DateTimeFormat(tag).format(new Date(project.created_at))}
                      </p>
                    </div>
                    <Badge variant={project.status === "published" ? "secondary" : "outline"}>
                      {project.status === "published" ? tx("Vote ouvert", "Voting open") : tx("Vote clôturé", "Voting closed")}
                    </Badge>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm">{localizedField(project.translations, "description", locale, project.description)}</p>
                  <section aria-label={tx("Voter sur ce projet", "Vote on this project")} className="mt-5 rounded-lg bg-muted/60 p-4">
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={myVote === true ? "default" : "outline"}
                        disabled={!verified || project.status !== "published" || castVote.isPending}
                        aria-pressed={myVote === true}
                        onClick={() => castVote.mutate({ projectId: project.id, support: true })}
                      >{tx("Je soutiens", "I support this")}</Button>
                      <Button
                        size="sm"
                        variant={myVote === false ? "default" : "outline"}
                        disabled={!verified || project.status !== "published" || castVote.isPending}
                        aria-pressed={myVote === false}
                        onClick={() => castVote.mutate({ projectId: project.id, support: false })}
                      >{tx("Je ne soutiens pas", "I do not support this")}</Button>
                    </div>
                  </section>
                  <section aria-label={tx("Commentaires", "Comments")} className="mt-5">
                    <h3 className="font-medium">{tx("Commentaires", "Comments")} <span className="text-muted-foreground">({commentsForProject.length})</span></h3>
                    {commentsForProject.length > 0 && (
                      <ul className="mt-2 grid gap-2">
                        {commentsForProject.map((comment) => (
                          <li key={comment.id} className="rounded-lg border p-3 text-sm">
                            <p className="whitespace-pre-line">{comment.body}</p>
                            <time className="mt-1 block text-xs text-muted-foreground" dateTime={comment.created_at}>
                              {new Intl.DateTimeFormat(tag, { dateStyle: "medium" }).format(new Date(comment.created_at))}
                            </time>
                          </li>
                        ))}
                      </ul>
                    )}
                    <form className="mt-3 grid gap-2" onSubmit={(event: FormEvent<HTMLFormElement>) => {
                      event.preventDefault()
                      const body = (commentDrafts[project.id] ?? "").trim()
                      if (body) addComment.mutate({ projectId: project.id, body })
                    }}>
                      <label className="sr-only" htmlFor={`project-comment-${project.id}`}>{tx("Votre commentaire", "Your comment")}</label>
                      <Textarea
                        id={`project-comment-${project.id}`}
                        maxLength={2000}
                        placeholder={tx("Partagez votre avis (2 000 caractères maximum)", "Share your thoughts (up to 2,000 characters)")}
                        value={commentDrafts[project.id] ?? ""}
                        onChange={(event) => setCommentDrafts((drafts) => ({ ...drafts, [project.id]: event.target.value }))}
                        disabled={!verified || project.status !== "published"}
                      />
                      <Button className="justify-self-start" size="sm" type="submit" disabled={!verified || project.status !== "published" || addComment.isPending || !(commentDrafts[project.id] ?? "").trim()}>
                        {tx("Publier le commentaire", "Post comment")}
                      </Button>
                    </form>
                  </section>
                </li>
              )
            })}
          </ul>
        )}
      </DataState>
    </Container>
  )
}

export function AdminCityProjectsPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()
  const services = useServices()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [editingProject, setEditingProject] = useState<ManagedCityProjectRow | null>(null)
  const projects = useQuery({
    queryKey: ["admin-city-projects"],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<ManagedCityProjectRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase.from("city_projects").select("id,service_id,created_by,title,description,status,created_at,status_changed_at,taken_over_at").order("created_at", { ascending: false }),
        []
      ) as ManagedCityProjectRow[]
    },
  })
  const save = useMutation({
    mutationFn: async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!supabase || !user?.id) throw new Error("The admin session is required.")
      const { error } = await supabase.from("city_projects").insert({
        service_id: serviceId,
        title: title.trim(),
        description: description.trim(),
        status: "published",
        created_by: user.id,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      setTitle("")
      setDescription("")
      setServiceId("")
      toast.success(tx("Projet publié.", "Project published."))
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-project-stats"] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })
  const setProjectStatus = useMutation({
    mutationFn: async (input: { id: string; status: ManagedCityProjectRow["status"] }) => {
      if (!supabase) throw new Error("Supabase is not configured.")
      const { error } = await supabase.from("city_projects").update({ status: input.status }).eq("id", input.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["city-project-stats"] }),
      ])
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-5xl">
      <title>{tx("Gérer les projets", "Manage projects")}</title>
      <PageHeader eyebrow={tx("Administration générale", "General administration")} title={tx("Projets de la ville", "City projects")} description={tx("Publiez les projets de la ville et clôturez les votes lorsqu'ils sont terminés.", "Publish city projects and close voting when it ends.")} />
      {services.isError && <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">{tx("Impossible de charger les services municipaux.", "Could not load city services.")}</p>}
      <form className="mb-6 grid gap-3 rounded-xl border bg-card p-5" onSubmit={(event) => save.mutate(event)}>
        <h2 className="font-semibold">{tx("Publier un projet", "Publish a project")}</h2>
        <label htmlFor="project-title" className="text-sm font-medium">{tx("Nom du projet", "Project name")}</label>
        <Input id="project-title" minLength={3} maxLength={150} required value={title} onChange={(event) => setTitle(event.target.value)} />
        <label htmlFor="project-service" className="text-sm font-medium">{tx("Service responsable", "Responsible service")}</label>
        <Select id="project-service" required value={serviceId} onChange={(event) => setServiceId(event.target.value)}>
          <option value="">{tx("Choisir un service", "Choose a service")}</option>
          {(services.data ?? []).map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
        </Select>
        <label htmlFor="project-description" className="text-sm font-medium">{tx("Description", "Description")}</label>
        <Textarea id="project-description" minLength={10} maxLength={5000} required value={description} onChange={(event) => setDescription(event.target.value)} />
        <p className="text-xs text-muted-foreground">{tx("La publication ouvre immédiatement le vote aux citoyens dont l'identité est vérifiée.", "Publishing immediately opens voting to citizens with verified identities.")}</p>
        <Button className="justify-self-start" disabled={save.isPending}>{tx("Publier le projet", "Publish project")}</Button>
      </form>
      <DataState data={projects.data} isLoading={projects.isLoading} error={projects.error} onRetry={() => void projects.refetch()} emptyTitle={tx("Aucun projet", "No projects")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div><h2 className="font-medium">{project.title}</h2><p className="text-sm text-muted-foreground">{services.data?.find((service) => service.id === project.service_id)?.name ?? project.service_id}</p></div>
                <div className="flex items-center gap-2">
                  <Badge variant={project.status === "published" ? "secondary" : "outline"}>{project.status}</Badge>
                  {(() => {
                    const editability = canEditProject(project, user?.id)
                    if (editability.editable) {
                      return <Button size="sm" variant="outline" onClick={() => setEditingProject(project)}>{tx("Modifier", "Edit")}</Button>
                    }
                    return (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button size="sm" variant="outline" disabled>{tx("Modifier", "Edit")}</Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{editability.reason ? tx(editability.reason.fr, editability.reason.en) : tx("Modification non disponible.", "Editing unavailable.")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )
                  })()}
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={setProjectStatus.isPending || project.status === "draft"}
                    onClick={() => setProjectStatus.mutate({ id: project.id, status: project.status === "published" ? "closed" : "published" })}
                  >{project.status === "published" ? tx("Clôturer le vote", "Close voting") : tx("Rouvrir le vote", "Reopen voting")}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
      {editingProject && <ProjectEditDialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(null)} project={editingProject} services={services.data ?? []} />}
    </Container>
  )
}

export function ServiceProjectStatsPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const stats = useProjectStats()
  const services = useServices()
  const canViewServiceStats = user?.isAdmin || user?.profileRole === "service_admin"
  const visibleStats = (stats.data ?? []).filter((stat) => user?.isAdmin || user?.serviceIds.includes(stat.service_id))

  return (
    <Container className="max-w-5xl">
      <title>{tx("Statistiques des projets", "Project statistics")}</title>
      <PageHeader eyebrow={tx("Espace service", "Service workspace")} title={tx("Statistiques des projets", "Project statistics")} description={tx("Suivez les votes citoyens sur les projets liés à vos services.", "Track citizen votes on projects assigned to your services.")} />
      {services.isError && <p role="alert" className="mb-4 rounded-lg border p-3 text-sm">{tx("Impossible de charger les services municipaux.", "Could not load city services.")}</p>}
      {!canViewServiceStats ? (
        <p role="alert" className="rounded-lg border p-4">{tx("Ces statistiques sont réservées aux administrateurs des services concernés.", "These statistics are limited to administrators of the relevant services.")}</p>
      ) : (
        <DataState data={visibleStats} isLoading={stats.isLoading} error={stats.error} onRetry={() => void stats.refetch()} emptyTitle={tx("Aucun résultat de vote", "No vote results")}>
          {(items) => (
            <div className="overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/60"><tr>
                  <th scope="col" className="p-3">{tx("Projet", "Project")}</th>
                  <th scope="col" className="p-3">{tx("Service", "Service")}</th>
                  <th scope="col" className="p-3">{tx("Pour", "In favor")}</th>
                  <th scope="col" className="p-3">{tx("Contre", "Against")}</th>
                  <th scope="col" className="p-3">{tx("Commentaires", "Comments")}</th>
                </tr></thead>
                <tbody>{items.map((stat) => (
                  <tr key={stat.project_id} className="border-b last:border-0">
                    <th scope="row" className="p-3 font-medium">{stat.title}</th>
                    <td className="p-3">{services.data?.find((service) => service.id === stat.service_id)?.name ?? stat.service_id}</td>
                    <td className="p-3">{stat.yes_votes}</td><td className="p-3">{stat.no_votes}</td><td className="p-3">{stat.comment_count}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </DataState>
      )}
    </Container>
  )
}
