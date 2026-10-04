import { useLayoutEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb"
import { navForRole } from "@/components/layout/nav-config"
import { useAuth } from "@/features/auth/auth-context"
import { useLocale } from "@/lib/locale"
import { useLocation } from "react-router"

function readableSegment(segment: string): string {
  const decoded = decodeURIComponent(segment)
  if (decoded === "new") return "New"
  return decoded.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

const ROUTE_LABELS: Record<string, { fr: string; en: string }> = {
  confidentialite: { fr: "Confidentialité", en: "Privacy" },
  conditions: { fr: "Mentions légales", en: "Legal notice" },
  equipe: { fr: "Équipe", en: "Team" },
}

export function RouteBreadcrumbs() {
  const { pathname } = useLocation()
  const { user } = useAuth()
  const { tx } = useLocale()
  const [host, setHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (pathname === "/") return
    const content = document.getElementById("contenu")
    if (!content) return
    const mount = document.createElement("div")
    mount.className = "route-breadcrumbs-mount"
    const heading = content.querySelector("h1")
    const anchor = heading?.closest("header") ?? heading
    if (anchor) anchor.after(mount)
    else content.append(mount)
    const frame = window.requestAnimationFrame(() => setHost(mount))
    return () => {
      window.cancelAnimationFrame(frame)
      mount.remove()
    }
  }, [pathname])

  if (pathname === "/") return null

  const links = navForRole(user?.profileRole, user?.isAdmin === true).flatMap((group) =>
    group.items.map((item) => ({ to: item.to, label: tx(item.fr, item.en) })),
  )
  const items: BreadcrumbItem[] = [{ label: tx("Accueil", "Home"), to: "/" }]
  let currentPath = ""

  for (const segment of pathname.split("/").filter(Boolean)) {
    currentPath += `/${segment}`
    const match = links.find((link) => link.to === currentPath)
    const localizedSegment = ROUTE_LABELS[segment]
    items.push({
      label: match?.label ?? (localizedSegment ? tx(localizedSegment.fr, localizedSegment.en) : readableSegment(segment)),
      ...(currentPath === pathname ? {} : { to: currentPath }),
    })
  }

  if (!host) return null
  return createPortal(
    <Breadcrumb items={items} ariaLabel={tx("Fil d'Ariane", "Breadcrumb")} className="mt-3 mb-5" />,
    host,
  )
}
