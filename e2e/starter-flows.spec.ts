import { expect, test, type Page } from "@playwright/test"

async function signInAsMember(page: Page, email: string) {
  await page.goto("/connexion")
  await page.getByLabel("Adresse e-mail").fill(email)
  await page.getByLabel("Mot de passe", { exact: true }).fill("webcup-test-123")
  await page.getByRole("button", { name: "Se connecter", exact: true }).click()
  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible()
}

test("l'inscription ouvre un espace membre", async ({ page }) => {
  await page.goto("/inscription")
  await page.getByLabel("Prénom").fill("Aina")
  await page.getByLabel("Nom", { exact: true }).fill("Randria")
  await page.getByLabel("Adresse e-mail").fill(`signup-${Date.now()}@example.test`)
  await page.getByLabel("Mot de passe", { exact: true }).fill("webcup-test-123")
  await page.getByLabel("Confirmer le mot de passe").fill("webcup-test-123")
  await page.getByRole("checkbox").check()
  await page.getByRole("button", { name: "Créer mon compte", exact: true }).click()

  await expect(page).toHaveURL(/\/app$/)
  await expect(page.getByRole("heading", { name: "Notes", exact: true })).toBeVisible()
})

test("la connexion ouvre l'espace privé", async ({ page }) => {
  await signInAsMember(page, "connexion@example.test")
})

test("le CRUD permet de créer, lire, modifier et supprimer une note", async ({ page }) => {
  await signInAsMember(page, "crud@example.test")

  const title = `Note e2e ${Date.now()}`
  const editedTitle = `${title} modifiée`
  await page.getByLabel("Titre").fill(title)
  await page.getByLabel("Contenu (facultatif)").fill("Contenu de contrôle du parcours CRUD.")
  await page.getByRole("button", { name: "Publier la note", exact: true }).click()

  await page.getByRole("link", { name: title, exact: true }).click()
  await expect(page.getByRole("heading", { name: title, exact: true })).toBeVisible()
  await expect(page.getByText("Contenu de contrôle du parcours CRUD.")).toBeVisible()

  await page.getByRole("button", { name: "Modifier cette note" }).click()
  await page.getByLabel("Titre").fill(editedTitle)
  await page.getByRole("button", { name: "Enregistrer les changements" }).click()
  await expect(page.getByRole("heading", { name: editedTitle, exact: true })).toBeVisible()

  await page.getByRole("link", { name: "Retour aux notes" }).click()
  await page.getByRole("button", { name: `Supprimer la note « ${editedTitle} »` }).click()
  const confirmation = page.getByRole("dialog")
  await expect(confirmation.getByText("Supprimer cette note ?")).toBeVisible()
  await confirmation.getByRole("button", { name: "Supprimer", exact: true }).click()
  await expect(page.getByRole("link", { name: editedTitle, exact: true })).toHaveCount(0)
})

test("un membre ne peut pas ouvrir l'espace administrateur", async ({ page }) => {
  await signInAsMember(page, "member@example.test")
  await page.goto("/admin")

  await expect(page.getByRole("alert")).toContainText("Accès administrateur requis")
  await expect(page.getByRole("button", { name: "Se déconnecter" })).toBeVisible()
})

test("la galerie applique une nouvelle palette et montre les variantes de boutons", async ({ page }) => {
  await page.goto("/kit")
  await page.getByRole("combobox", { name: "Palette" }).selectOption("corail")

  await expect(page.locator("html")).toHaveAttribute("data-theme", "corail")
  await expect(page.getByRole("button", { name: "Dégradé", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Verre", exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "Extra large", exact: true })).toBeVisible()
})
