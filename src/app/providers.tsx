import type { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AccessibilityProvider } from "@/features/accessibility/accessibility-provider"
import { ThemeChoiceDialog } from "@/features/accessibility/theme-choice-dialog"
import { AuthProvider } from "@/features/auth/auth-provider"
import { LocaleProvider } from "@/lib/locale"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AccessibilityProvider>
              <TooltipProvider>
                {children}
                <ThemeChoiceDialog />
                <Toaster position="bottom-right" closeButton />
              </TooltipProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </QueryClientProvider>
      </LocaleProvider>
    </ThemeProvider>
  )
}
