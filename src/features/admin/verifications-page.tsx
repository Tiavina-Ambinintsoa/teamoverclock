import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { DataState } from "@/components/data-state"
import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"
import { formatDateTime, unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface VerificationRow {
  id: string
  status: "pending" | "validated" | "rejected"
  ai_model: string | null
  ai_score: number | null
  rejection_reason: string | null
  submitted_at: string
  cin_image_path: string | null
  citizens: { cin_number: string | null; profiles: { display_name: string | null } | null } | null
}

/** 1.5 — revue des vérifications CIN : le modèle décide, un administrateur peut corriger la décision. */
export function AdminVerificationsPage() {
  const { tx, tag } = useLocale()
  const queryClient = useQueryClient()

  const rows = useQuery({
    queryKey: ["admin-verifications"],
    queryFn: async (): Promise<VerificationRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase
          .from("citizen_verifications")
          .select("id,status,ai_model,ai_score,rejection_reason,submitted_at,cin_image_path,citizens(cin_number,profiles(display_name))")
          .order("submitted_at", { ascending: false })
          .limit(100),
        []
      ) as unknown as VerificationRow[]
    },
  })

  const decide = useMutation({
    mutationFn: async (input: { id: string; approve: boolean }) => {
      if (!supabase) throw new Error("Supabase")
      const { error } = await supabase.rpc("decide_cin_verification", {
        p_verification_id: input.id,
        p_approve: input.approve,
        p_reason: input.approve ? null : "Refusé après revue manuelle.",
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      toast.success(tx("Décision enregistrée.", "Decision saved."))
      await queryClient.invalidateQueries({ queryKey: ["admin-verifications"] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const openDocument = async (path: string) => {
    if (!supabase) return
    const { data, error } = await supabase.storage.from("cin-documents").createSignedUrl(path, 60)
    if (error || !data) toast.error(error?.message ?? tx("Document introuvable.", "Document not found."))
    else window.open(data.signedUrl, "_blank", "noopener")
  }

  return (
    <Container className="max-w-5xl">
      <title>{tx("Vérifications CIN", "CIN checks")}</title>
      <PageHeader eyebrow={tx("Administration", "Administration")} title={tx("Vérifications CIN", "CIN checks")} description={tx("Le modèle automatique valide le format du CIN fictif ; vous pouvez corriger chaque décision.", "The automatic model validates the fictional CIN format; you can correct any decision.")} />
      <DataState data={rows.data} isLoading={rows.isLoading} error={rows.error} onRetry={() => void rows.refetch()} emptyTitle={tx("Aucune vérification", "No verification")}>
        {(items) => (
          <ul className="grid gap-3">
            {items.map((row) => (
              <li key={row.id} className="grid gap-2 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{row.citizens?.profiles?.display_name ?? "—"} <span className="text-sm text-muted-foreground">· {row.citizens?.cin_number ?? "—"}</span></p>
                  <StatusBadge kind="validation" value={row.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(row.submitted_at, tag)} · {row.ai_model ?? "—"} · {tx("score", "score")} {row.ai_score ?? "—"}
                </p>
                {row.rejection_reason && <p className="text-sm">{row.rejection_reason}</p>}
                <div className="flex flex-wrap gap-2">
                  {row.cin_image_path && <Button size="sm" variant="outline" onClick={() => void openDocument(row.cin_image_path as string)}>{tx("Voir le document", "View document")}</Button>}
                  <Button size="sm" disabled={decide.isPending || row.status === "validated"} onClick={() => decide.mutate({ id: row.id, approve: true })}>{tx("Valider", "Approve")}</Button>
                  <Button size="sm" variant="destructive" disabled={decide.isPending || row.status === "rejected"} onClick={() => decide.mutate({ id: row.id, approve: false })}>{tx("Rejeter", "Reject")}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </Container>
  )
}
