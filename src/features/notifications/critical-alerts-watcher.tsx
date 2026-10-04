import { useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"

import { useAuth } from "@/features/auth/auth-context"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"
import { unwrap } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

interface CriticalReportRow {
  id: string
  title: string
  priority: string
  status: string
}

interface CriticalDangerRow {
  id: string
  title: string
  severity: string
  status: string
}

const CRITICAL_REPORT_STATUSES = ["resolved", "rejected"]
const CRITICAL_DANGER_SEVERITIES = ["extreme", "high"]

function isCriticalReport(row: Partial<CriticalReportRow> | null | undefined) {
  return row?.priority === "critical" && Boolean(row.status && !CRITICAL_REPORT_STATUSES.includes(row.status))
}

function isCriticalDanger(row: Partial<CriticalDangerRow> | null | undefined) {
  return Boolean(row?.status === "active" && row.severity && CRITICAL_DANGER_SEVERITIES.includes(row.severity))
}

export function CriticalAlertsWatcher() {
  const { user } = useAuth()
  const { tx } = useLocale()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const seenReports = useRef<Set<string>>(new Set())
  const seenDangers = useRef<Set<string>>(new Set())
  const initialized = useRef(false)
  const canWatch = Boolean(user && (user.isAdmin || ["agent", "service_admin", "general_admin"].includes(user.profileRole)))

  const criticalReports = useQuery({
    queryKey: ["critical-alerts", "reports", user?.id],
    enabled: Boolean(supabase && canWatch),
    queryFn: async (): Promise<CriticalReportRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase
          .from("reports")
          .select("id,title,priority,status")
          .eq("priority", "critical")
          .not("status", "in", "(resolved,rejected)")
          .is("deleted_at", null)
          .order("created_at", { ascending: false }),
        [],
      ) as CriticalReportRow[]
    },
  })

  const criticalDangers = useQuery({
    queryKey: ["critical-alerts", "dangers", user?.id],
    enabled: Boolean(supabase && canWatch),
    queryFn: async (): Promise<CriticalDangerRow[]> => {
      if (!supabase) return []
      return unwrap(
        await supabase
          .from("dangers")
          .select("id,title,severity,status")
          .eq("status", "active")
          .in("severity", CRITICAL_DANGER_SEVERITIES)
          .order("valid_from", { ascending: false }),
        [],
      ) as CriticalDangerRow[]
    },
  })

  useEffect(() => {
    if (!canWatch || initialized.current || criticalReports.isLoading || criticalDangers.isLoading) return
    seenReports.current = new Set((criticalReports.data ?? []).map((report) => report.id))
    seenDangers.current = new Set((criticalDangers.data ?? []).map((danger) => danger.id))
    initialized.current = true
  }, [canWatch, criticalDangers.data, criticalDangers.isLoading, criticalReports.data, criticalReports.isLoading])

  useEffect(() => {
    if (!supabase || !canWatch || !user) return
    const client = supabase

    const channel = client
      .channel(`critical-alerts-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "reports" }, (payload) => {
        const next = payload.new as CriticalReportRow | undefined
        if (next && isCriticalReport(next)) {
          if (!seenReports.current.has(next.id)) {
            seenReports.current.add(next.id)
            toast.error(tx("Signalement critique à traiter.", "Critical report requires attention."), {
              duration: Infinity,
              action: {
                label: tx("Ouvrir", "Open"),
                onClick: () => void navigate(`/agent/reports/${next.id}`),
              },
            })
          }
        } else if (next?.id) {
          seenReports.current.delete(next.id)
        }

        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["agent-reports"] }),
          queryClient.invalidateQueries({ queryKey: ["critical-alerts", "reports"] }),
        ])
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "dangers" }, (payload) => {
        const next = payload.new as CriticalDangerRow | undefined
        if (next && isCriticalDanger(next)) {
          if (!seenDangers.current.has(next.id)) {
            seenDangers.current.add(next.id)
            toast.error(tx("Alerte majeure active.", "Major alert is active."), {
              duration: Infinity,
              action: {
                label: tx("Voir la liste", "View list"),
                onClick: () => void navigate("/agent/dangers"),
              },
            })
          }
        } else if (next?.id) {
          seenDangers.current.delete(next.id)
        }

        void Promise.all([
          queryClient.invalidateQueries({ queryKey: ["manage-dangers"] }),
          queryClient.invalidateQueries({ queryKey: ["dangers"] }),
          queryClient.invalidateQueries({ queryKey: ["critical-alerts", "dangers"] }),
        ])
      })
      .subscribe()

    return () => {
      void client.removeChannel(channel)
    }
  }, [canWatch, navigate, queryClient, tx, user])

  const reportCount = criticalReports.data?.length ?? 0
  const dangerCount = criticalDangers.data?.length ?? 0
  const total = reportCount + dangerCount
  const primaryHref = reportCount > 0 ? "/agent/reports" : "/agent/dangers"
  const bannerText = useMemo(() => {
    if (total === 0) return ""
    return tx(
      `${total} élément(s) critique(s) à traiter immédiatement`,
      `${total} critical item(s) need attention now`,
    )
  }, [total, tx])

  if (!canWatch || total === 0) return null

  return (
    <div className="sticky top-16 z-20 border-b border-destructive/40 bg-destructive/10 backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link to={primaryHref} className="text-sm font-medium text-destructive underline-offset-4 hover:underline">
          {bannerText}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {reportCount > 0 && (
            <Button asChild size="sm" variant="destructive">
              <Link to="/agent/reports">{tx(`${reportCount} signalement(s)`, `${reportCount} report(s)`)}</Link>
            </Button>
          )}
          {dangerCount > 0 && (
            <Button asChild size="sm" variant="outline">
              <Link to="/agent/dangers">{tx(`${dangerCount} alerte(s)`, `${dangerCount} alert(s)`)}</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
