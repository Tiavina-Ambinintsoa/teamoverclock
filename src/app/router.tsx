import { createBrowserRouter, createHashRouter, type RouteObject } from "react-router"

import { ApplicationLayout } from "@/components/layout/application-layout"
import { RootLayout } from "@/components/layout/root-layout"
import { PageLoader } from "@/components/page-loader"
import { RouteError } from "@/components/route-error"
import { RequireAdmin } from "@/features/admin/require-admin"
import { RequireAuth } from "@/features/auth/require-auth"
import { env } from "@/lib/env"

const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    HydrateFallback: PageLoader,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, lazy: async () => ({ Component: (await import("@/pages/custom-home-page")).CustomHomePage }) },
          { path: "connexion", lazy: async () => ({ Component: (await import("@/features/auth/login-page")).LoginPage }) },
          { path: "inscription", lazy: async () => ({ Component: (await import("@/features/auth/register-page")).RegisterPage }) },
          { path: "mot-de-passe-oublie", lazy: async () => ({ Component: (await import("@/features/auth/password-pages")).PasswordRecoveryPage }) },
          { path: "nouveau-mot-de-passe", lazy: async () => ({ Component: (await import("@/features/auth/password-pages")).PasswordUpdatePage }) },
          { path: "admin/connexion", lazy: async () => ({ Component: (await import("@/features/auth/admin-login-page")).AdminLoginPage }) },
          { path: "equipe", lazy: async () => ({ Component: (await import("@/pages/site-pages")).TeamPage }) },
          { path: "contact", lazy: async () => ({ Component: (await import("@/pages/site-pages")).ContactPage }) },
          { path: "conditions", lazy: async () => ({ Component: (await import("@/pages/site-pages")).LegalNoticePage }) },
          { path: "confidentialite", lazy: async () => ({ Component: (await import("@/pages/site-pages")).PrivacyPage }) },

          {
            element: <RequireAuth />,
            children: [
              {
                element: <ApplicationLayout />,
                children: [
                  { path: "app", lazy: async () => ({ Component: (await import("@/features/items/items-page")).ItemsPage }) },
                  { path: "app/dashboard", lazy: async () => ({ Component: (await import("@/pages/app/dashboard-page")).DashboardPage }) },
                  { path: "app/parametres", lazy: async () => ({ Component: (await import("@/pages/app/settings-page")).SettingsPage }) },
                  { path: "app/assistant", lazy: async () => ({ Component: (await import("@/pages/app/assistant-page")).AssistantPage }) },
                  { path: "app/items/:id", lazy: async () => ({ Component: (await import("@/features/items/item-detail-page")).ItemDetailPage }) },
                ],
              },
            ],
          },

          {
            path: "admin",
            element: <RequireAdmin />,
            children: [
              { index: true, lazy: async () => ({ Component: (await import("@/features/admin/admin-page")).AdminPage }) },
              { path: ":section", lazy: async () => ({ Component: (await import("@/features/admin/admin-page")).AdminPage }) },
            ],
          },

          ...(env.enableKit
            ? [
                { path: "kit", lazy: async () => ({ Component: (await import("@/pages/kit-page")).KitPage }) },
                { path: "modeles", lazy: async () => ({ Component: (await import("@/pages/templates/templates-index-page")).TemplatesIndexPage }) },
                { path: "modeles/accueils", lazy: async () => ({ Component: (await import("@/pages/templates/home-variants-page")).HomeVariantsPage }) },
                { path: "modeles/animations", lazy: async () => ({ Component: (await import("@/pages/templates/animations-page")).AnimationsPage }) },
                { path: "modeles/carte", lazy: async () => ({ Component: (await import("@/pages/templates/map-page")).MapPage }) },
                { path: "modeles/agenda", lazy: async () => ({ Component: (await import("@/pages/templates/agenda-page")).AgendaPage }) },
                { path: "modeles/galerie", lazy: async () => ({ Component: (await import("@/pages/templates/gallery-page")).GalleryPage }) },
                { path: "modeles/3d", lazy: async () => ({ Component: (await import("@/pages/templates/three-d-page")).ThreeDPage }) },
                { path: "modeles/video", lazy: async () => ({ Component: (await import("@/pages/templates/video-page")).VideoPage }) },
                { path: "modeles/interactions", lazy: async () => ({ Component: (await import("@/pages/templates/interactions-page")).InteractionsPage }) },
                { path: "modeles/marketing", lazy: async () => ({ Component: (await import("@/pages/templates/marketing-page")).MarketingPage }) },
                { path: "modeles/tableau-de-bord", lazy: async () => ({ Component: (await import("@/pages/templates/dashboard-page")).DashboardPage }) },
              ]
            : []),
          { path: "*", lazy: async () => ({ Component: (await import("@/pages/not-found-page")).NotFoundPage }) },
        ],
      },
    ],
  },
]

export const router = env.hashRouter
  ? createHashRouter(routes)
  : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
