import { htmlEscape, json, originAllowed, preflight, serviceClient } from "../_shared/http.ts"

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Méthode non autorisée." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origine non autorisée." }, 403)

  try {
    const body = await request.json().catch(() => null)
    if (typeof body?.website === "string" && body.website.trim()) return json(request, { ok: true })
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return json(request, { error: "Vérifiez le nom et l'adresse e-mail." }, 400)
    }
    if (message.length < 10 || message.length > 5000) {
      return json(request, { error: "Le message doit contenir entre 10 et 5 000 caractères." }, 400)
    }

    const service = serviceClient()
    const remoteAddress = request.headers.get("cf-connecting-ip")
      ?? request.headers.get("x-real-ip")
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "unknown"
    const salt = Deno.env.get("CONTACT_RATE_LIMIT_SALT") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${remoteAddress}`))
    const ipHash = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("")
    const { data: permitted, error: limitError } = await service.rpc("consume_contact_request", { p_ip_hash: ipHash })
    if (limitError) return json(request, { error: "Le formulaire est temporairement indisponible." }, 503)
    if (!permitted) return json(request, { error: "Limite atteinte : réessayez un peu plus tard." }, 429)

    const { error: insertError } = await service.from("contact_messages").insert({ name, email, message })
    if (insertError) return json(request, { error: "Le message n'a pas pu être enregistré." }, 500)

    const apiKey = Deno.env.get("RESEND_API_KEY")
    const recipient = Deno.env.get("CONTACT_TO_EMAIL")
    const sender = Deno.env.get("MAIL_FROM")
    let emailSent = false
    if (apiKey && recipient && sender) {
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: sender,
            to: [recipient],
            reply_to: email,
            subject: `Nouveau message de contact — ${name.replace(/[\r\n]/g, " ")}`,
            text: `De : ${name} <${email}>\n\n${message}`,
            html: `<p><strong>De :</strong> ${htmlEscape(name)} &lt;${htmlEscape(email)}&gt;</p><pre style="white-space:pre-wrap;font:inherit">${htmlEscape(message)}</pre>`,
          }),
        })
        emailSent = response.ok
        if (!response.ok) console.error("Resend delivery failed", response.status, (await response.text()).slice(0, 500))
      } catch (error) {
        console.error("Resend request failed", error)
      }
    }
    return json(request, { ok: true, emailSent })
  } catch (error) {
    console.error("contact-submit failed", error)
    return json(request, { error: "Erreur inattendue lors de l'envoi." }, 500)
  }
})
