import { motion } from "framer-motion"
import { ArrowRight, Compass, Cpu, Hexagon, Layers, Sparkles } from "lucide-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"

interface HistoriqueSectionProps {
  backgroundImage?: string
}

export function HistoriqueSection({
  backgroundImage = `${import.meta.env.BASE_URL}historique-bg.jpg`,
}: HistoriqueSectionProps) {
  const steps = [
    {
      era: "2087",
      title: "La Découverte Cosmique",
      description:
        "En 2087, les scientifiques découvrent une nouvelle planète habitable aux confins du système solaire. Baptisée Terra Nova, elle devient rapidement le symbole d’un nouveau départ pour l’humanité.",
      tag: "Point Zéro • Exploration",
      icon: Compass,
      accent: "from-cyan-500/20 to-blue-500/5",
      borderGlow: "border-cyan-500/30 hover:border-cyan-400/60",
      pillBg: "bg-cyan-950/80 text-cyan-300 border-cyan-500/30",
    },
    {
      era: "Pionniers",
      title: "Les Premières Fondations",
      description:
        "Quelques années plus tard, les premières expéditions atteignent la planète et installent les premières bases de colonisation. Dans un environnement encore vierge, les pionniers commencent à construire les premières infrastructures : habitats, centres énergétiques, réseaux de transport et systèmes de communication.",
      tag: "Infrastructures Vitales",
      icon: Layers,
      accent: "from-blue-500/20 to-indigo-500/5",
      borderGlow: "border-blue-500/30 hover:border-blue-400/60",
      pillBg: "bg-blue-950/80 text-blue-300 border-blue-500/30",
    },
    {
      era: "La Cité",
      title: "Les 10 Secteurs Hexagonaux",
      description:
        "La première cité de Terra Nova voit alors le jour. Pensée dès sa conception comme une ville intelligente, elle est organisée en 10 secteurs hexagonaux, reliés par un vaste réseau urbain.",
      tag: "Ruche Urbaine Connectée",
      icon: Hexagon,
      accent: "from-indigo-500/20 to-purple-500/5",
      borderGlow: "border-indigo-500/30 hover:border-indigo-400/60",
      pillBg: "bg-indigo-950/80 text-indigo-300 border-indigo-500/30",
      cta: {
        label: "Voir les 10 secteurs sur la carte",
        to: "/map",
      },
    },
    {
      era: "Nouvelle Ère",
      title: "Autonomie & Intelligence Artificielle",
      description:
        "Au fil des années, la colonie grandit. Les infrastructures deviennent autonomes, les services se numérisent et l'intelligence artificielle s'intègre progressivement à la vie des habitants. Terra Nova devient alors bien plus qu'une planète d'accueil : elle devient un nouveau monde.",
      tag: "Système Symbiotique",
      icon: Cpu,
      accent: "from-purple-500/20 to-cyan-500/5",
      borderGlow: "border-purple-500/30 hover:border-purple-400/60",
      pillBg: "bg-purple-950/80 text-purple-300 border-purple-500/30",
      cta: {
        label: "Découvrir l'Assistant IA",
        to: "/app/assistant",
      },
    },
  ]

  return (
    <section id="historique" className="relative w-full overflow-hidden bg-[#070b14] text-white py-28 lg:py-36">
      {/* Image d'arrière-plan avec dégradés sci-fi sombres */}
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <img
          src={backgroundImage}
          alt="Atmosphère de Terra Nova"
          className="size-full object-cover object-center opacity-30 mix-blend-luminosity scale-105"
        />
        {/* Voiles de transition douce vers le haut (CloudCity) et le bas */}
        <div className="absolute inset-0 bg-linear-to-b from-[#c8d8e8]/30 via-[#070b14]/90 to-[#070b14]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
      </div>

      {/* Halo lumineux d'ambiance */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-175 h-87.5 bg-cyan-500/10 blur-[130px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Entête de section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
          >
            <Sparkles className="size-3.5 text-cyan-400" />
            <span className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
              Historique • Chronologie du nouveau monde
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
          >
            L'Épopée de <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-sky-300 to-indigo-300">Terra Nova</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-5 text-base sm:text-lg text-slate-300 font-light leading-relaxed"
          >
            D'une planète inexplorée aux confins du système stellaire à l'avènement d'une mégapole connectée par une intelligence collective.
          </motion.p>
        </div>

        {/* Chronologie sous forme de grille immersive avec repères temporels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 relative md:auto-rows-fr">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12 }}
                className={`group relative rounded-2xl p-7 sm:p-8 bg-linear-to-br ${step.accent} bg-[#0c1220]/80 backdrop-blur-xl border ${step.borderGlow} transition-all duration-300 hover:shadow-[0_0_35px_rgba(6,182,212,0.18)] hover:-translate-y-1 flex flex-col justify-between`}
              >
                {/* Ligne lumineuse en haut de carte */}
                <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-cyan-400/40 to-transparent group-hover:via-cyan-400 transition-all duration-500" />

                <div>
                  {/* Badge Époque & Numérotation */}
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium border ${step.pillBg}`}>
                      <Icon className="size-3.5" />
                      {step.tag}
                    </span>
                    <span className="font-mono text-xs text-slate-400 tracking-wider">
                      PHASE 0{idx + 1}
                    </span>
                  </div>

                  {/* Titre de l'étape */}
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-mono text-2xl font-bold text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                      {step.era}
                    </span>
                    <h3 className="font-display text-xl sm:text-2xl font-semibold text-white tracking-tight">
                      {step.title}
                    </h3>
                  </div>

                  {/* Description historique verbatim */}
                  <p className="text-slate-300/90 text-sm sm:text-base leading-relaxed font-light">
                    {step.description}
                  </p>
                </div>

                {/* Lien interactif vers l'écran associé (si applicable) */}
                {step.cta && (
                  <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-mono text-cyan-300/80">Accès direct au système :</span>
                    <Button asChild size="sm" variant="outline" className="border-cyan-500/40 bg-cyan-950/40 text-cyan-200 hover:bg-cyan-500 hover:text-black transition-all">
                      <Link to={step.cta.to} className="flex items-center gap-1.5">
                        {step.cta.label}
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Télémétrie & indicateurs clés de Terra Nova */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-16 rounded-2xl border border-cyan-500/20 bg-linear-to-r from-cyan-950/40 via-slate-900/60 to-cyan-950/40 backdrop-blur-xl p-6 sm:p-8"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-white/10">
            <div className="pt-4 md:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-cyan-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.4)]">
                2087
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">Découverte & Fondation</p>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-sky-400 drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]">
                10
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">Secteurs Hexagonaux</p>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-indigo-400 drop-shadow-[0_0_15px_rgba(129,140,248,0.4)]">
                100%
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">Infrastructures Autonomes</p>
            </div>
            <div className="pt-4 md:pt-0">
              <div className="font-mono text-3xl sm:text-4xl font-extrabold text-purple-400 drop-shadow-[0_0_15px_rgba(192,132,252,0.4)]">
                Nova Terra
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-300 font-medium">Système Nerveux Digital</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}