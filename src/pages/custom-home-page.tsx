import { CloudCity } from "@/components/home/cloud-city"
import { GetStarted } from "@/components/home/get-started"
import { Navbar } from "@/components/home/navbar"
import { SITE } from "@/lib/site"

/**
 * Page d'accueil complète.
 *
 * STRATÉGIE DE JONCTION (GetStarted → CloudCity) :
 *   Deux couches de nuage se font face autour du seuil des 100vh :
 *   - La couche "haute" (dans GetStarted) couvre le bas de la section avec
 *     un nuage orienté vers le bas, ancré au bas de la section.
 *   - La couche "basse" (dans CustomHomePage) démarre au seuil 100vh et
 *     couvre le début de CloudCity.
 *   Les deux se fondent via maskImage pour éviter toute ligne visible.
 *   Le `bg-black` de la page wrap les deux sections afin qu'aucun fond
 *   contrasté ne soit visible à travers les zones transparentes du PNG.
 */
export function CustomHomePage() {
  return (
    <div className="relative w-full bg-[#c8d8e8]">
      <title>{SITE.name} - Terra Nova</title>
      <meta name="description" content={SITE.description} />

      <Navbar />
      <GetStarted />
      <CloudCity />
    </div>
  )
}