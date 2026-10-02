import { useState, type ChangeEvent } from "react"
import { FileUp } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { supabase } from "@/lib/supabase"

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]

export function StorageUploader() {
  const { user, backend } = useAuth()
  const [busy, setBusy] = useState(false)
  const [uploaded, setUploaded] = useState<{ name: string; url: string } | null>(null)

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ""
    if (!file) return
    if (!supabase || backend !== "supabase" || !user || user.isDemo) {
      toast.error("Configurez Supabase pour utiliser le stockage de fichiers.")
      return
    }
    if (!ACCEPTED_TYPES.includes(file.type)) return toast.error("Format accepté : JPG, PNG, WebP ou PDF.")
    if (file.size > MAX_BYTES) return toast.error("La taille maximale est de 5 Mo.")

    setBusy(true)
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-100) || "fichier"
    const path = `${user.id}/${crypto.randomUUID()}-${safeName}`
    try {
      const { error } = await supabase.storage.from("uploads").upload(path, file, {
        cacheControl: "3600", contentType: file.type, upsert: false,
      })
      if (error) throw error
      const { data, error: urlError } = await supabase.storage.from("uploads").createSignedUrl(path, 60 * 60)
      if (urlError) throw urlError
      setUploaded({ name: file.name, url: data.signedUrl })
      toast.success("Fichier envoyé. Le lien privé expire dans une heure.")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'envoi du fichier.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border bg-card p-5 sm:p-7">
      <h2 className="font-semibold">Fichiers privés</h2>
      <p className="mt-1 text-sm text-muted-foreground">Images JPG/PNG/WebP ou PDF, 5 Mo maximum. Chaque fichier reste dans votre dossier privé Supabase.</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" asChild disabled={busy}>
          <label className="cursor-pointer"><FileUp aria-hidden />{busy ? "Envoi…" : "Choisir un fichier"}<input className="sr-only" type="file" accept={ACCEPTED_TYPES.join(",")} onChange={upload} disabled={busy} /></label>
        </Button>
        {uploaded && <a className="text-sm font-medium text-primary underline underline-offset-4" href={uploaded.url} target="_blank" rel="noreferrer">Ouvrir {uploaded.name}</a>}
      </div>
      {backend !== "supabase" && <p className="mt-3 text-xs text-muted-foreground">Le stockage est désactivé en mode démo local.</p>}
    </section>
  )
}
