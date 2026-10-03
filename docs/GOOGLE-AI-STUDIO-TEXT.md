# Chat texte Google AI Studio

Le chatbot flottant utilise Gemini via la fonction Supabase `gemini-chat`. Il transmet la question, jusqu'à 12 tours précédents et les contenus publiés de la base de connaissances (guides d'écran, étapes, services, alertes et documents requis). La réponse structurée peut inclure des sources ; le navigateur n'affiche que les liens qui existent dans les données publiées reçues. Si Gemini est indisponible, le chatbot utilise les réponses locales fondées sur les contenus publiés.

## Configuration et déploiement

Le même secret serveur que le chat vocal est utilisé :

```sh
supabase secrets set GOOGLE_AI_STUDIO_API_KEY=VOTRE_CLE
supabase functions deploy gemini-chat
```

`GOOGLE_AI_STUDIO_MODEL` est facultatif ; par défaut, la fonction utilise `gemini-3.8-flash`. Pour activer les réponses Gemini après le build du site, définissez `VITE_ENABLE_AI_CHAT=true`. Cette variable est un simple indicateur public ; la clé API ne doit jamais être exposée dans une variable `VITE_*`.

L'utilisateur doit être connecté à un compte Supabase réel. Les requêtes sont authentifiées et partagent le quota existant de 20 appels IA par jour et par compte. Une erreur de service n'est pas silencieuse : le widget conserve la réponse locale publiée et l'indique à l'utilisateur.

## Données et confidentialité

- La fonction reçoit les guides et données publiés chargés par le widget, ainsi que les derniers échanges textuels disponibles dans la conversation ouverte.
- Le backend traite uniquement des questions textuelles. La clé Google reste côté Edge Function.
- Le widget ne stocke l'historique que si l'utilisateur active explicitement « Conserver l'historique ».
- Les réponses Gemini ne peuvent pas créer ou envoyer de demande ni de signalement ; ces actions restent sous contrôle du formulaire et exigent l'action de l'utilisateur.

Voir aussi [Chat vocal Google AI Studio](./GOOGLE-AI-STUDIO-VOICE.md) et [Secrets Supabase Edge Functions](https://supabase.com/docs/guides/functions/secrets).
