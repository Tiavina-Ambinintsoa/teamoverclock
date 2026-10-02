import { useCallback, useEffect, useState } from "react"
import { Bell } from "lucide-react"
import { useNavigate } from "react-router"

import { useAuth } from "@/features/auth/auth-context"
import { supabase } from "@/lib/supabase"

type AppNotification = { id: string; title: string; body: string; href: string; read_at: string | null; created_at: string }

export function NotificationsMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<AppNotification[]>([])
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !user || user.isDemo) { setItems([]); return }
    const { data } = await supabase.from("notifications").select("id,title,body,href,read_at,created_at")
      .order("created_at", { ascending: false }).limit(15)
    setItems((data ?? []) as AppNotification[])
  }, [user?.id, user?.isDemo])

  useEffect(() => {
    void load()
    const interval = window.setInterval(() => void load(), 60000)
    return () => window.clearInterval(interval)
  }, [load])

  const openNotification = async (notification: AppNotification) => {
    if (supabase && !notification.read_at) {
      await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", notification.id)
      setItems((current) => current.map((item) => item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
    }
    setOpen(false)
    await navigate(notification.href)
  }

  const unread = items.filter((item) => !item.read_at).length
  return (
    <div className="relative">
      <button type="button" aria-label={`Notifications${unread ? `, ${unread} non lues` : ""}`} aria-expanded={open} onClick={() => { setOpen((value) => !value); if (!open) void load() }} className="relative grid size-9 place-items-center rounded-full border hover:bg-accent">
        <Bell className="size-4" aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute -top-1 -right-1 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && <div className="absolute top-11 right-0 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-xl border bg-popover p-3 shadow-xl">
        <div className="flex items-center justify-between px-2 py-1"><p className="font-semibold">Notifications</p><span className="text-xs text-muted-foreground">{unread} non lue{unread > 1 ? "s" : ""}</span></div>
        <div className="mt-2 grid max-h-80 gap-1 overflow-y-auto">
          {items.map((item) => <button key={item.id} type="button" onClick={() => void openNotification(item)} className={`rounded-lg p-3 text-left hover:bg-accent ${item.read_at ? "opacity-70" : "bg-primary/5"}`}>
            <span className="flex items-start gap-2"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read_at ? "bg-muted-foreground/30" : "bg-primary"}`} aria-hidden /><span className="min-w-0"><span className="block text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.body}</span><time className="mt-1 block text-[10px] text-muted-foreground" dateTime={item.created_at}>{new Date(item.created_at).toLocaleString("fr-FR")}</time></span></span>
          </button>)}
          {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">Vous êtes à jour.</p>}
        </div>
      </div>}
    </div>
  )
}
