/**
 * Réglages du fond de la page d'accueil.
 * Changez les couleurs, tailles, positions et intensités ici pour adapter l'ambiance.
 * Les couleurs peuvent utiliser les tokens du thème, par exemple `var(--primary)`.
 */
export const HOME_BACKGROUND_CONFIG = {
  enabled: true,
  pointer: {
    enabled: true,
    /** Déplacement maximal du halo principal, en pixels. */
    intensity: 28,
  },
  scroll: {
    enabled: true,
    /** Déplacement du fond par rapport au scroll : 0.12 = 12 % du scroll. */
    intensity: 0.12,
    /** Limite le déplacement pour éviter que les halos ne quittent l'écran. */
    maxOffset: 110,
  },
  layers: [
    {
      color: "var(--primary)",
      size: "58vmax",
      top: "-18%",
      left: "-18%",
      opacity: 0.28,
      pointerDepth: 1,
      scrollDepth: 1,
    },
    {
      color: "var(--highlight)",
      size: "48vmax",
      top: "30%",
      left: "66%",
      opacity: 0.2,
      pointerDepth: -0.7,
      scrollDepth: -0.65,
    },
    {
      color: "var(--primary)",
      size: "36vmax",
      top: "76%",
      left: "20%",
      opacity: 0.12,
      pointerDepth: 0.45,
      scrollDepth: 0.35,
    },
  ],
} as const
