import type { ReactNode } from "react"
import { Outlet, ScrollRestoration, useLocation } from "react-router"

import { SiteFooter } from "@/components/layout/site-footer"
import { JetCursor } from "@/components/magic-ui"
import { SiteHeader } from "@/components/layout/site-header"
import { ChatbotPage } from "@/features/chatbot/chatbot-page"
import { FloatingAccessibilityControls } from "@/features/accessibility/floating-accessibility-controls"
import { GuideProvider } from "@/features/guide/guide-provider"
import { VoiceProvider } from "@/features/voice/voice-provider"

const AUTH_ROUTES = ["/connexion", "/inscription", "/mot-de-passe-oublie", "/nouveau-mot-de-passe", "/admin/connexion"]

/** Le guide et l'assistance vocale utilisent le routeur : ils vivent dans la mise en page racine, pas dans <Providers>. */
function AssistanceProviders({ children }: { children: ReactNode }) {
  return (
    <GuideProvider>
      <VoiceProvider>
        <JetCursor />
        {children}
        <FloatingAccessibilityControls />
      </VoiceProvider>
    </GuideProvider>
  )
}

const SkipLink = () => (
  <a
    href="#contenu"
    className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
  >
    Aller au contenu
  </a>
)

export function RootLayout() {
  const { pathname } = useLocation()
  const isFocusedLayout =
    AUTH_ROUTES.includes(pathname) ||
    pathname.startsWith("/app") ||
    pathname.startsWith("/agent") ||
    (pathname.startsWith("/admin") && pathname !== "/admin/connexion")

  if (isFocusedLayout) {
    return (
      <AssistanceProviders>
        <SkipLink />
        <div id="contenu"><Outlet /></div>
        {!AUTH_ROUTES.includes(pathname) && <ChatbotPage />}
        <ScrollRestoration />
      </AssistanceProviders>
    )
  }

  return (
    <AssistanceProviders>
      <div className="flex min-h-svh flex-col">
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
        >
          Aller au contenu
        </a>
        {pathname !== "/" && <SiteHeader />}
        <main id="contenu" className="flex-1 flex flex-col">
          <Outlet />
        </main>
        {pathname !== "/" && <SiteFooter />}
        {!AUTH_ROUTES.includes(pathname) && <ChatbotPage />}
        <ScrollRestoration />
      </div>
    </AssistanceProviders>
  )
}
