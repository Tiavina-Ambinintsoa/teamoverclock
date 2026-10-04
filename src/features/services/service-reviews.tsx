import { useMemo, useState } from "react"
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Loader2, MessageSquareText, Pencil, Star, Trash2 } from "lucide-react"
import { Link } from "react-router"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/features/auth/auth-context"
import { fetchDisplayNames } from "@/features/requests/request-queries"
import { buildReviewStatsMap, formatAverageRating, reviewTargetKey, type ReviewStat } from "@/features/services/service-reviews-utils"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"

const REVIEW_PAGE_SIZE = 5

interface ServiceReviewFacility {
  id: string
  name: string
}

interface ServiceReviewRow {
  id: string
  service_id: string
  building_id: string | null
  author_id: string
  rating: number
  comment: string | null
  created_at: string
  updated_at: string
}

interface ServiceReviewsProps {
  serviceId: string
  facilities: ServiceReviewFacility[]
}

interface ReviewPage {
  rows: ServiceReviewRow[]
  names: Record<string, string>
  nextOffset?: number
}

const STAR_VALUES = [1, 2, 3, 4, 5] as const

export function ServiceReviews({ serviceId, facilities }: ServiceReviewsProps) {
  const { tx, tag } = useLocale()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [target, setTarget] = useState<string>("__service__")
  const [drafts, setDrafts] = useState<Record<string, { rating: number; comment: string }>>({})

  const selectedBuildingId = target === "__service__" ? null : target
  const selectedTargetKey = reviewTargetKey(selectedBuildingId)
  const targetOptions = useMemo(
    () => [{ id: "__service__", name: tx("Service principal", "Main service") }, ...facilities],
    [facilities, tx]
  )

  const stats = useQuery({
    queryKey: ["service-review-stats", serviceId],
    enabled: Boolean(supabase),
    queryFn: async () => {
      if (!supabase) return {} as Record<string, ReviewStat>
      const rows = unwrap(
        await supabase
          .from("service_review_stats")
          .select("service_id,building_id,average_rating,review_count")
          .eq("service_id", serviceId),
        []
      ) as ReviewStat[]
      return buildReviewStatsMap(rows)
    },
  })

  const reviews = useInfiniteQuery({
    queryKey: ["service-reviews", serviceId, selectedBuildingId],
    enabled: Boolean(supabase),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<ReviewPage> => {
      if (!supabase) return { rows: [], names: {} }
      let query = supabase
        .from("service_reviews")
        .select("id,service_id,building_id,author_id,rating,comment,created_at,updated_at")
        .eq("service_id", serviceId)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + REVIEW_PAGE_SIZE - 1)
      query = selectedBuildingId ? query.eq("building_id", selectedBuildingId) : query.is("building_id", null)
      const rows = unwrap(await query, []) as ServiceReviewRow[]
      const names = await fetchDisplayNames(rows.map((row) => row.author_id))
      return {
        rows,
        names,
        nextOffset: rows.length === REVIEW_PAGE_SIZE ? pageParam + REVIEW_PAGE_SIZE : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })

  const reviewRows = useMemo(() => reviews.data?.pages.flatMap((page) => page.rows) ?? [], [reviews.data])
  const reviewNames = useMemo(
    () => Object.assign({}, ...(reviews.data?.pages.map((page) => page.names) ?? [])) as Record<string, string>,
    [reviews.data]
  )
  const myReview = useMemo(
    () => (user ? reviewRows.find((row) => row.author_id === user.id) ?? null : null),
    [reviewRows, user]
  )
  const draft = drafts[selectedTargetKey] ?? { rating: myReview?.rating ?? 5, comment: myReview?.comment ?? "" }
  const rating = draft.rating
  const comment = draft.comment

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["service-review-stats", serviceId] })
    await queryClient.invalidateQueries({ queryKey: ["service-review-card-stats"] })
    await queryClient.invalidateQueries({ queryKey: ["service-reviews", serviceId] })
  }

  const saveReview = useMutation({
    mutationFn: async () => {
      if (!supabase || !user || user.isDemo) throw new Error(tx("Connectez-vous avec un compte actif pour laisser un avis.", "Sign in with an active account to leave a review."))
      const payload = {
        service_id: serviceId,
        building_id: selectedBuildingId,
        rating,
        comment: comment.trim() || null,
      }
      if (myReview) {
        const { error } = await supabase.from("service_reviews").update(payload).eq("id", myReview.id)
        if (error) throw new Error(error.message)
        return
      }
      const { error } = await supabase.from("service_reviews").insert(payload)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      setDrafts((current) => {
        const next = { ...current }
        delete next[selectedTargetKey]
        return next
      })
      toast.success(myReview ? tx("Avis mis à jour.", "Review updated.") : tx("Avis enregistré.", "Review saved."))
      await invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteReview = useMutation({
    mutationFn: async () => {
      if (!supabase || !myReview) throw new Error(tx("Aucun avis à supprimer.", "No review to delete."))
      const { error } = await supabase.from("service_reviews").delete().eq("id", myReview.id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Avis supprimé.", "Review deleted."))
      setDrafts((current) => {
        const next = { ...current }
        delete next[selectedTargetKey]
        return next
      })
      await invalidate()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const selectedStats = stats.data?.[reviewTargetKey(selectedBuildingId)]

  return (
    <section aria-labelledby="service-reviews-title" className="rounded-xl border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="service-reviews-title" className="font-semibold">{tx("Avis et notes", "Ratings and reviews")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Consultez les notes du service principal et de ses établissements, puis partagez votre expérience.", "Browse ratings for the main service and its facilities, then share your experience.")}
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Star className="size-3.5 fill-current" aria-hidden />
          {formatAverageRating(selectedStats?.average_rating, tag)} · {selectedStats?.review_count ?? 0} {tx("avis", "reviews")}
        </Badge>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {targetOptions.map((option) => {
          const optionBuildingId = option.id === "__service__" ? null : option.id
          const optionStats = stats.data?.[reviewTargetKey(optionBuildingId)]
          const selected = target === option.id
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => setTarget(option.id)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                selected ? "border-primary bg-primary/5" : "hover:bg-accent"
              )}
            >
              <p className="font-medium">{option.name}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">★ {formatAverageRating(optionStats?.average_rating, tag)}</span>
                {" · "}
                {optionStats?.review_count ?? 0} {tx("avis", "reviews")}
              </p>
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <MessageSquareText className="size-4" aria-hidden />
            <h3 className="font-medium">
              {targetOptions.find((option) => option.id === target)?.name}
            </h3>
          </div>
          <ul className="grid gap-3">
            {reviewRows.map((review) => {
              const mine = user?.id === review.author_id
              return (
                <li key={review.id} className="rounded-xl border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">
                        {reviewNames[review.author_id] ?? "—"}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {formatDateTime(review.updated_at || review.created_at, tag)}
                        </span>
                      </p>
                      <p className="mt-1 text-amber-500" aria-label={tx(`${review.rating} étoiles sur 5`, `${review.rating} out of 5 stars`)}>
                        {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                      </p>
                    </div>
                    {mine && (
                      <Badge variant="secondary">{tx("Votre avis", "Your review")}</Badge>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">
                    {review.comment?.trim() || tx("Aucun commentaire ajouté.", "No comment added.")}
                  </p>
                </li>
              )
            })}
            {!reviews.isLoading && reviewRows.length === 0 && (
              <li className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                {tx("Aucun avis pour cette sélection pour le moment.", "No reviews for this selection yet.")}
              </li>
            )}
          </ul>
          {reviews.hasNextPage && (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={reviews.isFetchingNextPage}
              onClick={() => void reviews.fetchNextPage()}
            >
              {reviews.isFetchingNextPage && <Loader2 className="animate-spin" aria-hidden />}
              {tx("Charger plus d'avis", "Load more reviews")}
            </Button>
          )}
        </div>

        <div className="rounded-xl border bg-background/50 p-4">
          <div className="grid gap-2">
            <Label htmlFor="review-target">{tx("Laisser un avis pour", "Review target")}</Label>
            <Select id="review-target" value={target} onChange={(event) => setTarget(event.target.value)}>
              {targetOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name}</option>
              ))}
            </Select>
          </div>

          {!user || user.isDemo ? (
            <p className="mt-4 text-sm text-muted-foreground">
              <Link to="/connexion" className="font-medium text-primary underline underline-offset-4">
                {tx("Connectez-vous", "Sign in")}
              </Link>{" "}
              {tx("pour noter ce service et partager un commentaire.", "to rate this service and share a comment.")}
            </p>
          ) : (
            <form
              className="mt-4 grid gap-4"
              onSubmit={(event) => {
                event.preventDefault()
                saveReview.mutate()
              }}
            >
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium">{tx("Note", "Rating")}</legend>
                <div role="radiogroup" aria-label={tx("Choisir une note", "Choose a rating")} className="flex flex-wrap gap-2">
                  {STAR_VALUES.map((value) => (
                    <label
                      key={value}
                      className={cn(
                        "inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-2 text-sm",
                        rating === value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                      )}
                    >
                      <input
                        type="radio"
                        name="review-rating"
                        value={value}
                        checked={rating === value}
                        onChange={() => setDrafts((current) => ({
                          ...current,
                          [selectedTargetKey]: { rating: value, comment },
                        }))}
                        className="sr-only"
                      />
                      <span aria-hidden>{"★".repeat(value)}</span>
                      <span>{value}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="grid gap-2">
                <Label htmlFor="review-comment">{tx("Commentaire", "Comment")}</Label>
                <Textarea
                  id="review-comment"
                  value={comment}
                  maxLength={1000}
                  onChange={(event) => setDrafts((current) => ({
                    ...current,
                    [selectedTargetKey]: { rating, comment: event.target.value },
                  }))}
                  placeholder={tx("Décrivez votre expérience avec ce service…", "Describe your experience with this service…")}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saveReview.isPending}>
                  {saveReview.isPending && <Loader2 className="animate-spin" aria-hidden />}
                  {myReview ? (
                    <>
                      <Pencil aria-hidden />
                      {tx("Mettre à jour", "Update")}
                    </>
                  ) : tx("Publier mon avis", "Post my review")}
                </Button>
                {myReview && (
                  <Button type="button" variant="outline" disabled={deleteReview.isPending} onClick={() => deleteReview.mutate()}>
                    {deleteReview.isPending && <Loader2 className="animate-spin" aria-hidden />}
                    <Trash2 aria-hidden />
                    {tx("Supprimer", "Delete")}
                  </Button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
