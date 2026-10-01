import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme, type Mode } from "@/components/theme-context"
import { Button } from "@/components/ui/button"
import { PRESETS, isPresetId } from "@/lib/presets"

const NEXT_MODE: Record<Mode, Mode> = { light: "dark", dark: "system", system: "light" }
const MODE_LABEL: Record<Mode, string> = {
  light: "Thème clair",
  dark: "Thème sombre",
  system: "Thème du système",
}

/** Bouton qui fait tourner clair -> sombre -> système. */
export function ModeToggle() {
  const { mode, setMode } = useTheme()
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMode(NEXT_MODE[mode])}
      aria-label={`${MODE_LABEL[mode]}. Cliquer pour changer.`}
      title={MODE_LABEL[mode]}
    >
      <Icon />
    </Button>
  )
}

/** Sélecteur de preset (outil d'équipe : à retirer de l'interface finale si inutile). */
export function PresetPicker() {
  const { preset, setPreset } = useTheme()

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Palette</span>
      <select
        value={preset}
        onChange={(event) => {
          const value = event.target.value
          if (isPresetId(value)) setPreset(value)
        }}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
      >
        {PRESETS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}
