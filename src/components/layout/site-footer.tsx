import { Container } from "@/components/layout/container"
import { SITE } from "@/lib/site"

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t py-10 text-sm text-muted-foreground">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-sm">
          <p className="font-display text-base font-semibold text-foreground">{SITE.name}</p>
          <p className="mt-1">Réalisé en 24 heures pour le 24h by Webcup Madagascar 2026.</p>
        </div>
        <ul className="grid gap-1">
          {SITE.team.map((member, index) => (
            <li key={`${member.name}-${index}`}>
              <span className="text-foreground">{member.name}</span>, {member.role}
            </li>
          ))}
        </ul>
      </Container>
    </footer>
  )
}
