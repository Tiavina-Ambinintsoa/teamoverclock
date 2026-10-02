import { ArrowLeft, RotateCcw, TriangleAlert } from "lucide-react"
import { isRouteErrorResponse, Link, useRouteError } from "react-router"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"

/** Écran de secours de React Router pour une route ou une page qui échoue. */
export function RouteError() {
  const error = useRouteError()
  const { t } = useLocale()
  const notFound = isRouteErrorResponse(error) && error.status === 404

  return (
    <Container className="grid min-h-[70svh] place-items-center py-16">
      <title>{notFound ? t("error.notFoundTitle") : t("error.pageTitle")}</title>
      <section role="alert" className="w-full max-w-xl rounded-3xl border bg-card p-7 text-center shadow-lg sm:p-10">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold sm:text-4xl">
          {notFound ? t("error.notFoundTitle") : t("error.pageTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-prose text-muted-foreground">
          {notFound ? t("error.notFoundDescription") : t("error.pageDescription")}
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.location.reload()}>
            <RotateCcw aria-hidden />{t("error.tryAgain")}
          </Button>
          <Button asChild variant="outline">
            <Link to="/"><ArrowLeft aria-hidden />{t("error.backHome")}</Link>
          </Button>
        </div>
        {isRouteErrorResponse(error) && error.status >= 500 && (
          <p className="mt-6 text-xs text-muted-foreground">{t("error.serverHint")}</p>
        )}
      </section>
    </Container>
  )
}
