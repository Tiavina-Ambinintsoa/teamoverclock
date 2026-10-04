import { useCallback, useEffect, useMemo, useState } from "react"
import { Bell } from "lucide-react"
import { useNavigate } from "react-router"
import { toast } from "sonner"

import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { formatDateTime } from "@/lib/query-helpers"
import { supabase } from "@/lib/supabase"

type AppNotification = { id: string; title: string; body: string; href: string; read_at: string | null; created_at: string }
const EMPTY_NOTIFICATIONS: AppNotification[] = []
const currentTimestamp = () => new Date().toISOString()

export function NotificationsMenu() {
  const { user } = useAuth()
  const { tx, tag } = useLocale()
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase || !user || user.isDemo) return
    const { data, error } = await supabase.from("notifications").select("id,title,body,href,read_at,created_at")
      .order("created_at", { ascending: false }).limit(15)
    if (error) {
      setLoadError(error.message)
      return
    }
    setLoadError(null)
    setItems((data ?? []) as AppNotification[])
  }, [user])

  useEffect(() => {
    if (!open) return
    const interval = window.setInterval(() => void load(), 60000)
    return () => window.clearInterval(interval)
  }, [load, open])

  const openNotification = async (notification: AppNotification) => {
    if (supabase && !notification.read_at) {
      const readAt = currentTimestamp()
      const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", notification.id)
      if (error) {
        toast.error(tx("Impossible de marquer la notification comme lue.", "Could not mark the notification as read."))
        return
      }
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: readAt } : item))
    }
    setOpen(false)
    await navigate(notification.href)
  }

  const visibleItems = user && !user.isDemo ? items : EMPTY_NOTIFICATIONS
  const unread = visibleItems.filter((item) => !item.read_at).length
  const formattedItems = useMemo(
    () => visibleItems.map((item) => ({ ...item, formattedCreatedAt: formatDateTime(item.created_at, tag) })),
    [tag, visibleItems],
  )
  return (
    <div className="relative">
      <button type="button" aria-label={tx(`Notifications${unread ? `, ${unread} non lues` : ""}`, `Notifications${unread ? `, ${unread} unread` : ""}`)} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void load() }} className="relative grid size-9 place-items-center rounded-full border hover:bg-accent">
        <Bell className="size-4" aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && <div className="absolute top-11 right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-3 shadow-xl">
        <div className="flex items-center justify-between px-2 py-1"><p className="font-semibold">{tx("Notifications", "Notifications")}</p><span className="text-xs text-muted-foreground">{unread} {tx(unread > 1 ? "non lues" : "non lue", unread === 1 ? "unread" : "unread")}</span></div>
        {loadError && <div role="alert" className="m-2 rounded-md border border-destructive/40 p-3 text-xs">
          <p>{tx("Impossible de charger les notifications.", "Could not load notifications.")} {loadError}</p>
          <button type="button" className="mt-2 underline underline-offset-4" onClick={() => void load()}>{tx("Réessayer", "Retry")}</button>
        </div>}
        <div className="mt-2 grid max-h-80 gap-1 overflow-y-auto">
          {formattedItems.map((item) => <button key={item.id} type="button" aria-label={`${item.title}: ${item.body}`} onClick={() => void openNotification(item)} className={`rounded-lg p-3 text-left hover:bg-accent ${item.read_at ? "opacity-70" : "bg-primary/5"}`}>
            <span className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-muted-foreground/30" : "bg-primary"}`} aria-hidden /><span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.body}</span><time className="mt-1 block text-[10px] text-muted-foreground" dateTime={item.created_at}>{item.formattedCreatedAt}</time></span></span>
          </button>)}
          {visibleItems.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{tx("Vous êtes à jour.", "You are all caught up.")}</p>}
        </div>
      </div>}
    </div>
  )
}
