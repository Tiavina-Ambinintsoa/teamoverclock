import { Container } from "@/components/layout/container"
import { ThreeViewer } from "@/components/three/three-viewer"
import { TemplateNotice } from "@/pages/templates/template-notice"

/**
 * MODÈLE — Vitrine 3D interactive (three.js).
 * Le code three.js ne charge QUE quand on visite cette page (voir app/router.tsx : routes lazy),
 * donc il n'alourdit jamais les autres pages de l'application.
 * Pour changer la forme : éditez components/three/scene.ts (une seule fonction, sans React).
 * Pour afficher un vrai modèle (.glb) : ajoutez GLTFLoader dans ce même fichier.
 */
export function ThreeDPage() {
  return (
    <Container className="py-10">
      <title>Modèle : 3D</title>
      <TemplateNotice title="3D" usage="objet interactif (produit, mascotte, planète) — thèmes futuristes, spatiaux, produit" />

      <h1 className="text-3xl font-semibold sm:text-4xl">Vitrine 3D</h1>
      <p className="mt-2 max-w-prose text-muted-foreground">
        Glissez pour orienter l'objet, molette pour zoomer. Les couleurs suivent le thème actif — essayez de changer
        de palette dans <code className="rounded bg-muted px-1 py-0.5">/kit</code> pendant que cette page est ouverte.
      </p>

      <div className="mt-8 max-w-2xl">
        <ThreeViewer label="Solide 3D représentant le produit" />
      </div>

      <div className="mt-10 grid gap-6 text-sm text-muted-foreground sm:grid-cols-3">
        <div>
          <p className="font-medium text-foreground">Léger par défaut</p>
          <p className="mt-1">Une forme procédurale : aucun modèle à télécharger, aucun poids ajouté au dépôt.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Accessible</p>
          <p className="mt-1">Repli automatique et message clair si WebGL n'est pas disponible sur l'appareil.</p>
        </div>
        <div>
          <p className="font-medium text-foreground">Sobre</p>
          <p className="mt-1">Respecte « réduire les animations » du système : l'auto-rotation s'arrête, le glissé reste actif.</p>
        </div>
      </div>
    </Container>
  )
}
