import { useEffect, useMemo, useState } from "react"
import { Search, Volume2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { useAccessibility } from "@/features/accessibility/accessibility-context"
import { filterSpeechVoices, isSynthesisSupported, speak } from "@/features/voice/speech"
import {
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  TTS_RATE_MAX,
  TTS_RATE_MIN,
  UI_THEMES,
  isUiTheme,
  presetForNeed,
  type A11yNeed,
  type A11yPrefs,
  type UiTheme,
} from "@/lib/a11y-prefs"
import { useLocale } from "@/lib/locale"
import { cn } from "@/lib/utils"

const THEME_LABELS: Record<UiTheme, { fr: string; en: string }> = {
  default: { fr: "Thème du site", en: "Site theme" },
  high_contrast_light: { fr: "Contraste élevé — clair", en: "High contrast — light" },
  high_contrast_dark: { fr: "Contraste élevé — sombre", en: "High contrast — dark" },
  yellow_on_black: { fr: "Jaune sur noir", en: "Yellow on black" },
}

const VOICE_TOGGLES: { key: keyof Pick<A11yPrefs, "voiceNavigation" | "voiceGuide" | "captions" | "visualAlerts">; fr: string; en: string }[] = [
  { key: "voiceNavigation", fr: "Je réponds et je navigue à la voix", en: "I answer and navigate by voice" },
  { key: "voiceGuide", fr: "Guide vocal : annonce la page et les commandes", en: "Voice guide: announces the page and the commands" },
  { key: "captions", fr: "Sous-titres de tout ce qui est dit", en: "Captions for everything that is spoken" },
  { key: "visualAlerts", fr: "Alertes visuelles plutôt que sonores", en: "Visual alerts instead of sound" },
]

/** Réglages d'accessibilité : profils (« mal voyant », « mal entendant »), thème contrasté, taille du texte, assistance vocale. */
export function AccessibilityPanel() {
  const { prefs, update, reset } = useAccessibility()
  const { tx, locale } = useLocale()
  const lang = locale === "en" ? "en-GB" : "fr-FR"
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [voiceSearch, setVoiceSearch] = useState("")
  const filteredVoices = useMemo(() => filterSpeechVoices(voices, voiceSearch), [voices, voiceSearch])
  const displayedVoices = useMemo(() => {
    const selectedVoice = voices.find((voice) => voice.voiceURI === prefs.speechVoiceURI)
    return selectedVoice && !filteredVoices.includes(selectedVoice)
      ? [selectedVoice, ...filteredVoices]
      : filteredVoices
  }, [filteredVoices, prefs.speechVoiceURI, voices])
  const displayNames = useMemo(() => new Intl.DisplayNames([locale], { type: "language" }), [locale])

  useEffect(() => {
    if (!isSynthesisSupported()) return
    const synthesis = window.speechSynthesis
    const refreshVoices = () => setVoices(synthesis.getVoices())
    refreshVoices()
    synthesis.addEventListener("voiceschanged", refreshVoices)
    return () => synthesis.removeEventListener("voiceschanged", refreshVoices)
  }, [])

  const toggleNeed = (need: A11yNeed, on: boolean) => {
    const needs = on ? Array.from(new Set([...prefs.needs, need])) : prefs.needs.filter((n) => n !== need)
    update({ needs, ...(on ? presetForNeed(need, prefs) : {}) })
  }

  return (
    <section aria-labelledby="a11y-title" data-tour="accessibility-menu" className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 id="a11y-title" className="text-xl font-semibold">{tx("Accessibilité", "Accessibility")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {tx("Vos choix s'appliquent immédiatement. Connecté, ils vous suivent sur tous vos appareils.", "Your choices apply immediately. When signed in, they follow you across devices.")}
      </p>

      <fieldset className="mt-5 grid gap-2">
        <legend className="mb-1 text-sm font-medium">{tx("Mon profil", "My profile")}</legend>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={prefs.needs.includes("low_vision")} onChange={(e) => toggleNeed("low_vision", e.target.checked)} />
          <span><strong>{tx("Mal voyant", "Visually impaired")}</strong> — {tx("thème à fort contraste et texte agrandi", "high-contrast theme and larger text")}</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-0.5 size-4 accent-primary" checked={prefs.needs.includes("hard_of_hearing")} onChange={(e) => toggleNeed("hard_of_hearing", e.target.checked)} />
          <span><strong>{tx("Mal entendant", "Hard of hearing")}</strong> — {tx("sous-titres et alertes visuelles plutôt que des signaux sonores", "captions and visual alerts instead of audio cues")}</span></label>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="mb-2 text-sm font-medium">{tx("Thème", "Theme")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {UI_THEMES.map((theme) => (
            <label key={theme} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm", prefs.theme === theme && "border-primary ring-2 ring-ring")}>
              <input type="radio" name="a11y-theme" value={theme} checked={prefs.theme === theme}
                onChange={(event) => { const value = event.currentTarget.value; if (isUiTheme(value)) update({ theme: value }) }} />
              {THEME_LABELS[theme][locale]}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-2">
        <Label htmlFor="a11y-font-scale">{tx("Taille du texte", "Text size")} : {Math.round(prefs.fontScale * 100)} %</Label>
        <Slider id="a11y-font-scale" min={FONT_SCALE_MIN} max={FONT_SCALE_MAX} step={0.05} value={prefs.fontScale} onValueChange={(fontScale) => update({ fontScale })} aria-valuetext={`${Math.round(prefs.fontScale * 100)} %`} />
      </div>
      <div className="mt-5 grid gap-2">
        <Label htmlFor="a11y-line-spacing">{tx("Interligne", "Line spacing")} : ×{prefs.lineSpacing.toFixed(2)}</Label>
        <Slider id="a11y-line-spacing" min={1} max={2} step={0.05} value={prefs.lineSpacing} onValueChange={(lineSpacing) => update({ lineSpacing })} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <Label htmlFor="a11y-reduce-motion">{tx("Réduire les animations", "Reduce motion")}</Label>
        <Switch id="a11y-reduce-motion" checked={prefs.reduceMotion} onCheckedChange={(reduceMotion) => update({ reduceMotion })} />
      </div>

      <h3 className="mt-7 text-base font-semibold">{tx("Assistance vocale", "Voice assistance")}</h3>
      <div className="mt-3 flex items-center justify-between gap-4">
        <Label htmlFor="a11y-readScreenAloud">{tx("Lecture automatique de chaque page", "Read each page aloud automatically")}</Label>
        <Switch id="a11y-readScreenAloud" checked={prefs.readScreenAloud} onCheckedChange={(readScreenAloud) => update({ readScreenAloud })} />
      </div>
      <ul className="mt-3 grid gap-3">
        {VOICE_TOGGLES.map((toggle) => (
          <li key={toggle.key} className="flex items-center justify-between gap-4">
            <Label htmlFor={`a11y-${toggle.key}`}>{toggle[locale]}</Label>
            <Switch id={`a11y-${toggle.key}`} checked={prefs[toggle.key]} onCheckedChange={(value) => update({ [toggle.key]: value })} />
          </li>
        ))}
      </ul>
      <div className="mt-4 grid gap-2">
        <Label htmlFor="a11y-tts-rate">{tx("Vitesse de la voix", "Voice speed")} : ×{prefs.ttsRate.toFixed(2)}</Label>
        <Slider id="a11y-tts-rate" min={TTS_RATE_MIN} max={TTS_RATE_MAX} step={0.05} value={prefs.ttsRate} onValueChange={(ttsRate) => update({ ttsRate })} />
      </div>
      <div className="mt-4 grid max-w-xs gap-2">
        <Label htmlFor="a11y-lang">{tx("Langue de la voix", "Voice language")}</Label>
        <Select id="a11y-lang" value={prefs.speechLang} onChange={(e) => update({ speechLang: e.target.value })}>
          <option value="fr-FR">Français</option>
          <option value="en-GB">English (UK)</option>
          <option value="en-US">English (US)</option>
        </Select>
      </div>
      <div className="mt-4 grid max-w-xl gap-2">
        <Label htmlFor="a11y-voice-search">{tx("Rechercher une voix", "Search voices")}</Label>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="a11y-voice-search"
            className="pl-9"
            type="search"
            value={voiceSearch}
            onChange={(event) => setVoiceSearch(event.target.value)}
            placeholder={tx("Nom ou langue…", "Name or language…")}
          />
        </div>
        <Label htmlFor="a11y-voice">{tx("Voix de synthèse", "Speech voice")}</Label>
        <Select id="a11y-voice" value={prefs.speechVoiceURI} onChange={(event) => update({ speechVoiceURI: event.target.value })}>
          <option value="">{tx("Automatique selon la langue", "Automatic for selected language")}</option>
          {displayedVoices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voice.name} — {displayNames.of(voice.lang) ?? voice.lang} ({voice.lang})
            </option>
          ))}
        </Select>
        {voices.length === 0
          ? <p className="text-xs text-muted-foreground">{tx("Aucune voix de synthèse n'est disponible dans ce navigateur.", "No speech voices are available in this browser.")}</p>
          : filteredVoices.length === 0
            ? <p className="text-xs text-muted-foreground">{tx("Aucune voix ne correspond à cette recherche.", "No voices match this search.")}</p>
            : <p className="text-xs text-muted-foreground">{tx(`${filteredVoices.length} voix disponibles sur cet appareil.`, `${filteredVoices.length} voices available on this device.`)}</p>}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">{tx("Le micro ne s'active que lorsque vous cliquez sur le bouton « Parler ». Aucun enregistrement audio n'est conservé.", "The microphone only turns on when you click the “Talk” button. No audio recording is kept.")}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" variant="outline" onClick={() => speak(tx("Ceci est un test de la voix de l'assistant.", "This is a test of the assistant's voice."), { lang, rate: prefs.ttsRate, voiceURI: prefs.speechVoiceURI })}>
          <Volume2 aria-hidden />{tx("Tester la voix", "Test the voice")}
        </Button>
        <Button type="button" variant="outline" onClick={reset}>{tx("Rétablir les réglages par défaut", "Restore defaults")}</Button>
      </div>
    </section>
  )
}
