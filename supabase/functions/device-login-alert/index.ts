import { authenticatedUser, json, originAllowed, preflight, serviceClient } from "../_shared/http.ts"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

Deno.serve(async (request: Request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Method not allowed." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origin not allowed." }, 403)

  try {
    const auth = await authenticatedUser(request)
    if (!auth.user) return json(request, { error: auth.error ?? "Authentication required." }, 401)
    if (!auth.user.email) return json(request, { error: "No account email is available." }, 400)

    const payload = await request.json().catch(() => null)
    const deviceId = typeof payload?.deviceId === "string" ? payload.deviceId : ""
    if (!UUID_PATTERN.test(deviceId)) return json(request, { error: "Invalid device identifier." }, 400)

    const resendKey = Deno.env.get("RESEND_API_KEY")
    const from = Deno.env.get("DEVICE_LOGIN_FROM_EMAIL")
    if (!resendKey || !from) return json(request, { error: "Device login email is not configured." }, 503)

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(deviceId))
    const deviceHash = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("")
    const admin = serviceClient()
    const { data: profile, error: profileError } = await admin.from("profiles")
      .select("account_status,deleted_at").eq("id", auth.user.id).maybeSingle()
    if (profileError) throw new Error(profileError.message)
    if (!profile || profile.account_status !== "active" || profile.deleted_at !== null) {
      return json(request, { error: "Only active accounts can receive sign-in alerts." }, 403)
    }
    const { count, error: countError } = await admin.from("login_alert_devices")
      .select("id", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .gte("first_seen_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    if (countError) throw new Error(countError.message)
    if ((count ?? 0) >= 5) return json(request, { sent: false, reason: "daily_limit" })
    const { data: created, error: insertError } = await admin.from("login_alert_devices")
      .insert({ user_id: auth.user.id, device_hash: deviceHash })
      .select("id,first_seen_at")
      .maybeSingle()
    if (insertError?.code === "23505") return json(request, { sent: false, reason: "known_device" })
    if (insertError) throw new Error(insertError.message)
    if (!created) return json(request, { sent: false, reason: "known_device" })

    const userAgent = (request.headers.get("user-agent") ?? "Unknown device").slice(0, 240)
    const date = new Intl.DateTimeFormat("en", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: "UTC",
    }).format(new Date(created.first_seen_at))
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [auth.user.email],
        subject: "New sign-in to your Nova Terra account",
        text: [
          "A sign-in to your Nova Terra account was detected from a device not seen before.",
          "",
          `Time: ${date} (UTC)`,
          `Browser/device information: ${userAgent}`,
          "",
          "If this was you, no action is needed. If you do not recognize this sign-in, change your password and contact the city support team.",
          "",
          "For your privacy, this alert does not include your IP address or precise location.",
        ].join("\n"),
      }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) {
      const details = (await response.text()).slice(0, 400)
      await admin.from("login_alert_devices").delete().eq("id", created.id)
      console.error("Device login email provider failed", response.status, details)
      return json(request, { error: "Could not send device login email." }, 502)
    }
    return json(request, { sent: true })
  } catch (error) {
    console.error("device-login-alert failed", error)
    return json(request, { error: "Could not process device login alert." }, 500)
  }
})
