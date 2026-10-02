import type { ComponentProps, CSSProperties } from "react"

import { cn } from "@/lib/utils"

export interface SliderProps extends Omit<ComponentProps<"input">, "type" | "value" | "defaultValue" | "onChange"> {
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
}

/** Curseur natif accessible, stylé avec les tokens du thème et utilisable sans JavaScript tiers. */
export function Slider({ value, defaultValue, min = 0, max = 100, step = 1, onValueChange, className, ...props }: SliderProps) {
  const numericValue = Number(value ?? defaultValue ?? min)
  const range = Number(max) - Number(min)
  const progress = range <= 0 ? 0 : ((numericValue - Number(min)) / range) * 100
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      defaultValue={defaultValue}
      onChange={(event) => onValueChange?.(Number(event.currentTarget.value))}
      className={cn("ui-slider", className)}
      style={{ "--slider-progress": `${progress}%` } as CSSProperties}
      {...props}
    />
  )
}
