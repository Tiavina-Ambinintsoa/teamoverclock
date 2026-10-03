import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Select } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

type Frequency = "instant" | "daily" | "weekly"
interface Topic { id: string; code: string; label: string; description: string | null }
interface Subscription { id: string; topic_id: string; frequency: Frequency; is_active: boolean }

/** Lettres d'information par sujet : l'habitant choisit ses thèmes et la fréquence. */
export function NewsletterPage() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const queryClient = useQueryClient()

  const data = useQuery({
    queryKey: ["newsletter", user?.id],
    enabled: Boolean(supabase && user && !user.isDemo),
    queryFn: async () => {
      if (!supabase || !user) return { topics: [] as Topic[], subs: [] as Subscription[] }
      const [topics, subs] = await Promise.all([
        supabase.from("newsletter_topics").select("id,code,label,description").order("label"),
        supabase.from("newsletter_subscriptions").select("id,topic_id,frequency,is_active").eq("profile_id", user.id),
      ])
      return { topics: unwrap(topics, []) as Topic[], subs: unwrap(subs, []) as Subscription[] }
    },
  })

  const save = useMutation({
    mutationFn: async (input: { topicId: string; isActive: boolean; frequency: Frequency }) => {
      if (!supabase || !user) throw new Error("Supabase")
      const { error } = await supabase.from("newsletter_subscriptions").upsert(
        { profile_id: user.id, topic_id: input.topicId, is_active: input.isActive, frequency: input.frequency },
        { onConflict: "profile_id,topic_id" }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["newsletter"] }),
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <Container className="max-w-3xl">
      <title>{tx("Lettres d'information", "Newsletters")}</title>
      <PageHeader eyebrow={tx("Mon espace", "My space")} title={tx("Lettres d'information", "Newsletters")} description={tx("Recevez uniquement les sujets qui vous intéressent, à la fréquence de votre choix.", "Receive only the topics you care about, at the frequency you choose.")} />
      <DataState data={data.data?.topics} isLoading={data.isLoading} error={data.error} onRetry={() => void data.refetch()} emptyTitle={tx("Aucun sujet disponible", "No topic available")}>
        {(topics) => (
          <ul className="grid gap-3">
            {topics.map((topic) => {
              const sub = data.data?.subs.find((s) => s.topic_id === topic.id)
              const active = sub?.is_active ?? false
              const frequency = sub?.frequency ?? "weekly"
              return (
                <li key={topic.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                  <div className="min-w-0">
                    <p id={`t-${topic.id}`} className="font-medium">{topic.label}</p>
                    <p className="text-sm text-muted-foreground">{topic.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Select aria-label={tx("Fréquence", "Frequency")} value={frequency} disabled={!active} className="w-36" onChange={(e) => save.mutate({ topicId: topic.id, isActive: active, frequency: e.target.value as Frequency })}>
                      <option value="instant">{tx("Immédiate", "Instant")}</option>
                      <option value="daily">{tx("Quotidienne", "Daily")}</option>
                      <option value="weekly">{tx("Hebdomadaire", "Weekly")}</option>
                    </Select>
                    <Switch aria-labelledby={`t-${topic.id}`} checked={active} onCheckedChange={(checked) => save.mutate({ topicId: topic.id, isActive: checked, frequency })} />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
