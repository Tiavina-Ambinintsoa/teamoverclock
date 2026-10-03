import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  Hexagon,
  Leaf,
  Lock,
  Map as MapIcon,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Zap,
} from "lucide-react"
import { Link } from "react-router"


import { Button } from "@/components/ui/button"

export function RaisonSection() {
  const [activeSpaceTab, setActiveSpaceTab] = useState<"citoyen" | "agent" | "admin">("citoyen")

  const spacesData = {
    citoyen: {
      id: "citoyen",
      title: "Le Portail Citoyen",
      badge: "Citoyens de Terra Nova",
      summary: "Permettre aux habitants de s’informer, de signaler les incidents et de participer activement à la vie publique.",
      accentGradient: "from-cyan-500/20 via-sky-500/10 to-transparent",
      borderColor: "border-cyan-500/40",
      pillBg: "bg-cyan-950/80 text-cyan-300 border-cyan-500/40",
      primaryCta: { label: "Accéder au Portail Citoyen", to: "/app" },
      features: [
        {
          name: "Tableau de Bord Citoyen",
          desc: "Vue unifiée des démarches en cours, notifications prioritaires et métriques du secteur de résidence.",
          icon: Activity,
          to: "/app",
        },
        {
          name: "Catalogue des Services Municipaux",
          desc: "Consultation en temps réel des horaires, disponibilités et formulaires de démarche en ligne.",
          icon: Search,
          to: "/services",
        },
        {
          name: "Signalement d'Incidents Géolocalisé",
          desc: "Transmission immédiate des anomalies (infrastructures, énergie, réseaux) avec suivi de résolution.",
          icon: AlertTriangle,
          to: "/app/reports/new",
        },
        {
          name: "Carte Interactive des 10 Secteurs",
          desc: "Exploration des ruches hexagonales, transports autonomes et points d'intérêt municipaux.",
          icon: MapIcon,
          to: "/map",
        },
        {
          name: "Assistant Virtuel IA",
          desc: "Guide conversationnel accessible par écrit et à la voix pour orienter chaque habitant sans délai.",
          icon: Bot,
          to: "/app/assistant",
        },
      ],
      kpis: [
        { label: "Démarches 100% Dématérialisées", val: "24/7" },
        { label: "Délai moyen de prise en charge", val: "< 12 min" },
        { label: "Satisfaction citoyenne", val: "99.4%" },
      ],
    },
    agent: {
      id: "agent",
      title: "L'Espace des Agents Municipaux",
      badge: "Forces d'Intervention & Services",
      summary: "Donner aux équipes locales les moyens de traiter efficacement les demandes et de maintenir l’ordre dans une cité en pleine expansion.",
      accentGradient: "from-blue-500/20 via-indigo-500/10 to-transparent",
      borderColor: "border-blue-500/40",
      pillBg: "bg-blue-950/80 text-blue-300 border-blue-500/40",
      primaryCta: { label: "Console d'Intervention", to: "/agent" },
      features: [
        {
          name: "Centre de Dispatching & Interventions",
          desc: "Attribution intelligente des missions terrain selon la proximité sectorielle et l'urgence.",
          icon: Radio,
          to: "/agent",
        },
        {
          name: "Traitement Rapide des Demandes",
          desc: "Interface optimisée de validation des requêtes citoyennes avec respect strict des délais légaux.",
          icon: FileCheck2,
          to: "/agent/requests",
        },
        {
          name: "Supervision des Signalements",
          desc: "Suivi des réparations techniques, vérification des alertes capteurs et clôture avec compte-rendu.",
          icon: Shield,
          to: "/agent/reports",
        },
        {
          name: "Coordination d'Équipe & Sync",
          desc: "Télémétrie opérationnelle entre les brigades mobiles et le centre de commandement urbain.",
          icon: Users,
          to: "/agent/sync",
        },
      ],
      kpis: [
        { label: "Taux de résolution dans les délais", val: "98.7%" },
        { label: "Secteurs couverts en temps réel", val: "10 / 10" },
        { label: "Temps moyen d'intervention", val: "8 min" },
      ],
    },
    admin: {
      id: "admin",
      title: "La Console d'Administration",
      badge: "Gouvernance & Haute Supervision",
      summary: "Centraliser la gouvernance, valider les données issues des capteurs et garantir la transparence grâce à des journaux d’audit.",
      accentGradient: "from-purple-500/20 via-pink-500/10 to-transparent",
      borderColor: "border-purple-500/40",
      pillBg: "bg-purple-950/80 text-purple-300 border-purple-500/40",
      primaryCta: { label: "Supervision Gouvernance", to: "/admin" },
      features: [
        {
          name: "Supervision Globale de la Ruche",
          desc: "Indicateurs macroscopiques : flux d'énergie, circulation, santé des réseaux et démographie.",
          icon: Building2,
          to: "/admin",
        },
        {
          name: "Journaux d'Audit & Traçabilité Cryptographique",
          desc: "Registre inviolable de chaque décision publique garantissant une transparence totale et vérifiable.",
          icon: Lock,
          to: "/admin/audit",
        },
        {
          name: "Validation des Données Capteurs & IA",
          desc: "Gouvernance des alertes automatisées, réglage des seuils atmosphériques et modération intelligente.",
          icon: Cpu,
          to: "/admin/ai-content",
        },
        {
          name: "Éditeur Territorial des 10 Secteurs",
          desc: "Configuration cartographique des infrastructures modulaires, des zones protégées et des accès.",
          icon: Hexagon,
          to: "/admin/map",
        },
      ],
      kpis: [
        { label: "Intégrité des données d'audit", val: "100%" },
        { label: "Capteurs IoT interconnectés", val: "1.2M" },
        { label: "Transparence décisionnelle", val: "Totale" },
      ],
    },
  }

  const currentSpace = spacesData[activeSpaceTab]

  return (
    <div className="relative w-full bg-[#050811] text-white">
      {/* ──────────────────────────────────────────────────────────────
          SECTION 1 : RAISON & MISSIONS FONDATRICES
      ────────────────────────────────────────────────────────────── */}
      <section id="raison" className="relative w-full py-28 lg:py-36 overflow-hidden">
        {/* Halo et fond ambiant */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[850px] h-[450px] bg-cyan-600/10 blur-[150px] rounded-full" />
          <div className="absolute bottom-10 right-10 w-[500px] h-[300px] bg-indigo-600/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/30 backdrop-blur-md mb-4 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
            >
              <Zap className="size-3.5 text-cyan-400" />
              <span className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
                Genèse & Vision Fondatrice
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.8)]"
            >
              Pourquoi <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-sky-300 to-indigo-300">Nova Terra</span> ?
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-6 text-base sm:text-lg text-slate-300 font-light leading-relaxed"
            >
              Au départ, les colons utilisaient des systèmes fragmentés pour gérer les ressources, les communications et la sécurité.
              Mais face à la complexité croissante, les fondateurs décidèrent de créer une <strong className="text-cyan-300 font-semibold">plateforme unique</strong> : <span className="text-white font-semibold">Nova Terra</span>.
            </motion.p>
          </div>

          {/* Citation / Manifeste des fondateurs */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="mb-20 rounded-3xl p-8 sm:p-10 bg-linear-to-r from-cyan-950/40 via-slate-900/60 to-indigo-950/40 border border-cyan-500/30 backdrop-blur-xl relative overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.12)] text-center max-w-4xl mx-auto"
          >
            <div className="absolute top-0 right-0 -mr-16 -mt-16 size-48 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />
            <p className="font-mono text-xs text-cyan-300 tracking-[0.2em] uppercase mb-3">La Vision Fondatrice</p>
            <blockquote className="font-display text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-snug">
              « Leur vision était claire : Nova Terra devait devenir <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-300 via-sky-200 to-indigo-200 font-bold underline decoration-cyan-400/40 underline-offset-8">le laboratoire vivant d’une société idéale</span>. »
            </blockquote>
          </motion.div>

          {/* Les 3 Missions Fondatrices */}
          <div className="mb-24">
            <div className="text-center mb-10">
              <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
                Portés par une mission sans compromis
              </span>
              <h3 className="font-display text-2xl sm:text-3xl font-bold text-white mt-1">
                Trois Piliers d'Équilibre Planétaire
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              {/* Mission 1 */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="rounded-2xl p-7 bg-slate-900/60 backdrop-blur-xl border border-cyan-500/25 hover:border-cyan-400/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between"
              >
                <div>
                  <div className="size-12 rounded-xl bg-cyan-950/80 border border-cyan-400/40 grid place-items-center mb-5 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                    <Leaf className="size-6" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-white mb-3">
                    Créer une civilisation durable
                  </h4>
                  <p className="text-slate-300/90 text-sm leading-relaxed font-light">
                    Affranchie des crises écologiques et sociales qui avaient marqué la Terre, grâce à un cycle complet de recyclage et une autonomie énergétique intégrale.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-cyan-300">
                  <CheckCircle2 className="size-3.5 text-cyan-400" />
                  <span>Empreinte Zéro • Écosystème Préservé</span>
                </div>
              </motion.div>

              {/* Mission 2 */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="rounded-2xl p-7 bg-slate-900/60 backdrop-blur-xl border border-sky-500/25 hover:border-sky-400/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between"
              >
                <div>
                  <div className="size-12 rounded-xl bg-sky-950/80 border border-sky-400/40 grid place-items-center mb-5 text-sky-300 shadow-[0_0_15px_rgba(56,189,248,0.3)]">
                    <Users className="size-6" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-white mb-3">
                    Expérimenter un nouveau modèle de gouvernance
                  </h4>
                  <p className="text-slate-300/90 text-sm leading-relaxed font-light">
                    Où la technologie ne serait pas un outil de contrôle mais un vecteur de transparence et de participation citoyenne active et directe.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-sky-300">
                  <CheckCircle2 className="size-3.5 text-sky-400" />
                  <span>Démocratie Numérique Ouverte</span>
                </div>
              </motion.div>

              {/* Mission 3 */}
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="rounded-2xl p-7 bg-slate-900/60 backdrop-blur-xl border border-indigo-500/25 hover:border-indigo-400/60 transition-all duration-300 hover:-translate-y-1 shadow-[0_4px_25px_rgba(0,0,0,0.5)] flex flex-col justify-between"
              >
                <div>
                  <div className="size-12 rounded-xl bg-indigo-950/80 border border-indigo-400/40 grid place-items-center mb-5 text-indigo-300 shadow-[0_0_15px_rgba(129,140,248,0.3)]">
                    <Cpu className="size-6" />
                  </div>
                  <h4 className="font-display text-xl font-bold text-white mb-3">
                    Préserver l’équilibre nature & urbanisation
                  </h4>
                  <p className="text-slate-300/90 text-sm leading-relaxed font-light">
                    En intégrant l’intelligence artificielle dès la conception des infrastructures, afin d'optimiser en permanence les ressources sans dénaturer la faune et la flore locales.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs font-mono text-indigo-300">
                  <CheckCircle2 className="size-3.5 text-indigo-400" />
                  <span>Bio-Ingénierie & IA Prédictive</span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          SECTION 2 : LES 3 ESPACES INTERCONNECTÉS (MISE EN VALEUR DES ÉCRANS)
      ────────────────────────────────────────────────────────────── */}
      <section id="espaces" className="relative w-full py-24 lg:py-32 bg-[#080d1a] border-y border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
              Architecture & Écrans Connectés
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight mt-2 leading-tight">
              Une Plateforme, <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-indigo-300">Trois Espaces Dédiés</span>
            </h2>
            <p className="mt-4 text-slate-300 font-light text-base sm:text-lg">
              Chaque strate de la société de Terra Nova dispose d'outils sur mesure, directement connectés au système nerveux central.
            </p>

            {/* Onglets de sélection des 3 espaces */}
            <div className="mt-8 inline-flex p-1.5 rounded-2xl bg-slate-900/90 border border-white/10 backdrop-blur-lg">
              <button
                type="button"
                onClick={() => setActiveSpaceTab("citoyen")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSpaceTab === "citoyen"
                    ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.4)] font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                1. Portail Citoyen
              </button>
              <button
                type="button"
                onClick={() => setActiveSpaceTab("agent")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSpaceTab === "agent"
                    ? "bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                2. Agents Municipaux
              </button>
              <button
                type="button"
                onClick={() => setActiveSpaceTab("admin")}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
                  activeSpaceTab === "admin"
                    ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] font-semibold"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                3. Console d'Administration
              </button>
            </div>
          </div>

          {/* Contenu de l'espace sélectionné */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSpace.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.4 }}
              className={`rounded-3xl p-8 sm:p-10 lg:p-12 bg-linear-to-b ${currentSpace.accentGradient} bg-[#0b1222]/90 border ${currentSpace.borderColor} backdrop-blur-2xl shadow-[0_10px_50px_rgba(0,0,0,0.6)]`}
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
                {/* Colonne gauche : Description, métriques et CTA principal */}
                <div className="lg:col-span-5 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-mono font-medium border ${currentSpace.pillBg}`}>
                        {currentSpace.badge}
                      </span>
                    </div>

                    <h3 className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight">
                      {currentSpace.title}
                    </h3>

                    <p className="mt-4 text-slate-300 text-base sm:text-lg font-light leading-relaxed">
                      {currentSpace.summary}
                    </p>

                    {/* KPIs */}
                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {currentSpace.kpis.map((kpi) => (
                        <div key={kpi.label} className="p-3.5 rounded-xl bg-slate-900/60 border border-white/10">
                          <div className="font-mono text-xl font-bold text-cyan-300">{kpi.val}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-tight">{kpi.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
                    <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_25px_rgba(6,182,212,0.4)]">
                      <Link to={currentSpace.primaryCta.to} className="flex items-center gap-2">
                        {currentSpace.primaryCta.label}
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Colonne droite : Liste interactive des écrans et fonctionnalités avec liens directs */}
                <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {currentSpace.features.map((feature) => {
                    const FIcon = feature.icon
                    return (
                      <Link
                        key={feature.name}
                        to={feature.to}
                        className="group relative rounded-2xl p-5 bg-slate-900/80 border border-white/10 hover:border-cyan-400/50 transition-all duration-300 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)] flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-3">
                            <div className="size-10 rounded-xl bg-cyan-950/80 border border-cyan-500/30 grid place-items-center text-cyan-300 group-hover:scale-105 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                              <FIcon className="size-5" />
                            </div>
                            <span className="font-mono text-[10px] text-cyan-300/70 uppercase tracking-widest flex items-center gap-1 group-hover:text-cyan-300">
                              Ouvrir l'écran <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                            </span>
                          </div>
                          <h4 className="font-display text-base font-semibold text-white group-hover:text-cyan-300 transition-colors">
                            {feature.name}
                          </h4>
                          <p className="mt-2 text-xs text-slate-300/90 leading-relaxed font-light">
                            {feature.desc}
                          </p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          SECTION 3 : AU-DELÀ D'UNE APPLICATION (LES 3 DIMENSIONS)
      ────────────────────────────────────────────────────────────── */}
      <section className="relative w-full py-24 lg:py-32 overflow-hidden bg-[#070b14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
              Transformation Sociétale
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight mt-2 leading-tight">
              Bien Plus Qu'une Application
            </h2>
            <p className="mt-4 text-slate-300 font-light text-base sm:text-lg">
              Au fil des décennies, Nova Terra s'est métamorphosée en l'ossature vivante et permanente de toute la cité.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Rôle 1 : Système Nerveux Digital */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="rounded-2xl p-8 bg-linear-to-b from-cyan-950/40 to-slate-900/60 border border-cyan-500/30 hover:border-cyan-400 transition-all duration-300 relative group"
            >
              <div className="size-14 rounded-2xl bg-cyan-950 border border-cyan-400/40 grid place-items-center mb-6 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
                <Activity className="size-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Un système nerveux digital
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-light">
                Reliant chaque citoyen, chaque infrastructure et chaque décision en un maillage fluide, continu et instantané.
              </p>
            </motion.div>

            {/* Rôle 2 : Outil de Confiance */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="rounded-2xl p-8 bg-linear-to-b from-blue-950/40 to-slate-900/60 border border-blue-500/30 hover:border-blue-400 transition-all duration-300 relative group"
            >
              <div className="size-14 rounded-2xl bg-blue-950 border border-blue-400/40 grid place-items-center mb-6 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:scale-105 transition-transform">
                <ShieldCheck className="size-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Un outil de confiance
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-light">
                Qui assure la sécurité, la fluidité et la transparence dans une société en constante mutation et en pleine croissance.
              </p>
            </motion.div>

            {/* Rôle 3 : Mémoire Collective */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="rounded-2xl p-8 bg-linear-to-b from-purple-950/40 to-slate-900/60 border border-purple-500/30 hover:border-purple-400 transition-all duration-300 relative group"
            >
              <div className="size-14 rounded-2xl bg-purple-950 border border-purple-400/40 grid place-items-center mb-6 text-purple-400 shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:scale-105 transition-transform">
                <Brain className="size-7" />
              </div>
              <h3 className="font-display text-2xl font-bold text-white mb-3">
                Une mémoire collective
              </h3>
              <p className="text-slate-300 text-sm leading-relaxed font-light">
                Capable de préserver l’histoire de la colonie tout en anticipant ses besoins futurs grâce aux modèles prédictifs continus.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          SECTION 4 : LES AVANCEMENTS (6 PILIERS TECHNOLOGIQUES)
      ────────────────────────────────────────────────────────────── */}
      <section id="avancements" className="relative w-full py-28 lg:py-36 bg-[#050811] overflow-hidden border-t border-white/10">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-600/5 blur-[160px] rounded-full" />
          <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-600/5 blur-[160px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="font-mono text-xs tracking-[0.25em] text-cyan-300 uppercase font-semibold">
              Progrès Majeurs & Réalisations
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight mt-2 leading-tight">
              Les Avancements de <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-400 via-sky-300 to-indigo-300">Nova Terra</span>
            </h2>
            <p className="mt-4 text-slate-300 font-light text-base sm:text-lg">
              Six innovations systémiques qui ont permis à la cité de devenir un modèle d'harmonie urbaine et écologique.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Avancement 1 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-cyan-500/20 hover:border-cyan-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-cyan-950/80 border border-cyan-500/30 grid place-items-center mb-4 text-cyan-300">
                  <Database className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Centralisation numérique
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  Nova Terra est devenue le cœur digital de la cité, reliant citoyens, agents et administrateurs sur une seule infrastructure unifiée.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-cyan-300/80 flex items-center justify-between">
                <span>Cœur Digital Unifié</span>
                <Link to="/app" className="underline hover:text-cyan-200">Voir l'espace</Link>
              </div>
            </motion.div>

            {/* Avancement 2 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-sky-500/20 hover:border-sky-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-sky-950/80 border border-sky-500/30 grid place-items-center mb-4 text-sky-300">
                  <Hexagon className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Infrastructure intelligente
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  Les 10 secteurs hexagonaux sont interconnectés par des réseaux autonomes de transport, d'énergie et de télécommunication quantique.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-sky-300/80 flex items-center justify-between">
                <span>10 Secteurs Interconnectés</span>
                <Link to="/map" className="underline hover:text-sky-200">Carte interactive</Link>
              </div>
            </motion.div>

            {/* Avancement 3 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-blue-500/20 hover:border-blue-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(59,130,246,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-blue-950/80 border border-blue-500/30 grid place-items-center mb-4 text-blue-300">
                  <Users className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Participation citoyenne
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  Grâce au portail, les habitants peuvent signaler incidents, consulter les services et participer activement à la gouvernance de leur ruche.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-blue-300/80 flex items-center justify-between">
                <span>Démocratie Active</span>
                <Link to="/reports" className="underline hover:text-blue-200">Consulter les signalements</Link>
              </div>
            </motion.div>

            {/* Avancement 4 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-indigo-500/20 hover:border-indigo-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(99,102,241,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-indigo-950/80 border border-indigo-500/30 grid place-items-center mb-4 text-indigo-300">
                  <FileCheck2 className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Efficacité administrative
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  Les agents municipaux disposent d’outils avancés pour traiter rapidement les demandes et respecter scrupuleusement les délais légaux.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-indigo-300/80 flex items-center justify-between">
                <span>Délais & SLA Optimisés</span>
                <Link to="/agent" className="underline hover:text-indigo-200">Espace Agent</Link>
              </div>
            </motion.div>

            {/* Avancement 5 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-purple-500/20 hover:border-purple-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(168,85,247,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-purple-950/80 border border-purple-500/30 grid place-items-center mb-4 text-purple-300">
                  <Lock className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Transparence et sécurité
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  La console d’administration assure la traçabilité et la validation des données issues des capteurs et de l’IA via des registres d'audit infalsifiables.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-purple-300/80 flex items-center justify-between">
                <span>Registres Cryptographiques</span>
                <Link to="/admin/audit" className="underline hover:text-purple-200">Consulter l'audit</Link>
              </div>
            </motion.div>

            {/* Avancement 6 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-7 rounded-2xl bg-slate-900/60 border border-pink-500/20 hover:border-pink-400/50 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(236,72,153,0.15)] flex flex-col justify-between"
            >
              <div>
                <div className="size-11 rounded-xl bg-pink-950/80 border border-pink-500/30 grid place-items-center mb-4 text-pink-300">
                  <Cpu className="size-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-2">
                  Évolution durable
                </h3>
                <p className="text-slate-300 text-sm leading-relaxed font-light">
                  Intégration progressive de l’IA pour anticiper les besoins collectifs, réguler l'énergie solaire et optimiser les ressources de la colonie.
                </p>
              </div>
              <div className="mt-5 pt-3 border-t border-white/10 text-xs font-mono text-pink-300/80 flex items-center justify-between">
                <span>IA Écologique & Prédictive</span>
                <Link to="/app/assistant" className="underline hover:text-pink-200">Assistant IA</Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          SECTION 5 : ACCÈS DIRECT AUX MODULES CLÉS (CTA HUB)
      ────────────────────────────────────────────────────────────── */}
      <section className="relative w-full py-20 bg-linear-to-b from-[#050811] via-[#091124] to-[#050811] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-8 sm:p-12 bg-linear-to-r from-cyan-950/60 via-slate-900/90 to-indigo-950/60 border border-cyan-500/40 backdrop-blur-2xl shadow-[0_0_60px_rgba(6,182,212,0.2)] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/80 border border-cyan-400/40 text-cyan-300 text-xs font-mono uppercase tracking-widest mb-4">
                <Sparkles className="size-3.5 text-cyan-400" />
                Prêt à explorer Terra Nova ?
              </span>

              <h2 className="font-display text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Embarquez au cœur du nouveau monde
              </h2>

              <p className="mt-4 text-slate-300 font-light text-base sm:text-lg">
                Que vous soyez citoyen, visiteur ou agent de la colonie, accédez immédiatement à l'ensemble des services intelligents de Nova Terra.
              </p>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold shadow-[0_0_25px_rgba(6,182,212,0.5)]">
                  <Link to="/inscription">Rejoindre la Cité</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-cyan-400/40 text-cyan-200 hover:bg-cyan-950/80 hover:text-white">
                  <Link to="/map">
                    <MapIcon className="mr-2 size-4" />
                    Explorer la Carte des 10 Secteurs
                  </Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="text-slate-300 hover:text-white">
                  <Link to="/services">
                    <Search className="mr-2 size-4" />
                    Consulter les Services
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────────
          FOOTER SCI-FI NOVA TERRA
      ────────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#03060c] border-t border-white/10 py-12 text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Colonne 1 : Brand & Mission */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 font-display text-xl font-bold text-white mb-3">
                <span className="grid size-8 place-items-center rounded-lg bg-cyan-500 text-black shadow-sm">
                  <Sparkles className="size-4" />
                </span>
                <span>Nova Terra</span>
              </div>
              <p className="text-slate-400 text-xs sm:text-sm font-light max-w-md leading-relaxed">
                Plateforme centrale de gestion intelligente et participative des 10 secteurs hexagonaux de la planète Terra Nova.
              </p>
              <div className="mt-4 flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  10/10 Secteurs Opérationnels
                </span>
                <span className="text-xs font-mono text-slate-500">Cycle 2087-2126</span>
              </div>
            </div>

            {/* Colonne 2 : Navigation Landing */}
            <div>
              <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-3">Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li><a href="#historique" className="hover:text-cyan-300 transition-colors">Historique 2087</a></li>
                <li><a href="#raison" className="hover:text-cyan-300 transition-colors">Vision & Missions</a></li>
                <li><a href="#espaces" className="hover:text-cyan-300 transition-colors">Les 3 Espaces</a></li>
                <li><a href="#avancements" className="hover:text-cyan-300 transition-colors">Avancements</a></li>
              </ul>
            </div>

            {/* Colonne 3 : Écrans & Services */}
            <div>
              <h4 className="font-mono text-xs text-white uppercase tracking-wider mb-3">Écrans Connectés</h4>
              <ul className="space-y-2 text-xs">
                <li><Link to="/map" className="hover:text-cyan-300 transition-colors">Carte Hexagonale</Link></li>
                <li><Link to="/services" className="hover:text-cyan-300 transition-colors">Catalogue des Services</Link></li>
                <li><Link to="/dangers" className="hover:text-cyan-300 transition-colors">Protocoles d'Alerte</Link></li>
                <li><Link to="/app" className="hover:text-cyan-300 transition-colors">Espace Citoyen</Link></li>
                <li><Link to="/agent" className="hover:text-cyan-300 transition-colors">Espace Agent Municipal</Link></li>
                <li><Link to="/admin" className="hover:text-cyan-300 transition-colors">Console Administrateur</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p>© 2087-2126 Terra Nova Metropolitan Governance. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <Link to="/conditions" className="hover:text-cyan-300 transition-colors">Conditions</Link>
              <Link to="/confidentialite" className="hover:text-cyan-300 transition-colors">Confidentialité</Link>
              <Link to="/equipe" className="hover:text-cyan-300 transition-colors">Équipe Fondatrice</Link>
              <Link to="/guide" className="hover:text-cyan-300 transition-colors">Guide Urbain</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}