import { Monitor, Moon, Sun } from "lucide-react"

import { useTheme, type Mode } from "@/components/theme-context"
import { Button } from "@/components/ui/button"
import { PRESETS, isPresetId } from "@/lib/presets"
import { isTypographyId, TYPOGRAPHIES } from "@/lib/typography-presets"
import { isMorphismId, MORPHISMS } from "@/lib/morphisms"
import { useLocale } from "@/lib/locale"

const NEXT_MODE: Record<Mode, Mode> = { light: "dark", dark: "system", system: "light" }
const MODE_LABEL: Record<Mode, string> = {
  light: "Thème clair",
  dark: "Thème sombre",
  system: "Thème du système",
}

/** Bouton qui fait tourner clair -> sombre -> système. */
export function ModeToggle() {
  const { mode, setMode } = useTheme()
  const { tx } = useLocale()
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor
  const label = tx(MODE_LABEL[mode], modeLabelEnglish[mode])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setMode(NEXT_MODE[mode])}
      aria-label={`${label}. ${tx("Cliquer pour changer.", "Click to change.")}`}
      title={label}
    >
      <Icon />
    </Button>
  )
}

const modeLabelEnglish: Record<Mode, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
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

/** Sélecteur de familles typographiques auto-hébergées. */
export function TypographyPicker() {
  const { typography, setTypography } = useTheme()

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Police</span>
      <select
        aria-label="Police d'écriture"
        value={typography}
        onChange={(event) => {
          const value = event.target.value
          if (isTypographyId(value)) setTypography(value)
        }}
        className="h-9 max-w-48 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
      >
        {TYPOGRAPHIES.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/** Sélecteur de style de surfaces appliqué à l'ensemble du site. */
export function MorphismPicker() {
  const { morphism, setMorphism } = useTheme()
  const current = MORPHISMS.find((item) => item.id === morphism) ?? MORPHISMS[0]

  return (
    <div className="grid gap-1.5">
      <label className="inline-flex items-center gap-2 text-sm">
        <span>Morphisme</span>
        <select
          aria-label="Style morphologique du site"
          value={morphism}
          onChange={(event) => {
            const value = event.target.value
            if (isMorphismId(value)) setMorphism(value)
          }}
          className="h-9 max-w-56 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
        >
          {MORPHISMS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <p className="text-xs text-muted-foreground">{current.description} · appliqué aux composants du site</p>
    </div>
  )
}
