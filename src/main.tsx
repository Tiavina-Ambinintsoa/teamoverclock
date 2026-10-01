import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router/dom"

// Polices auto-hébergées (aucune requête vers un CDN : plus rapide, plus sobre, fonctionne hors ligne).
// Fraunces n'est utilisée que par le preset "encre" : retirez cet import si vous ne l'utilisez pas.
import "@fontsource-variable/bricolage-grotesque"
import "@fontsource-variable/fraunces"
import "@fontsource-variable/instrument-sans"
import "@/index.css"

import { Providers } from "@/app/providers"
import { router } from "@/app/router"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  </StrictMode>
)
