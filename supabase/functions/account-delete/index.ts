import { authenticatedUser, json, originAllowed, preflight, serviceClient } from "../_shared/http.ts"

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Méthode non autorisée." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origine non autorisée." }, 403)

  try {
    const { user, error: authError } = await authenticatedUser(request)
    if (!user) return json(request, { error: authError }, 401)
    const lastSignInAt = user.last_sign_in_at ? Date.parse(user.last_sign_in_at) : 0
    if (!lastSignInAt || Date.now() - lastSignInAt > 15 * 60 * 1000) {
      return json(request, { error: "Reconnectez-vous puis réessayez pour confirmer cette action sensible." }, 401)
    }
    const { error } = await serviceClient().auth.admin.deleteUser(user.id)
    if (error) return json(request, { error: "Le compte n'a pas pu être supprimé." }, 500)
    return json(request, { ok: true })
  } catch (error) {
    console.error("account-delete failed", error)
    return json(request, { error: "Erreur inattendue lors de la suppression du compte." }, 500)
  }
})
