import { LoaderCircle } from "lucide-react"

export function PageLoader({ label = "Chargement…" }: { label?: string }) {
  return (
    <output className="flex min-h-[40vh] items-center justify-center gap-3 text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </output>
  )
}
