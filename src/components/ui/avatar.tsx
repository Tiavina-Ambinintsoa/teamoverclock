import { useState, type ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends ComponentProps<"span"> {
  src?: string | null
  alt?: string
  fallback: string
}

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
  return (
    <span className={cn("relative inline-grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary", className)} {...props}>
      {src ? <AvatarImage key={src} src={src} alt={alt || fallback} fallback={fallback} /> : <span>{fallback}</span>}
    </span>
  )
}

function AvatarImage({ src, alt, fallback }: { src: string; alt: string; fallback: string }) {
  const [failed, setFailed] = useState(false)
  return failed
    ? <span>{fallback}</span>
    : <img src={src} alt={alt} className="size-full object-cover" onError={() => setFailed(true)} />
}
