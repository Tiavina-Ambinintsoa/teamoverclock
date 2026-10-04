import { Accessibility, Map, MessageSquareText, ShieldCheck } from "lucide-react"
import { Link } from "react-router"

import { Container } from "@/components/layout/container"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/lib/locale"

const FAQ_GROUPS = [
  {
    id: "city",
    icon: Map,
    title: ["Découvrir la ville", "Explore the city"],
    questions: [
      {
        question: ["Que puis-je faire sur le portail Nova Terra ?", "What can I do on the Nova Terra portal?"],
        answer: [
          "Consultez les services municipaux, les actualités, les projets de la ville, la carte interactive et les alertes publiques. En créant un compte, vous pouvez aussi envoyer des demandes et suivre vos démarches.",
          "Browse municipal services, news, city projects, the interactive map and public alerts. With an account, you can also send requests and follow their progress.",
        ],
      },
      {
        question: ["Comment trouver un service et ses informations pratiques ?", "How do I find a service and its practical information?"],
        answer: [
          "Ouvrez la page Services pour rechercher un service et consulter, lorsqu'elles sont publiées, ses coordonnées, ses horaires, les documents requis et les étapes à suivre.",
          "Open the Services page to search for a service and view its published contact details, opening hours, required documents and steps.",
        ],
        link: ["/services", "Voir les services", "Browse services"],
      },
      {
        question: ["À quoi sert la carte interactive ?", "What is the interactive map for?"],
        answer: [
          "La carte présente les secteurs, les bâtiments et les transports. Sélectionnez un élément pour afficher ses détails, ou choisissez un départ et une destination pour calculer un itinéraire.",
          "The map shows sectors, buildings and transport. Select an item to see its details, or choose a starting point and destination to calculate a route.",
        ],
        link: ["/map", "Ouvrir la carte", "Open the map"],
      },
    ],
  },
  {
    id: "requests",
    icon: MessageSquareText,
    title: ["Demandes et signalements", "Requests and reports"],
    questions: [
      {
        question: ["Faut-il un compte pour envoyer une demande ?", "Do I need an account to send a request?"],
        answer: [
          "Oui. Connectez-vous ou créez un compte habitant pour envoyer une demande. Vous recevrez un numéro de suivi et des notifications sur son évolution.",
          "Yes. Sign in or create a resident account to send a request. You will receive a tracking number and updates as it progresses.",
        ],
        link: ["/contact", "En savoir plus sur le contact", "Learn about contacting the city"],
      },
      {
        question: ["Comment signaler un problème dans mon secteur ?", "How do I report a problem in my sector?"],
        answer: [
          "Connectez-vous et vérifiez votre identité avant de déposer un signalement. Vous pouvez commencer depuis votre espace habitant ; l'assistant peut aussi vous aider à préparer un signalement.",
          "Sign in and verify your identity before submitting a report. Start from your resident space; the assistant can also help you prepare one.",
        ],
        link: ["/app/reports/new", "Accéder au signalement", "Go to reports"],
      },
      {
        question: ["L'assistant envoie-t-il une demande ou un signalement sans mon accord ?", "Can the assistant send a request or report without my approval?"],
        answer: [
          "Non. Il s'appuie sur les informations publiées et cite ses sources. Il peut préparer une demande ou un signalement, mais rien n'est créé ni envoyé sans votre confirmation explicite.",
          "No. It uses published information and cites its sources. It can prepare a request or report, but nothing is created or sent without your explicit confirmation.",
        ],
      },
    ],
  },
  {
    id: "help",
    icon: ShieldCheck,
    title: ["Aide, sécurité et accessibilité", "Help, safety and accessibility"],
    questions: [
      {
        question: ["Où consulter les alertes et les consignes de sécurité ?", "Where can I find alerts and safety instructions?"],
        answer: [
          "Consultez la page Dangers pour voir les alertes publiées, leurs zones concernées et les protocoles associés. En cas de danger immédiat, contactez les secours et suivez les consignes des autorités.",
          "Visit the Dangers page for published alerts, affected areas and related protocols. In immediate danger, contact emergency services and follow the authorities' instructions.",
        ],
        link: ["/dangers", "Voir les alertes", "View alerts"],
      },
      {
        question: ["Comment obtenir de l'aide ou utiliser le portail au clavier ?", "How can I get help or use the portal with a keyboard?"],
        answer: [
          "Le guide présente les parcours du portail et les commandes vocales. Les liens et les commandes peuvent être parcourus au clavier ; les paramètres permettent aussi d'ajuster le contraste, la taille du texte et l'assistance vocale.",
          "The guide explains portal journeys and voice commands. Links and controls can be used with a keyboard; settings also let you adjust contrast, text size and voice assistance.",
        ],
        link: ["/guide", "Consulter le guide", "Read the guide"],
      },
      {
        question: ["Que faire si une information n'est pas disponible ?", "What should I do if some information is unavailable?"],
        answer: [
          "Les réponses de l'assistant se limitent aux contenus publiés : il ne devine pas les informations manquantes. Consultez la fiche du service concerné ou contactez la mairie.",
          "The assistant only answers from published content and will not guess missing details. Check the relevant service page or contact the city.",
        ],
        link: ["/contact", "Contacter la mairie", "Contact the city"],
      },
    ],
  },
] as const

export function FaqPage() {
  const { tx } = useLocale()

  return (
    <Container className="max-w-4xl py-10">
      <title>{tx("Questions fréquentes", "Frequently asked questions")}</title>
      <PageHeader
        eyebrow={tx("Aide", "Help")}
        title={tx("Questions fréquentes", "Frequently asked questions")}
        description={tx(
          "Retrouvez les réponses aux questions courantes sur les services, les démarches et les outils de Nova Terra.",
          "Find answers to common questions about Nova Terra's services, procedures and tools.",
        )}
      />

      <div className="grid gap-6">
        {FAQ_GROUPS.map(({ id, icon: Icon, title, questions }) => (
          <section key={id} aria-labelledby={`faq-${id}`} className="rounded-xl border bg-card p-5">
            <h2 id={`faq-${id}`} className="flex items-center gap-2 font-display text-xl font-semibold">
              <Icon className="size-5 text-primary" aria-hidden />
              {tx(title[0], title[1])}
            </h2>
            <div className="mt-4 divide-y rounded-lg border">
              {questions.map((item) => (
                <details key={item.question[0]} className="group p-4 open:bg-muted/30">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:content-none">
                    {tx(item.question[0], item.question[1])}
                    <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45" aria-hidden>
                      +
                    </span>
                  </summary>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {tx(item.answer[0], item.answer[1])}
                    {"link" in item && (
                      <>
                        {" "}
                        <Link to={item.link[0]} className="font-medium text-foreground underline underline-offset-4">
                          {tx(item.link[1], item.link[2])}
                        </Link>
                      </>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-muted/30 p-5">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <Accessibility className="size-5 text-primary" aria-hidden />
            {tx("Besoin d'un accompagnement ?", "Need more help?")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {tx("Consultez le guide ou contactez l'équipe de la mairie.", "Read the guide or contact the city team.")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link to="/guide">{tx("Guide", "Guide")}</Link>
          </Button>
          <Button asChild>
            <Link to="/contact">{tx("Nous contacter", "Contact us")}</Link>
          </Button>
        </div>
      </section>
    </Container>
  )
}
