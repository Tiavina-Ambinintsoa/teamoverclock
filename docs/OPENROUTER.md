# Assistant OpenRouter

Le module fournit `/app/assistant`, une Edge Function Supabase, un quota fixe de 20 demandes par jour et par compte, et un historique privé facultatif. L'appel navigateur ne reçoit jamais la clé OpenRouter. La fonction envoie les requêtes au point de terminaison officiel Chat Completions d'OpenRouter.

## Prérequis

1. Connectez le projet à Supabase et exécutez `supabase/schema.sql`.
2. Créez une clé API OpenRouter et choisissez un identifiant de modèle dans son catalogue.
3. Dans `.env.local`, activez le lien et définissez le modèle côté serveur :

```env
VITE_ENABLE_AI_CHAT=true
# Facultatif : choisissez le même réglage côté Edge Function (voir ci-dessous).
VITE_ENABLE_AI_HISTORY=false
```

4. Connectez le CLI Supabase au projet puis déployez :

```sh
supabase login
supabase link --project-ref VOTRE_PROJECT_REF
supabase functions deploy openrouter-chat
```

Ajoutez les secrets depuis un terminal privé. Ne les mettez pas dans `.env.local`, une variable `VITE_*`, le dépôt ou le code du navigateur :

```sh
supabase secrets set OPENROUTER_API_KEY=VOTRE_CLE OPENROUTER_MODEL=identifiant-modele
supabase secrets set APP_NAME="Nom de votre site" APP_ORIGIN=https://votre-domaine.example
supabase secrets set APP_ORIGINS=https://votre-domaine.example,https://www.votre-domaine.example
```

Pour un environnement local Edge Functions, placez les clés dans `supabase/functions/.env` (fichier ignoré par Git), puis lancez `supabase functions serve openrouter-chat --env-file supabase/functions/.env`.

## Historique facultatif

Par défaut, les prompts et réponses ne sont pas enregistrés : seul le compteur de quota l'est. Pour activer l'historique privé, définissez **les deux** options puis reconstruisez le front :

```sh
supabase secrets set OPENROUTER_SAVE_HISTORY=true
```

```env
VITE_ENABLE_AI_HISTORY=true
```

La table `ai_messages` est lisible par son propriétaire, mais ses écritures passent par l'Edge Function. Les conversations et messages sont supprimés avec le compte. Le contrôle des tokens impose au plus 600 tokens de sortie par demande, 4 000 caractères en entrée et 20 demandes par jour. Ajustez ces constantes et le quota SQL dans `supabase/functions/openrouter-chat/index.ts` et `supabase/schema.sql` selon le sujet et le budget.

## Sécurité et limites

- `OPENROUTER_API_KEY` et `OPENROUTER_MODEL` sont lus côté Edge Function ; le modèle n'est pas choisi librement depuis le navigateur.
- La fonction vérifie le JWT Supabase, la propriété de la conversation et le quota avant l'appel externe.
- Un appel réussi consomme le quota. Une panne OpenRouter peut également consommer une tentative.
- Sans les secrets, le module répond avec un message de configuration et n'essaie pas d'appeler OpenRouter.
- Les messages envoyés à OpenRouter quittent votre base. Informez vos utilisateurs et vérifiez les règles de confidentialité du modèle choisi.

Références : [OpenRouter Chat Completions](https://openrouter.ai/docs/api/api-reference/chat/send-chat-completion-request), [Secrets Supabase Edge Functions](https://supabase.com/docs/guides/functions/secrets), [Authentification des Edge Functions](https://supabase.com/docs/guides/functions/auth).
