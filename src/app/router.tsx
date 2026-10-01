import { createBrowserRouter, createHashRouter, type RouteObject } from "react-router"

import { RootLayout } from "@/components/layout/root-layout"
import { PageLoader } from "@/components/page-loader"
import { RouteError } from "@/components/route-error"
import { RequireAuth } from "@/features/auth/require-auth"
import { env } from "@/lib/env"

/**
 * Toutes les pages sont chargées à la demande (lazy) : moins de JS au premier affichage
 * (meilleure performance, meilleure écoconception). Ajoutez vos routes ici.
 */
const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    errorElement: <RouteError />,
    HydrateFallback: PageLoader,
    children: [
      {
        // Une erreur dans une page s'affiche DANS le layout (en-tête et pied de page conservés).
        errorElement: <RouteError />,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import("@/pages/home-page")).HomePage }),
          },
          {
            path: "connexion",
            lazy: async () => ({ Component: (await import("@/features/auth/login-page")).LoginPage }),
          },
          {
            path: "inscription",
            lazy: async () => ({ Component: (await import("@/features/auth/register-page")).RegisterPage }),
          },
          {
            // Tout ce qui est ici exige un utilisateur connecté (ou le mode démo).
            element: <RequireAuth />,
            children: [
              {
                path: "app",
                lazy: async () => ({ Component: (await import("@/features/items/items-page")).ItemsPage }),
              },
              {
                path: "app/items/:id",
                lazy: async () => ({
                  Component: (await import("@/features/items/item-detail-page")).ItemDetailPage,
                }),
              },
            ],
          },
          // Kit (composants/thèmes) et Modèles (pages entières) : outillage d'équipe, jamais montré
          // au jury par défaut (VITE_ENABLE_KIT=false en production). Voir docs/07-modeles-de-pages.md
          // pour transformer un modèle en vraie page de l'application.
          ...(env.enableKit
            ? [
                {
                  path: "kit",
                  lazy: async () => ({ Component: (await import("@/pages/kit-page")).KitPage }),
                },
                {
                  path: "modeles",
                  lazy: async () => ({
                    Component: (await import("@/pages/templates/templates-index-page")).TemplatesIndexPage,
                  }),
                },
                {
                  path: "modeles/galerie",
                  lazy: async () => ({ Component: (await import("@/pages/templates/gallery-page")).GalleryPage }),
                },
                {
                  path: "modeles/3d",
                  lazy: async () => ({ Component: (await import("@/pages/templates/three-d-page")).ThreeDPage }),
                },
                {
                  path: "modeles/video",
                  lazy: async () => ({ Component: (await import("@/pages/templates/video-page")).VideoPage }),
                },
                {
                  path: "modeles/interactions",
                  lazy: async () => ({
                    Component: (await import("@/pages/templates/interactions-page")).InteractionsPage,
                  }),
                },
                {
                  path: "modeles/marketing",
                  lazy: async () => ({ Component: (await import("@/pages/templates/marketing-page")).MarketingPage }),
                },
                {
                  path: "modeles/tableau-de-bord",
                  lazy: async () => ({ Component: (await import("@/pages/templates/dashboard-page")).DashboardPage }),
                },
              ]
            : []),
          {
            path: "*",
            lazy: async () => ({ Component: (await import("@/pages/not-found-page")).NotFoundPage }),
          },
        ],
      },
    ],
  },
]

// VITE_USE_HASH_ROUTER=true : URLs en /#/route, aucune règle de réécriture serveur nécessaire.
export const router = env.hashRouter
  ? createHashRouter(routes)
  : createBrowserRouter(routes, { basename: import.meta.env.BASE_URL })
