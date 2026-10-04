import { useNavigate } from "react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { RouteFocus } from "@/components/layout/root-layout"

function FirstPage() {
  const navigate = useNavigate()
  return (
    <main id="contenu" tabIndex={-1}>
      <button type="button" onClick={() => navigate("/destination")}>Open destination</button>
    </main>
  )
}

function DestinationPage() {
  return <main id="contenu" tabIndex={-1}><h1>Destination</h1></main>
}

describe("RouteFocus", () => {
  it("moves keyboard focus to the new page content after navigation", async () => {
    const { MemoryRouter, Route, Routes } = await import("react-router")
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={["/"]}>
        <RouteFocus />
        <Routes>
          <Route path="/" element={<FirstPage />} />
          <Route path="/destination" element={<DestinationPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.tab()
    expect(screen.getByRole("button", { name: "Open destination" })).toHaveFocus()
    await user.keyboard("{Enter}")
    await waitFor(() => expect(screen.getByRole("main")).toHaveFocus())
  })
})
