# Chat vocal Google AI Studio

Le chat vocal du widget utilise l'API Gemini de Google AI Studio pour comprendre l'enregistrement, garder le contexte des derniers échanges et répondre à partir du contenu public chargé depuis la base de connaissances Nova Terra. Les réponses sont lues à voix haute dans le navigateur et affichent les liens sources connus. Le chat texte continue d'utiliser OpenRouter.

## Configuration

1. Créez une clé API dans [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Configurez les secrets Supabase et déployez la fonction vocale :

```sh
supabase secrets set GOOGLE_AI_STUDIO_API_KEY=VOTRE_CLE GOOGLE_AI_STUDIO_MODEL=gemini-3.8-flash
supabase functions deploy gemini-voice-chat
```

`GOOGLE_AI_STUDIO_MODEL` est facultatif ; par défaut, la fonction utilise `gemini-3.8-flash`, qui accepte l'audio en entrée. La clé reste uniquement côté Edge Function et n'est jamais incluse dans le build du navigateur.

3. Activez l'interface vocale au moment du build :

```env
VITE_ENABLE_GOOGLE_AI_STUDIO_VOICE=true
```

Un compte Supabase réel (non démo), une connexion internet, l'autorisation d'utiliser le microphone et la configuration Edge Function sont nécessaires.

## Données et confidentialité

- Le microphone est activé uniquement après une action explicite. Les enregistrements sont limités à 30 secondes et convertis localement en WAV mono 16 kHz.
- Après l'arrêt de l'enregistrement, l'audio est envoyé à la fonction Supabase, puis à Google AI Studio avec les contenus publiés chargés par le widget. Gemini renvoie la transcription et une réponse fondée sur ces contenus.
- L'audio n'est pas enregistré dans l'historique local des conversations. La transcription et la réponse peuvent être conservées si l'historique du chatbot est activé.
- Les échanges vocaux réutilisent le quota IA Supabase partagé : 20 appels par jour et par compte. Un appel Gemini est compté comme une requête.
- Vérifiez les conditions et règles de conservation applicables à la clé et au projet Google AI Studio de votre organisation.

Documentation : [Gemini API audio](https://ai.google.dev/gemini-api/docs/audio), [Gemini API generateContent](https://ai.google.dev/api/generate-content), [Secrets Supabase Edge Functions](https://supabase.com/docs/guides/functions/secrets).
