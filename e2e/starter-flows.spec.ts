import { expect, test, type Page } from "@playwright/test"

// Les tests tournent en mode démo local (aucune clé Supabase, voir global-setup.ts) : pas de base de données,
// les parcours vérifiés sont donc ceux qui ne dépendent pas des données (formulaires, droits, accessibilité, guide).

async function signInAsMember(page: Page, email: string) {
  await page.goto("/connexion")
  await page.getByLabel("Adresse e-mail").fill(email)
  await page.getByLabel("Mot de passe", { exact: true }).fill("webcup-test-123")
  await page.getByRole("button", { name: "Se connecter", exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour")
}

test("l'inscription (D01) ouvre l'espace citoyen", async ({ page }) => {
  await page.goto("/inscription")
  await page.getByLabel("Prénom").fill("Aina")
  await page.getByLabel("Nom", { exact: true }).fill("Randria")
  await page.getByLabel("Adresse e-mail").fill(`signup-${Date.now()}@example.test`)
  await page.getByLabel("Date de naissance").fill("1992-04-12")
  await page.getByLabel("Mot de passe", { exact: true }).fill("Webcup-test-123")
  await page.getByLabel("Confirmer le mot de passe").fill("Webcup-test-123")
  await page.getByRole("checkbox", { name: /conditions d'utilisation/ }).check()
  await page.getByRole("checkbox", { name: /traitement de mes données/ }).check()
  await page.getByRole("button", { name: "Créer mon compte", exact: true }).click()

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Bonjour")
})

test("l'inscription refuse un mot de passe faible et affiche l'erreur", async ({ page }) => {
  await page.goto("/inscription")
  await page.getByLabel("Prénom").fill("Aina")
  await page.getByLabel("Nom", { exact: true }).fill("Randria")
  await page.getByLabel("Adresse e-mail").fill("faible@example.test")
  await page.getByLabel("Date de naissance").fill("1992-04-12")
  await page.getByLabel("Mot de passe", { exact: true }).fill("abc")
  await page.getByLabel("Confirmer le mot de passe").fill("abc")
  await page.getByRole("button", { name: "Créer mon compte", exact: true }).click()

  await expect(page.getByRole("alert").filter({ hasText: "Mot de passe trop faible" })).toBeVisible()
  await expect(page).toHaveURL(/\/inscription$/)
})

test("la connexion (D03) ouvre l'espace privé", async ({ page }) => {
  await signInAsMember(page, "connexion@example.test")
})

test("un citoyen ne peut pas ouvrir l'espace agent ni l'administration (403 contrôlée)", async ({ page }) => {
  await signInAsMember(page, "citoyen@example.test")

  await page.goto("/agent")
  await expect(page.getByRole("alert")).toContainText("Accès refusé")

  await page.goto("/admin/users")
  await expect(page.getByRole("alert")).toContainText("Accès refusé")
})

test("les pages publiques s'affichent même sans données", async ({ page }) => {
  for (const [path, heading] of [
    ["/", "Bienvenue à Nova Terra"],
    ["/services", "Services municipaux"],
    ["/news", "Actualités municipales"],
    ["/map", "Carte de Nova Terra"],
    ["/dangers", "Dangers et protocoles"],
    ["/guide", "Guide d'utilisation"],
  ] as const) {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible()
  }
})

test("l'accueil donne accès aux actions principales et aux numéros d'urgence", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("link", { name: "Se connecter" }).first()).toBeVisible()
  await expect(page.getByRole("link", { name: "Consulter les services" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Signaler un problème" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Contacter la mairie" })).toBeVisible()
  await expect(page.getByRole("link", { name: /Police · \+999 112/ })).toBeVisible()
})

test("le thème à fort contraste et la taille de texte s'appliquent et persistent", async ({ page }) => {
  await signInAsMember(page, "vue@example.test")
  await page.goto("/app/accessibility")

  await page.getByLabel("Contraste élevé — sombre").check()
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high_contrast_dark")

  await page.getByLabel(/Taille du texte/).fill("1.5")
  await expect(page.locator("html")).toHaveCSS("font-size", "24px")

  await page.reload()
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high_contrast_dark")
})

test("la visite guidée se lance, avance au clavier et se ferme", async ({ page }) => {
  await page.goto("/guide")
  await page.getByRole("button", { name: "Lancer la visite" }).first().click()

  const tour = page.getByRole("dialog")
  await expect(tour).toContainText("Étape 1/10")
  await page.keyboard.press("ArrowRight")
  await expect(tour).toContainText("Étape 2/10")
  await page.keyboard.press("Escape")
  await expect(tour).toHaveCount(0)
})

test("la galerie applique une nouvelle palette et montre les variantes de boutons", async ({ page }) => {
  await page.goto("/kit")
  await page.getByRole("combobox", { name: "Palette" }).selectOption("corail")

  await expect(page.locator("html")).toHaveAttribute("data-theme", "corail")
  await expect(page.getByRole("button", { name: "Dégradé", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Verre", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Extra large", exact: true })).toBeVisible()
})
