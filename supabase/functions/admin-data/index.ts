import { authenticatedUser, json, originAllowed, preflight, serviceClient } from "../_shared/http.ts"

async function allUsers(service: ReturnType<typeof serviceClient>) {
  const users = []
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 1000) break
  }
  return users
}

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Méthode non autorisée." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origine non autorisée." }, 403)

  try {
    const { user: actor, error: authError } = await authenticatedUser(request)
    if (!actor) return json(request, { error: authError }, 401)
    if (actor.app_metadata?.role !== "admin") return json(request, { error: "Rôle administrateur requis." }, 403)
    const body = await request.json().catch(() => null)
    const service = serviceClient()

    if (body?.action === "list-users") {
      const users = await allUsers(service)
      const query = typeof body.query === "string" ? body.query.trim().toLowerCase() : ""
      const role = body.role === "admin" || body.role === "member" ? body.role : ""
      const result = users
        .filter((entry) => !query || `${entry.email ?? ""} ${entry.user_metadata?.display_name ?? ""}`.toLowerCase().includes(query))
        .filter((entry) => !role || (entry.app_metadata?.role === "admin" ? "admin" : "member") === role)
        .slice(0, 250)
        .map((entry) => ({
          id: entry.id,
          email: entry.email ?? "",
          displayName: String(entry.user_metadata?.display_name ?? entry.email?.split("@")[0] ?? "Utilisateur"),
          role: entry.app_metadata?.role === "admin" ? "admin" : "member",
          lastSignInAt: entry.last_sign_in_at,
          createdAt: entry.created_at,
        }))
      return json(request, { users: result, total: users.length })
    }

    if (body?.action === "set-role") {
      const userId = typeof body.userId === "string" ? body.userId : ""
      const role = body.role === "admin" ? "admin" : body.role === "member" ? "member" : null
      if (!userId || !role) return json(request, { error: "Utilisateur ou rôle invalide." }, 400)
      if (userId === actor.id) return json(request, { error: "Pour éviter un verrouillage, modifiez un autre administrateur." }, 400)
      const users = await allUsers(service)
      const target = users.find((entry) => entry.id === userId)
      if (!target) return json(request, { error: "Utilisateur introuvable." }, 404)
      const adminCount = users.filter((entry) => entry.app_metadata?.role === "admin").length
      if (target.app_metadata?.role === "admin" && role !== "admin" && adminCount <= 1) {
        return json(request, { error: "Il faut garder au moins un administrateur." }, 409)
      }
      const { error } = await service.auth.admin.updateUserById(userId, {
        app_metadata: { ...target.app_metadata, role },
      })
      if (error) return json(request, { error: "Le rôle n'a pas pu être modifié." }, 500)
      return json(request, { ok: true })
    }

    if (body?.action === "list-contact") {
      const { data, error } = await service.from("contact_messages")
        .select("id, name, email, message, status, created_at")
        .order("created_at", { ascending: false }).limit(100)
      if (error) return json(request, { error: "Impossible de charger les messages." }, 500)
      return json(request, { messages: data })
    }

    if (body?.action === "set-contact-status") {
      const id = typeof body.id === "string" ? body.id : ""
      const status = ["new", "read", "closed"].includes(body.status) ? body.status : null
      if (!id || !status) return json(request, { error: "Message ou statut invalide." }, 400)
      const { error } = await service.from("contact_messages").update({ status }).eq("id", id)
      if (error) return json(request, { error: "Le statut n'a pas pu être enregistré." }, 500)
      return json(request, { ok: true })
    }

    return json(request, { error: "Action inconnue." }, 400)
  } catch (error) {
    console.error("admin-data failed", error)
    return json(request, { error: "Erreur de l'API d'administration." }, 500)
  }
})
