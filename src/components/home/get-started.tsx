import { forwardRef } from "react"
import { Link } from "react-router"
import { motion } from "framer-motion"
import { ArrowRight, Compass, ShieldCheck, Sparkles, Users } from "lucide-react"

import { Container } from "@/components/layout/container"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/auth-context"
import { SITE } from "@/lib/site"

export const GetStarted = forwardRef<HTMLDivElement>(function GetStarted(_props, ref) {
  const { user } = useAuth()
  const primaryPath = user ? (user.isAdmin ? "/admin" : "/app") : "/inscription"

  return (
    <section
      ref={ref}
      id="get-started"
      className="relative min-h-svh flex items-center justify-center py-24 overflow-hidden bg-background"
    >
      {/* Lueur d'ambiance en arrière-plan */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-primary/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <Container className="relative z-10 max-w-4xl mx-auto text-center">
        {/* En-tête avec badge animé */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary shadow-sm mb-6"
        >
          <Sparkles className="size-3.5" />
          Nouvelle ère citoyenne • {SITE.name}
        </motion.div>

        {/* Titre principal */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-tight"
        >
          Construisons l'avenir de <span className="text-primary">Terra Nova</span>
        </motion.h2>

        {/* Courte description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Découvrez une plateforme collaborative où l'intelligence collective façonne une cité
          durable, connectée et humaine. Participez aux décisions et rejoignez la communauté.
        </motion.p>

        {/* Boutons d'action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Button asChild size="lg" className="text-base font-semibold px-8 h-12 shadow-lg shadow-primary/25">
            <Link to={primaryPath}>
              {user ? "Accéder à mon tableau de bord" : "Get Started"}
              <ArrowRight className="ml-2 size-5" />
            </Link>
          </Button>

          {!user && (
            <Button asChild size="lg" variant="outline" className="text-base h-12 px-6">
              <Link to="/connexion">Se connecter</Link>
            </Button>
          )}
        </motion.div>

        {/* Caractéristiques rapides */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left"
        >
          <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 shadow-sm">
            <Compass className="size-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Navigation intuitive</h3>
            <p className="mt-1 text-sm text-muted-foreground">Accédez en temps réel aux services et indicateurs vitaux.</p>
          </div>
          <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 shadow-sm">
            <Users className="size-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Espace Citoyen</h3>
            <p className="mt-1 text-sm text-muted-foreground">Échangez, votez et proposez vos initiatives locales.</p>
          </div>
          <div className="rounded-2xl border bg-card/60 backdrop-blur-sm p-6 shadow-sm">
            <ShieldCheck className="size-6 text-primary mb-3" />
            <h3 className="font-semibold text-foreground">Sécurisé & Transparent</h3>
            <p className="mt-1 text-sm text-muted-foreground">Vos données protégées au cœur d'une gouvernance éthique.</p>
          </div>
        </motion.div>
      </Container>
    </section>
  )
})
