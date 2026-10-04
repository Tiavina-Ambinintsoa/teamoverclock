import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MemoryRouter } from "react-router"

import { RouteBreadcrumbs } from "@/components/layout/route-breadcrumbs"
import { AuthContext, type AuthState } from "@/features/auth/auth-context"
import { LocaleProvider } from "@/lib/locale"

const auth: AuthState = {
  user: null,
  loading: false,
  backend: "local",
  signIn: async () => undefined,
  signInAdmin: async () => undefined,
  signUp: async () => undefined,
  signInWithOAuth: async () => undefined,
  requestPasswordReset: async () => undefined,
  updatePassword: async () => undefined,
  updateProfile: async () => undefined,
  requestEmailChange: async () => undefined,
  deleteAccount: async () => undefined,
  signInDemo: async () => undefined,
  signOut: async () => undefined,
  refreshProfile: async () => undefined,
}

function renderBreadcrumb(path: string) {
  return render(
    <AuthContext.Provider value={auth}>
      <LocaleProvider>
        <MemoryRouter initialEntries={[path]}>
          <main id="contenu">
            <header><h1>Current page</h1></header>
            <RouteBreadcrumbs />
          </main>
        </MemoryRouter>
      </LocaleProvider>
    </AuthContext.Provider>,
  )
}

describe("RouteBreadcrumbs", () => {
  it("shows the navigation hierarchy for a citizen page", async () => {
    renderBreadcrumb("/app/requests")
    expect(await screen.findByRole("navigation", { name: "Fil d'Ariane" })).toBeInTheDocument()
    expect(await screen.findByText("Accueil")).toBeInTheDocument()
    expect(await screen.findByText("Tableau de bord")).toBeInTheDocument()
    expect(await screen.findByText("Mes demandes")).toHaveAttribute("aria-current", "page")
  })

  it("shows a readable final segment for a detail route", async () => {
    renderBreadcrumb("/services/public-works")
    expect(await screen.findByText("Services")).toHaveAttribute("href", "/services")
    expect(await screen.findByText("Public Works")).toHaveAttribute("aria-current", "page")
  })

  it("renders one breadcrumb immediately after the page heading", async () => {
    const { container } = renderBreadcrumb("/app/requests")
    const breadcrumb = await screen.findByRole("navigation", { name: "Fil d'Ariane" })
    expect(await screen.findAllByRole("navigation", { name: "Fil d'Ariane" })).toHaveLength(1)
    expect(container.querySelector("header")?.nextElementSibling).toContainElement(breadcrumb)
  })
})
