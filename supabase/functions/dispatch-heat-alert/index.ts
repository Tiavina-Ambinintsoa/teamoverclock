import {
  authenticatedUser,
  json,
  originAllowed,
  preflight,
  serviceClient,
} from "../_shared/http.ts"

type WebhookRecord = { id?: string; slug?: string; status?: string }

Deno.serve(async (request: Request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origin not allowed." }, 403)

  try {
    const expectedSecret = Deno.env.get("HEAT_ALERT_WEBHOOK_SECRET")
    const providedSecret = request.headers.get("x-heat-alert-secret")
    const webhookCall = Boolean(expectedSecret && providedSecret === expectedSecret)
    const body = await request.json() as { dangerId?: unknown; record?: WebhookRecord }
    let dangerId: string | null = null

    if (webhookCall) {
      const record = body.record
      if (typeof record?.id !== "string" || !record.slug?.startsWith("heatwave-")) {
        return json(request, { ignored: true, reason: "Not a heatwave danger event." })
      }
      dangerId = record.id
    } else {
      const auth = await authenticatedUser(request)
      if (!auth.user) return json(request, { error: auth.error ?? "Authentication required." }, 401)
      const admin = serviceClient()
      const { data: profile, error: profileError } = await admin.from("profiles")
        .select("role,account_status,deleted_at")
        .eq("id", auth.user.id)
        .maybeSingle()
      if (profileError) throw new Error(profileError.message)
      const hasAdminRole = auth.user.app_metadata?.role === "admin" || profile?.role === "general_admin"
      if (!hasAdminRole || profile?.account_status !== "active" || profile.deleted_at !== null) {
        return json(request, { error: "Only active administrators may dispatch heat alerts." }, 403)
      }
      if (typeof body.dangerId !== "string") return json(request, { error: "Missing heat alert ID." }, 400)
      dangerId = body.dangerId
    }

    const admin = serviceClient()
    const { data: danger, error: dangerError } = await admin.from("dangers")
      .select("id,slug,status")
      .eq("id", dangerId)
      .maybeSingle()
    if (dangerError) throw new Error(dangerError.message)
    if (!danger || danger.status !== "active" || !danger.slug.startsWith("heatwave-")) {
      return json(request, { error: "Active heat alert not found." }, 404)
    }

    const { data: delivered, error: dispatchError } = await admin.rpc("dispatch_heat_alert_notifications", { p_alert_id: danger.id })
    if (dispatchError) throw new Error(dispatchError.message)
    return json(request, { delivered: delivered ?? 0, alertId: danger.id })
  } catch (error) {
    console.error("dispatch-heat-alert failed", error)
    return json(request, { error: error instanceof Error ? error.message : "Heat alert dispatch failed." }, 500)
  }
})
