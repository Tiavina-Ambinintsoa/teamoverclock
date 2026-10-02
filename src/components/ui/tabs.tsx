import { createContext, useContext, useState, type ComponentProps, type ReactNode } from "react"
import { cn } from "@/lib/utils"

interface TabsState { value: string; setValue: (value: string) => void }
const TabsContext = createContext<TabsState | null>(null)

export function Tabs({ value, defaultValue = "", onValueChange, className, children, ...props }: ComponentProps<"div"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children: ReactNode
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const current = value ?? internalValue
  const setValue = (next: string) => {
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }
  return (
    <TabsContext.Provider value={{ value: current, setValue }}>
      <div className={className} {...props}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, ...props }: ComponentProps<"div">) {
  return <div role="tablist" className={cn("inline-flex items-center gap-1 rounded-xl border bg-muted/60 p-1", className)} {...props} />
}

export function TabsTrigger({ value, className, onClick, onKeyDown, ...props }: ComponentProps<"button"> & { value: string }) {
  const tabs = useContext(TabsContext)
  if (!tabs) throw new Error("TabsTrigger doit être utilisé dans <Tabs>")
  const selected = tabs.value === value
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      className={cn("rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm", className)}
      onClick={(event) => { onClick?.(event); tabs.setValue(value) }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return
        const triggers = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [])
        const currentIndex = triggers.indexOf(event.currentTarget)
        const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? triggers.length - 1 : (currentIndex + (event.key === "ArrowRight" ? 1 : -1) + triggers.length) % triggers.length
        event.preventDefault()
        triggers[nextIndex]?.focus()
        triggers[nextIndex]?.click()
      }}
      {...props}
    />
  )
}

export function TabsContent({ value, className, ...props }: ComponentProps<"div"> & { value: string }) {
  const tabs = useContext(TabsContext)
  if (!tabs) throw new Error("TabsContent doit être utilisé dans <Tabs>")
  return tabs.value === value ? <div role="tabpanel" tabIndex={0} className={cn("mt-4 focus-visible:outline-none", className)} {...props} /> : null
}
