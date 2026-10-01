import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** Largeur de contenu standard : à réutiliser pour toutes les sections. */
export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)} {...props} />
}
