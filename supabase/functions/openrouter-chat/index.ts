import { authenticatedUser, json, originAllowed, preflight, serviceClient, userClient } from "../_shared/http.ts"

const MAX_MESSAGE = 4000

Deno.serve(async (request) => {
  const options = preflight(request)
  if (options) return options
  if (request.method !== "POST") return json(request, { error: "Méthode non autorisée." }, 405)
  if (!originAllowed(request)) return json(request, { error: "Origine non autorisée." }, 403)

  try {
    const { user, error: authError } = await authenticatedUser(request)
    if (!user) return json(request, { error: authError }, 401)
    const apiKey = Deno.env.get("OPENROUTER_API_KEY")
    const model = Deno.env.get("OPENROUTER_MODEL")
    if (!apiKey || !model) return json(request, { error: "Configurez OPENROUTER_API_KEY et OPENROUTER_MODEL côté serveur." }, 503)

    const body = await request.json().catch(() => null)
    const message = typeof body?.message === "string" ? body.message.trim() : ""
    const requestedConversationId = typeof body?.conversationId === "string" ? body.conversationId : null
    if (message.length < 1 || message.length > MAX_MESSAGE) {
      return json(request, { error: `Le message doit contenir entre 1 et ${MAX_MESSAGE} caractères.` }, 400)
    }

    const service = serviceClient()
    // Consommer le quota avant de créer une ligne évite qu'une requête refusée
    // puisse remplir la base avec des conversations vides.
    const scopedClient = userClient(request)
    const { data: quotaAllowed, error: quotaUserError } = await scopedClient.rpc("consume_ai_request")
    if (quotaUserError) return json(request, { error: "Impossible de vérifier le quota IA." }, 503)
    if (!quotaAllowed) return json(request, { error: "Quota atteint : limite de 20 messages IA par jour." }, 429)

    const saveHistory = Deno.env.get("OPENROUTER_SAVE_HISTORY") === "true"
    let conversation: { id: string; title: string } | null = null
    if (saveHistory && requestedConversationId) {
      const { data, error } = await service.from("ai_conversations")
        .select("id, title").eq("id", requestedConversationId).eq("user_id", user.id).maybeSingle()
      if (error || !data) return json(request, { error: "Conversation introuvable." }, 404)
      conversation = data
    } else if (saveHistory) {
      const { data, error } = await service.from("ai_conversations")
        .insert({ user_id: user.id, title: message.slice(0, 72) })
        .select("id, title").single()
      if (error || !data) return json(request, { error: "Impossible de créer la conversation." }, 500)
      conversation = data
    }

    let messages = [{ role: "user", content: message }]
    let savedUserMessageId = ""
    if (conversation) {
      const { data: savedUserMessage, error: saveUserError } = await service.from("ai_messages").insert({
        conversation_id: conversation.id, role: "user", content: message,
      }).select("id").single()
      if (saveUserError) return json(request, { error: "Impossible d'enregistrer le message." }, 500)
      savedUserMessageId = savedUserMessage.id
      const { data: history } = await service.from("ai_messages")
        .select("role, content").eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false }).limit(20)
      messages = (history ?? []).reverse().map((entry) => ({ role: entry.role, content: entry.content }))
    }
    let providerResponse: Response
    try {
      providerResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": Deno.env.get("APP_ORIGIN") ?? "https://webcup.local",
          "X-OpenRouter-Title": Deno.env.get("APP_NAME") ?? "Webcup Starter",
        },
        body: JSON.stringify({ model, messages, max_tokens: 600, temperature: 0.6 }),
        signal: AbortSignal.timeout(30000),
      })
    } catch (error) {
      if (conversation && savedUserMessageId) await service.from("ai_messages").delete().eq("id", savedUserMessageId)
      console.error("OpenRouter request failed", error)
      return json(request, { error: "Le service IA est temporairement indisponible." }, 502)
    }
    if (!providerResponse.ok) {
      const providerBody = await providerResponse.text()
      if (conversation && savedUserMessageId) await service.from("ai_messages").delete().eq("id", savedUserMessageId)
      console.error("OpenRouter error", providerResponse.status, providerBody.slice(0, 500))
      return json(request, { error: "Le service IA est temporairement indisponible." }, 502)
    }
    const result = await providerResponse.json()
    const answer = result?.choices?.[0]?.message?.content
    if (typeof answer !== "string" || !answer.trim()) {
      if (conversation && savedUserMessageId) await service.from("ai_messages").delete().eq("id", savedUserMessageId)
      return json(request, { error: "Le modèle n'a pas renvoyé de réponse exploitable." }, 502)
    }

    if (conversation) {
      const { error: saveAssistantError } = await service.from("ai_messages").insert({
        conversation_id: conversation.id, role: "assistant", content: answer.slice(0, 8000),
      })
      await service.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversation.id)
      if (saveAssistantError) console.error("Could not save assistant message", saveAssistantError.message)
    }
    return json(request, { conversationId: conversation?.id ?? null, answer: answer.slice(0, 8000), historyEnabled: saveHistory })
  } catch (error) {
    console.error("openrouter-chat failed", error)
    return json(request, { error: "Erreur inattendue de l'assistant IA." }, 500)
  }
})
