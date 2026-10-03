import { createBrowserRouter, createHashRouter, type RouteObject } from "react-router"

import { ApplicationLayout } from "@/components/layout/application-layout"
import { RootLayout } from "@/components/layout/root-layout"
import { PageLoader } from "@/components/page-loader"
import { RouteError } from "@/components/route-error"
import { RequireAuth } from "@/features/auth/require-auth"
import { RequireRole } from "@/features/auth/require-role"
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
          { index: true, lazy: async () => ({ Component: (await import("@/pages/home-page")).HomePage }) },
          { path: "connexion", lazy: async () => ({ Component: (await import("@/features/auth/login-page")).LoginPage }) },
          { path: "inscription", lazy: async () => ({ Component: (await import("@/features/auth/register-page")).RegisterPage }) },
          { path: "mot-de-passe-oublie", lazy: async () => ({ Component: (await import("@/features/auth/password-pages")).PasswordRecoveryPage }) },
          { path: "nouveau-mot-de-passe", lazy: async () => ({ Component: (await import("@/features/auth/password-pages")).PasswordUpdatePage }) },
          { path: "admin/connexion", lazy: async () => ({ Component: (await import("@/features/auth/admin-login-page")).AdminLoginPage }) },
          { path: "services", lazy: async () => ({ Component: (await import("@/features/services/services-page")).ServicesPage }) },
          { path: "services/:slug", lazy: async () => ({ Component: (await import("@/features/services/service-detail-page")).ServiceDetailPage }) },
          { path: "news", lazy: async () => ({ Component: (await import("@/features/news/news-page")).NewsPage }) },
          { path: "news/:slug", lazy: async () => ({ Component: (await import("@/features/news/news-detail-page")).NewsDetailPage }) },
          { path: "reports", lazy: async () => ({ Component: (await import("@/features/reports/reports-lists")).PublicReportsPage }) },
          { path: "dangers", lazy: async () => ({ Component: (await import("@/features/dangers/dangers-pages")).DangersPage }) },
          { path: "dangers/:slug", lazy: async () => ({ Component: (await import("@/features/dangers/dangers-pages")).DangerDetailPage }) },
          { path: "map", lazy: async () => ({ Component: (await import("@/features/map/map-page")).MapPage }) },
          { path: "guide", lazy: async () => ({ Component: (await import("@/features/guide/guide-page")).GuidePage }) },
          { path: "equipe", lazy: async () => ({ Component: (await import("@/pages/site-pages")).TeamPage }) },
          { path: "contact", lazy: async () => ({ Component: (await import("@/features/requests/contact-page")).ContactPage }) },
          { path: "conditions", lazy: async () => ({ Component: (await import("@/pages/site-pages")).LegalNoticePage }) },
          { path: "confidentialite", lazy: async () => ({ Component: (await import("@/pages/site-pages")).PrivacyPage }) },

          {
            element: <RequireAuth />,
            children: [
              {
                element: <ApplicationLayout />,
                children: [
                  { path: "app", lazy: async () => ({ Component: (await import("@/features/citizen/citizen-dashboard")).CitizenDashboard }) },
                  { path: "app/verification", lazy: async () => ({ Component: (await import("@/features/profile/verification-page")).VerificationPage }) },
                  { path: "app/accessibility", lazy: async () => ({ Component: (await import("@/features/accessibility/accessibility-page")).AccessibilityPage }) },
                  { path: "app/support", lazy: async () => ({ Component: (await import("@/features/support/support-pages")).SupportPage }) },
                  { path: "app/parametres", lazy: async () => ({ Component: (await import("@/pages/app/settings-page")).SettingsPage }) },
                  { path: "app/requests", lazy: async () => ({ Component: (await import("@/features/requests/my-requests-page")).MyRequestsPage }) },
                  { path: "app/requests/new", lazy: async () => ({ Component: (await import("@/features/requests/request-new-page")).RequestNewPage }) },
                  { path: "app/requests/:id", lazy: async () => ({ Component: (await import("@/features/requests/request-detail")).CitizenRequestDetailPage }) },
                  { path: "app/reports", lazy: async () => ({ Component: (await import("@/features/reports/reports-lists")).MyReportsPage }) },
                  { path: "app/reports/new", lazy: async () => ({ Component: (await import("@/features/reports/report-new-page")).ReportNewPage }) },
                  { path: "app/reports/:id", lazy: async () => ({ Component: (await import("@/features/reports/report-detail")).CitizenReportDetailPage }) },
                  { path: "app/newsletter", lazy: async () => ({ Component: (await import("@/features/newsletter/newsletter-page")).NewsletterPage }) },
                  { path: "app/assistant", lazy: async () => ({ Component: (await import("@/features/chatbot/chatbot-page")).ChatbotPage }) },
                  {
                    element: <RequireRole allow={["agent", "service_admin"]} />,
                    children: [
                      { path: "agent/calls", lazy: async () => ({ Component: (await import("@/features/support/support-pages")).AgentCallsPage }) },
                      { path: "agent", lazy: async () => ({ Component: (await import("@/features/agent/agent-dashboard")).AgentDashboard }) },
                      { path: "agent/requests", lazy: async () => ({ Component: (await import("@/features/agent/agent-requests-page")).AgentRequestsPage }) },
                      { path: "agent/requests/:id", lazy: async () => ({ Component: (await import("@/features/requests/request-detail")).AgentRequestDetailPage }) },
                      { path: "agent/reports", lazy: async () => ({ Component: (await import("@/features/reports/reports-lists")).AgentReportsPage }) },
                      { path: "agent/reports/:id", lazy: async () => ({ Component: (await import("@/features/reports/report-detail")).AgentReportDetailPage }) },
                      { path: "agent/sync", lazy: async () => ({ Component: (await import("@/features/agent/agent-sync-page")).AgentSyncPage }) },
                      { path: "agent/team", lazy: async () => ({ Component: (await import("@/features/agent/agent-team-page")).AgentTeamPage }) },
                      { path: "agent/news", lazy: async () => ({ Component: (await import("@/features/admin/news-manager-pages")).AgentNewsPage }) },
                      { path: "agent/services", lazy: async () => ({ Component: (await import("@/features/admin/news-manager-pages")).AgentServicesPage }) },
                    ],
                  },
                  {
                    element: <RequireRole allow={[]} />,
                    children: [
                      { path: "admin/dangers", lazy: async () => ({ Component: (await import("@/features/admin/dangers-manager")).DangersManager }) },
                      { path: "admin/map", lazy: async () => ({ Component: (await import("@/features/map/map-editor-page")).MapEditorPage }) },
                      { path: "admin", lazy: async () => ({ Component: (await import("@/features/admin/admin-extra-pages")).AdminOverviewPage }) },
                      { path: "admin/ai-content", lazy: async () => ({ Component: (await import("@/features/admin/admin-extra-pages")).AdminAiContentPage }) },
                      { path: "admin/audit", lazy: async () => ({ Component: (await import("@/features/admin/admin-extra-pages")).AdminAuditPage }) },
                      { path: "admin/services", lazy: async () => ({ Component: (await import("@/features/admin/news-manager-pages")).AdminServicesPage }) },
                      { path: "admin/news", lazy: async () => ({ Component: (await import("@/features/admin/news-manager-pages")).AdminNewsPage }) },
                      { path: "admin/users", lazy: async () => ({ Component: (await import("@/features/admin/users-page")).AdminUsersPage }) },
                      { path: "admin/verifications", lazy: async () => ({ Component: (await import("@/features/admin/verifications-page")).AdminVerificationsPage }) },
                    ],
                  },
                ],
              },
            ],
          },

          { path: "forbidden", lazy: async () => ({ Component: (await import("@/features/auth/require-role")).ForbiddenPage }) },

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
