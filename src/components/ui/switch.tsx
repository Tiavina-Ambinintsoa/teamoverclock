import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<ComponentProps<"button">, "type" | "onChange"> {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}

export function Switch({ checked, onCheckedChange, className, disabled, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn("ui-switch", checked && "ui-switch-checked", className)}
      {...props}
    >
      <span className="ui-switch-thumb" />
    </button>
  )
}
