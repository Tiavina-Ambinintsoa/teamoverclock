import { env } from "@/lib/env"

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE"
export type ApiGroup = "tables" | "rpcs" | "functions" | "auth"
export type PlaygroundKind = "table" | "rpc" | "edge" | "auth"

export interface ApiField {
  name: string
  type: string
  required: boolean
  constraints: string
}

export interface ApiParam {
  name: string
  type: string
  required: boolean
  descriptionFr: string
  descriptionEn: string
}

export interface ApiModel {
  name: string
  descriptionFr: string
  descriptionEn: string
  auth: string
  fields: ApiField[]
}

export interface ApiOperation {
  id: string
  group: ApiGroup
  resource: string
  title: string
  method: HttpMethod
  path: string
  descriptionFr: string
  descriptionEn: string
  auth: string
  role: string
  queryParams: ApiParam[]
  bodyFields: ApiField[]
  exampleRequestCurl: string
  exampleRequestSupabaseJs: string
  exampleResponse: string
  errorCodes: { status: number; code: string; descriptionFr: string; descriptionEn: string }[]
  modelName?: string
  playground: {
    kind: PlaygroundKind
    defaultSelect?: string
    defaultFilters?: string
    defaultOrder?: string
    defaultLimit?: string
    defaultBody?: string
    confirmWrite: boolean
  }
  searchableText: string
}

export interface AppFeatureDoc {
  id: string
  titleFr: string
  titleEn: string
  summaryFr: string
  summaryEn: string
  bulletsFr: string[]
  bulletsEn: string[]
}

const PUBLIC_KEY = env.supabaseKey ?? "sb_publishable_xxx"
const BASE_URL = env.supabaseUrl ?? "https://project.supabase.co"

const commonTableQueryParams: ApiParam[] = [
  {
    name: "select",
    type: "string",
    required: false,
    descriptionFr: "Colonnes et relations à retourner, ex. *, service:services(name).",
    descriptionEn: "Columns and relations to return, for example *, service:services(name).",
  },
  {
    name: "filters",
    type: "string",
    required: false,
    descriptionFr: "Filtres PostgREST ligne par ligne : colonne=op.valeur",
    descriptionEn: "PostgREST filters line by line: column=op.value",
  },
  {
    name: "order",
    type: "string",
    required: false,
    descriptionFr: "Tri, ex. created_at.desc.nullslast",
    descriptionEn: "Ordering, for example created_at.desc.nullslast",
  },
  {
    name: "limit",
    type: "integer",
    required: false,
    descriptionFr: "Nombre maximum d'éléments.",
    descriptionEn: "Maximum number of rows.",
  },
  {
    name: "embedding",
    type: "string",
    required: false,
    descriptionFr: "Relations embarquées avec select=relation(colonnes).",
    descriptionEn: "Embedded relations through select=relation(columns).",
  },
]

const readErrors = [
  { status: 400, code: "bad_request", descriptionFr: "Paramètres invalides.", descriptionEn: "Invalid parameters." },
  { status: 401, code: "unauthorized", descriptionFr: "Jeton absent ou invalide.", descriptionEn: "Missing or invalid token." },
  { status: 403, code: "forbidden", descriptionFr: "RLS ou rôle insuffisant.", descriptionEn: "RLS or role restriction denied the request." },
] as const

const writeErrors = [
  ...readErrors,
  { status: 409, code: "conflict", descriptionFr: "Contrainte d'unicité ou conflit métier.", descriptionEn: "Uniqueness or business-rule conflict." },
  { status: 422, code: "validation_failed", descriptionFr: "Le corps ne respecte pas le schéma SQL.", descriptionEn: "The request body does not match the SQL schema." },
] as const

function body(fields: ApiField[]) {
  const payload: Record<string, unknown> = {}
  for (const field of fields) {
    if (field.type.includes("uuid")) payload[field.name] = "00000000-0000-4000-8000-000000000000"
    else if (field.type.includes("boolean")) payload[field.name] = false
    else if (field.type.includes("int") || field.type.includes("numeric") || field.type.includes("smallint")) payload[field.name] = 0
    else if (field.type.includes("text[]")) payload[field.name] = ["value"]
    else if (field.type.includes("json")) payload[field.name] = {}
    else if (field.type.includes("date") || field.type.includes("time")) payload[field.name] = "2026-10-04T00:00:00Z"
    else payload[field.name] = `sample_${field.name}`
  }
  return JSON.stringify(payload, null, 2)
}

function curl(path: string, method: HttpMethod, includeBody: boolean, bodySource?: string) {
  const parts = [
    `curl -X ${method} "${BASE_URL}${path}"`,
    `  -H "apikey: ${PUBLIC_KEY}"`,
    `  -H "Authorization: Bearer <jwt>"`,
  ]
  if (includeBody) {
    parts.push(`  -H "Content-Type: application/json"`)
    parts.push(`  -d '${(bodySource ?? "{}").replace(/'/g, "\\'")}'`)
  }
  return parts.join(" \\\n")
}

function jsTable(resource: string, method: HttpMethod, bodySource?: string) {
  if (method === "GET") return `const { data, error } = await supabase.from("${resource}").select("*").limit(10)`
  if (method === "POST") return `const { data, error } = await supabase.from("${resource}").insert(${bodySource ?? "{}"}).select()`
  if (method === "PATCH") return `const { data, error } = await supabase.from("${resource}").update(${bodySource ?? "{}"}).eq("id", "00000000-0000-4000-8000-000000000000").select()`
  return `const { error } = await supabase.from("${resource}").delete().eq("id", "00000000-0000-4000-8000-000000000000")`
}

function tableOps(model: ApiModel): ApiOperation[] {
  const writable = model.fields.filter((field) => !field.constraints.includes("server-managed"))
  const createBody = body(writable)
  return [
    {
      id: `${model.name}-get`,
      group: "tables",
      resource: model.name,
      title: `GET ${model.name}`,
      method: "GET",
      path: `/rest/v1/${model.name}`,
      descriptionFr: model.descriptionFr,
      descriptionEn: model.descriptionEn,
      auth: model.auth,
      role: "RLS selon le profil / RLS based on the active role",
      queryParams: commonTableQueryParams,
      bodyFields: [],
      exampleRequestCurl: curl(`/rest/v1/${model.name}?select=*`, "GET", false),
      exampleRequestSupabaseJs: jsTable(model.name, "GET"),
      exampleResponse: `[{"id":"..."}]`,
      errorCodes: [...readErrors],
      modelName: model.name,
      playground: { kind: "table", defaultSelect: "*", defaultFilters: "", defaultOrder: "created_at.desc", defaultLimit: "10", defaultBody: "", confirmWrite: false },
      searchableText: `${model.name} ${model.descriptionFr} ${model.descriptionEn} ${model.auth}`,
    },
    {
      id: `${model.name}-post`,
      group: "tables",
      resource: model.name,
      title: `POST ${model.name}`,
      method: "POST",
      path: `/rest/v1/${model.name}`,
      descriptionFr: `Création d'un enregistrement ${model.name} via PostgREST.`,
      descriptionEn: `Create a ${model.name} record through PostgREST.`,
      auth: "JWT utilisateur + apikey public",
      role: model.auth,
      queryParams: [{ name: "select", type: "string", required: false, descriptionFr: "Colonnes à retourner après insertion.", descriptionEn: "Columns to return after insert." }],
      bodyFields: writable,
      exampleRequestCurl: curl(`/rest/v1/${model.name}`, "POST", true, createBody),
      exampleRequestSupabaseJs: jsTable(model.name, "POST", createBody),
      exampleResponse: `{"id":"..."}`,
      errorCodes: [...writeErrors],
      modelName: model.name,
      playground: { kind: "table", defaultSelect: "*", defaultFilters: "", defaultOrder: "", defaultLimit: "", defaultBody: createBody, confirmWrite: true },
      searchableText: `${model.name} create insert ${model.descriptionFr} ${model.descriptionEn}`,
    },
    {
      id: `${model.name}-patch`,
      group: "tables",
      resource: model.name,
      title: `PATCH ${model.name}`,
      method: "PATCH",
      path: `/rest/v1/${model.name}`,
      descriptionFr: `Mise à jour partielle de ${model.name}. Ajoutez toujours un filtre strict.`,
      descriptionEn: `Partial update of ${model.name}. Always supply a strict filter.`,
      auth: "JWT utilisateur + apikey public",
      role: model.auth,
      queryParams: commonTableQueryParams,
      bodyFields: writable.map((field) => ({ ...field, required: false })),
      exampleRequestCurl: curl(`/rest/v1/${model.name}?id=eq.00000000-0000-4000-8000-000000000000`, "PATCH", true, createBody),
      exampleRequestSupabaseJs: jsTable(model.name, "PATCH", createBody),
      exampleResponse: `[{"id":"..."}]`,
      errorCodes: [...writeErrors],
      modelName: model.name,
      playground: { kind: "table", defaultSelect: "*", defaultFilters: "id=eq.00000000-0000-4000-8000-000000000000", defaultOrder: "", defaultLimit: "", defaultBody: createBody, confirmWrite: true },
      searchableText: `${model.name} update patch ${model.descriptionFr} ${model.descriptionEn}`,
    },
    {
      id: `${model.name}-delete`,
      group: "tables",
      resource: model.name,
      title: `DELETE ${model.name}`,
      method: "DELETE",
      path: `/rest/v1/${model.name}`,
      descriptionFr: `Suppression de lignes ${model.name} si la politique RLS le permet.`,
      descriptionEn: `Delete ${model.name} rows when RLS allows it.`,
      auth: "JWT utilisateur + apikey public",
      role: model.auth,
      queryParams: commonTableQueryParams,
      bodyFields: [],
      exampleRequestCurl: curl(`/rest/v1/${model.name}?id=eq.00000000-0000-4000-8000-000000000000`, "DELETE", false),
      exampleRequestSupabaseJs: jsTable(model.name, "DELETE"),
      exampleResponse: `[]`,
      errorCodes: [...writeErrors],
      modelName: model.name,
      playground: { kind: "table", defaultSelect: "", defaultFilters: "id=eq.00000000-0000-4000-8000-000000000000", defaultOrder: "", defaultLimit: "", defaultBody: "", confirmWrite: true },
      searchableText: `${model.name} delete ${model.descriptionFr} ${model.descriptionEn}`,
    },
  ]
}

export const apiModels: ApiModel[] = [
  {
    name: "sectors",
    descriptionFr: "Secteurs de résidence et maillage hexagonal de Nova Terra.",
    descriptionEn: "Residence sectors and the hex-grid layout of Nova Terra.",
    auth: "Lecture publique ; écriture staff/service manager.",
    fields: [
      { name: "id", type: "uuid", required: false, constraints: "primary key; default gen_random_uuid(); server-managed" },
      { name: "code", type: "text", required: true, constraints: "unique; check ^S-[0-9]{2}$" },
      { name: "name", type: "text", required: true, constraints: "not null" },
      { name: "description", type: "text", required: false, constraints: "" },
      { name: "hex_q", type: "int", required: true, constraints: "not null" },
      { name: "hex_r", type: "int", required: true, constraints: "not null" },
    ],
  },
  {
    name: "departments",
    descriptionFr: "Directions municipales qui regroupent les services.",
    descriptionEn: "Municipal departments grouping services.",
    auth: "Lecture publique ; modifications administration.",
    fields: [
      { name: "id", type: "uuid", required: false, constraints: "primary key; server-managed" },
      { name: "code", type: "text", required: true, constraints: "unique" },
      { name: "name", type: "text", required: true, constraints: "not null" },
      { name: "description", type: "text", required: false, constraints: "" },
      { name: "head_title", type: "text", required: false, constraints: "" },
    ],
  },
  {
    name: "buildings",
    descriptionFr: "Bâtiments municipaux, accueils et points de service.",
    descriptionEn: "Municipal buildings, front desks, and service points.",
    auth: "Lecture publique ; écriture service manager/admin.",
    fields: [
      { name: "id", type: "uuid", required: false, constraints: "primary key; server-managed" },
      { name: "service_id", type: "uuid", required: false, constraints: "references services" },
      { name: "sector_id", type: "uuid", required: false, constraints: "references sectors" },
      { name: "name", type: "text", required: true, constraints: "not null" },
      { name: "facility_type", type: "text", required: false, constraints: "" },
      { name: "status", type: "text", required: false, constraints: "public/restricted/hidden depending on workflow" },
    ],
  },
  {
    name: "services",
    descriptionFr: "Catalogue des services municipaux visibles dans le portail citoyen.",
    descriptionEn: "Directory of municipal services shown in the citizen portal.",
    auth: "Lecture publique ; mise à jour service manager/admin.",
    fields: [
      { name: "id", type: "uuid", required: false, constraints: "primary key; server-managed" },
      { name: "department_id", type: "uuid", required: false, constraints: "references departments" },
      { name: "code", type: "text", required: true, constraints: "unique" },
      { name: "name", type: "text", required: true, constraints: "not null" },
      { name: "category", type: "text", required: false, constraints: "" },
      { name: "description", type: "text", required: false, constraints: "" },
    ],
  },
  {
    name: "citizens",
    descriptionFr: "Fiches citoyennes avec statut de vérification et réputation.",
    descriptionEn: "Citizen records with verification and reputation.",
    auth: "Propriétaire, agents de confiance et admin selon RLS.",
    fields: [
      { name: "profile_id", type: "uuid", required: true, constraints: "references profiles" },
      { name: "sector_id", type: "uuid", required: false, constraints: "references sectors" },
      { name: "birth_date", type: "date", required: true, constraints: "not null" },
      { name: "kyc_status", type: "kyc_status", required: false, constraints: "managed by RPC guard" },
      { name: "reputation_points", type: "int", required: false, constraints: "managed by trigger" },
      { name: "sponsor_citizen_id", type: "uuid", required: false, constraints: "references citizens" },
    ],
  },
  {
    name: "service_members",
    descriptionFr: "Affectations des agents et responsables aux services.",
    descriptionEn: "Assignments of staff and managers to services.",
    auth: "Service manager ou admin uniquement.",
    fields: [
      { name: "profile_id", type: "uuid", required: true, constraints: "references profiles" },
      { name: "service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "member_role", type: "text", required: true, constraints: "agent/admin" },
      { name: "can_validate_reports", type: "boolean", required: false, constraints: "default false" },
      { name: "revoked_at", type: "timestamptz", required: false, constraints: "server-managed when revoked" },
    ],
  },
  {
    name: "citizen_verifications",
    descriptionFr: "Historique des vérifications CIN.",
    descriptionEn: "History of CIN verifications.",
    auth: "Citoyen propriétaire + admin pour décision.",
    fields: [
      { name: "citizen_id", type: "uuid", required: true, constraints: "references citizens" },
      { name: "cin_image_path", type: "text", required: false, constraints: "" },
      { name: "ai_model", type: "text", required: false, constraints: "" },
      { name: "ai_score", type: "numeric", required: false, constraints: "" },
      { name: "status", type: "validation_status", required: true, constraints: "validated/rejected/pending" },
      { name: "rejection_reason", type: "text", required: false, constraints: "" },
    ],
  },
  {
    name: "requests",
    descriptionFr: "Demandes citoyennes envoyées aux services municipaux.",
    descriptionEn: "Citizen requests sent to municipal services.",
    auth: "Citoyen propriétaire pour créer/lire ; agents du service pour traiter.",
    fields: [
      { name: "service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "citizen_id", type: "uuid", required: true, constraints: "references citizens" },
      { name: "subject", type: "text", required: true, constraints: "not null" },
      { name: "description", type: "text", required: true, constraints: "not null" },
      { name: "status", type: "request_status", required: false, constraints: "default received" },
      { name: "due_at", type: "timestamptz", required: false, constraints: "computed from SLA" },
    ],
  },
  {
    name: "request_comments",
    descriptionFr: "Commentaires sur le suivi des demandes.",
    descriptionEn: "Comments on request follow-up.",
    auth: "Participants autorisés par RLS.",
    fields: [
      { name: "request_id", type: "uuid", required: true, constraints: "references requests" },
      { name: "author_id", type: "uuid", required: true, constraints: "references profiles" },
      { name: "body", type: "text", required: true, constraints: "not null" },
      { name: "visibility", type: "text", required: false, constraints: "internal/public depending on workflow" },
    ],
  },
  {
    name: "reports",
    descriptionFr: "Signalements citoyens sur incidents, dangers ou anomalies.",
    descriptionEn: "Citizen reports for incidents, hazards, or anomalies.",
    auth: "Citoyen vérifié pour créer ; staff et admin pour traiter.",
    fields: [
      { name: "service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "reporter_citizen_id", type: "uuid", required: false, constraints: "filled by RLS/RPC" },
      { name: "category", type: "text", required: true, constraints: "not null" },
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "description", type: "text", required: true, constraints: "not null" },
      { name: "status", type: "report_status", required: false, constraints: "default draft/received" },
    ],
  },
  {
    name: "report_evidence",
    descriptionFr: "Preuves jointes aux signalements.",
    descriptionEn: "Evidence attached to reports.",
    auth: "Auteur, validateur du service ou admin.",
    fields: [
      { name: "report_id", type: "uuid", required: true, constraints: "references reports" },
      { name: "storage_path", type: "text", required: true, constraints: "not null" },
      { name: "mime_type", type: "text", required: false, constraints: "" },
      { name: "caption", type: "text", required: false, constraints: "" },
    ],
  },
  {
    name: "news",
    descriptionFr: "Actualités publiées par la ville ou les services.",
    descriptionEn: "News published by the city or services.",
    auth: "Lecture publique si publiée ; staff/admin pour brouillons et modération.",
    fields: [
      { name: "service_id", type: "uuid", required: false, constraints: "references services" },
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "summary", type: "text", required: false, constraints: "" },
      { name: "body", type: "text", required: true, constraints: "not null" },
      { name: "status", type: "text", required: false, constraints: "draft/pending_review/published" },
      { name: "translations", type: "jsonb", required: false, constraints: "filled by translation function" },
    ],
  },
  {
    name: "news_comments",
    descriptionFr: "Commentaires modérés sur les actualités.",
    descriptionEn: "Moderated comments on news.",
    auth: "Lecture publique selon la publication ; auteur et modérateurs pour écriture.",
    fields: [
      { name: "news_id", type: "uuid", required: true, constraints: "references news" },
      { name: "author_id", type: "uuid", required: true, constraints: "references profiles" },
      { name: "body", type: "text", required: true, constraints: "1..1500 chars" },
      { name: "status", type: "text", required: false, constraints: "pending/approved/hidden" },
    ],
  },
  {
    name: "newsletter_subscriptions",
    descriptionFr: "Abonnements personnels aux newsletters.",
    descriptionEn: "Per-user newsletter subscriptions.",
    auth: "Propriétaire uniquement.",
    fields: [
      { name: "profile_id", type: "uuid", required: true, constraints: "owner only" },
      { name: "topic_id", type: "uuid", required: true, constraints: "references newsletter_topics" },
      { name: "frequency", type: "text", required: false, constraints: "instant/daily/weekly" },
      { name: "is_active", type: "boolean", required: false, constraints: "default true" },
    ],
  },
  {
    name: "dangers",
    descriptionFr: "Dangers, alertes, protocoles et consignes.",
    descriptionEn: "Hazards, alerts, protocols, and guidance.",
    auth: "Lecture publique ; publication staff/admin.",
    fields: [
      { name: "responsible_service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "sector_id", type: "uuid", required: false, constraints: "references sectors" },
      { name: "slug", type: "text", required: true, constraints: "unique" },
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "summary", type: "text", required: false, constraints: "" },
      { name: "status", type: "text", required: false, constraints: "active/archived/draft" },
    ],
  },
  {
    name: "chat_sessions",
    descriptionFr: "Sessions du chatbot des citoyens.",
    descriptionEn: "Citizen chatbot sessions.",
    auth: "Propriétaire uniquement.",
    fields: [
      { name: "profile_id", type: "uuid", required: true, constraints: "owner only" },
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "keep_history", type: "boolean", required: false, constraints: "default false" },
      { name: "updated_at", type: "timestamptz", required: false, constraints: "server-managed" },
    ],
  },
  {
    name: "chat_messages",
    descriptionFr: "Messages liés aux sessions de chatbot.",
    descriptionEn: "Messages belonging to chatbot sessions.",
    auth: "Propriétaire de la session uniquement.",
    fields: [
      { name: "session_id", type: "uuid", required: true, constraints: "references chat_sessions" },
      { name: "role", type: "text", required: true, constraints: "user/assistant/system" },
      { name: "content", type: "text", required: true, constraints: "not null" },
    ],
  },
  {
    name: "knowledge_base",
    descriptionFr: "Base de connaissance publiée au chatbot et aux guides.",
    descriptionEn: "Knowledge base published to the chatbot and guides.",
    auth: "Lecture publique si publiée ; écriture admin.",
    fields: [
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "body", type: "text", required: true, constraints: "not null" },
      { name: "source_url", type: "text", required: false, constraints: "" },
      { name: "is_published", type: "boolean", required: false, constraints: "default false" },
    ],
  },
  {
    name: "accessibility_preferences",
    descriptionFr: "Préférences d'accessibilité et assistance vocale.",
    descriptionEn: "Accessibility and voice-assistance preferences.",
    auth: "Propriétaire uniquement.",
    fields: [
      { name: "profile_id", type: "uuid", required: true, constraints: "owner only" },
      { name: "font_scale", type: "numeric", required: false, constraints: "85..200%" },
      { name: "high_contrast", type: "boolean", required: false, constraints: "default false" },
      { name: "voice_guide_enabled", type: "boolean", required: false, constraints: "default false" },
    ],
  },
  {
    name: "guide_tours",
    descriptionFr: "Parcours guidés textuels et pédagogiques.",
    descriptionEn: "Text-based guided tours and walkthroughs.",
    auth: "Lecture publique si publiée ; écriture admin.",
    fields: [
      { name: "code", type: "text", required: true, constraints: "unique" },
      { name: "title_fr", type: "text", required: true, constraints: "not null" },
      { name: "title_en", type: "text", required: true, constraints: "not null" },
      { name: "estimated_minutes", type: "int", required: false, constraints: "" },
      { name: "is_published", type: "boolean", required: false, constraints: "default false" },
    ],
  },
  {
    name: "guide_tour_steps",
    descriptionFr: "Étapes des visites guidées.",
    descriptionEn: "Steps belonging to guided tours.",
    auth: "Lecture publique si publiée ; écriture admin.",
    fields: [
      { name: "tour_id", type: "uuid", required: true, constraints: "references guide_tours" },
      { name: "step_order", type: "int", required: true, constraints: "not null" },
      { name: "title_fr", type: "text", required: true, constraints: "not null" },
      { name: "title_en", type: "text", required: true, constraints: "not null" },
      { name: "body_fr", type: "text", required: true, constraints: "not null" },
      { name: "body_en", type: "text", required: true, constraints: "not null" },
    ],
  },
  {
    name: "city_projects",
    descriptionFr: "Projets municipaux soumis à la consultation publique.",
    descriptionEn: "Municipal projects opened for public consultation.",
    auth: "Lecture publique si publié ; écriture admin.",
    fields: [
      { name: "title", type: "text", required: true, constraints: "not null" },
      { name: "description", type: "text", required: true, constraints: "not null" },
      { name: "status", type: "text", required: false, constraints: "draft/published/closed" },
      { name: "voting_opens_at", type: "timestamptz", required: false, constraints: "" },
      { name: "voting_closes_at", type: "timestamptz", required: false, constraints: "" },
    ],
  },
  {
    name: "city_project_votes",
    descriptionFr: "Votes des citoyens vérifiés sur les projets.",
    descriptionEn: "Verified-citizen votes on projects.",
    auth: "Citoyen vérifié propriétaire.",
    fields: [
      { name: "project_id", type: "uuid", required: true, constraints: "references city_projects" },
      { name: "citizen_id", type: "uuid", required: true, constraints: "filled from my_citizen_id()" },
      { name: "vote", type: "text", required: true, constraints: "for/against/abstain depending on workflow" },
    ],
  },
  {
    name: "city_project_comments",
    descriptionFr: "Commentaires publics sur les projets de ville.",
    descriptionEn: "Public comments on city projects.",
    auth: "Citoyen vérifié propriétaire + modération admin.",
    fields: [
      { name: "project_id", type: "uuid", required: true, constraints: "references city_projects" },
      { name: "author_id", type: "uuid", required: true, constraints: "references profiles" },
      { name: "body", type: "text", required: true, constraints: "not null" },
    ],
  },
  {
    name: "report_upvotes",
    descriptionFr: "Votes de soutien sur les signalements publics.",
    descriptionEn: "Support votes on public reports.",
    auth: "Citoyen vérifié propriétaire.",
    fields: [
      { name: "report_id", type: "uuid", required: true, constraints: "references reports" },
      { name: "citizen_id", type: "uuid", required: true, constraints: "filled from my_citizen_id()" },
    ],
  },
  {
    name: "service_reviews",
    descriptionFr: "Avis et notes laissés sur les services et établissements.",
    descriptionEn: "Ratings and reviews left on services and buildings.",
    auth: "Lecture publique ; auteur authentifié pour écrire ; admin pour modérer/supprimer.",
    fields: [
      { name: "service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "building_id", type: "uuid", required: false, constraints: "references buildings" },
      { name: "author_id", type: "uuid", required: false, constraints: "default auth.uid(); server-managed" },
      { name: "rating", type: "smallint", required: true, constraints: "check between 1 and 5" },
      { name: "comment", type: "text", required: false, constraints: "1..1500 chars trimmed" },
    ],
  },
  {
    name: "api_keys",
    descriptionFr: "Clés API développeur générées côté client et stockées uniquement hachées.",
    descriptionEn: "Developer API keys generated client-side and stored only as hashes.",
    auth: "Propriétaire authentifié uniquement.",
    fields: [
      { name: "name", type: "text", required: true, constraints: "1..80 chars" },
      { name: "key_prefix", type: "text", required: true, constraints: "8 chars shown in UI" },
      { name: "key_hash", type: "text", required: true, constraints: "unique SHA-256 hex" },
      { name: "scopes", type: "text[]", required: true, constraints: "default {read}" },
      { name: "last_used_at", type: "timestamptz", required: false, constraints: "nullable server-tracked" },
      { name: "revoked_at", type: "timestamptz", required: false, constraints: "nullable revocation timestamp" },
    ],
  },
]

const rpcDefinitions = [
  {
    id: "complete_citizen_profile",
    method: "POST" as const,
    path: "/rest/v1/rpc/complete_citizen_profile",
    descriptionFr: "Crée la fiche citoyenne du compte connecté.",
    descriptionEn: "Creates the citizen profile for the signed-in account.",
    auth: "JWT utilisateur",
    role: "Citoyen connecté",
    bodyFields: [
      { name: "p_birth_date", type: "date", required: true, constraints: "date <= current_date" },
      { name: "p_sector_id", type: "uuid", required: true, constraints: "references sectors" },
      { name: "p_sponsor_cin", type: "text", required: false, constraints: "required for minors" },
    ],
    response: `{"id":"citizen-uuid"}`,
  },
  {
    id: "submit_cin_verification",
    method: "POST" as const,
    path: "/rest/v1/rpc/submit_cin_verification",
    descriptionFr: "Soumet un CIN et renvoie un statut.",
    descriptionEn: "Submits a CIN and returns a status.",
    auth: "JWT utilisateur",
    role: "Citoyen connecté",
    bodyFields: [
      { name: "p_cin", type: "text", required: true, constraints: "format NT-CIN-######" },
      { name: "p_image_path", type: "text", required: false, constraints: "" },
    ],
    response: `"validated"`,
  },
  {
    id: "decide_cin_verification",
    method: "POST" as const,
    path: "/rest/v1/rpc/decide_cin_verification",
    descriptionFr: "Décision manuelle d'un administrateur sur une vérification.",
    descriptionEn: "Manual administrator decision on a verification.",
    auth: "JWT utilisateur",
    role: "Administrateur",
    bodyFields: [
      { name: "p_verification_id", type: "uuid", required: true, constraints: "references citizen_verifications" },
      { name: "p_approve", type: "boolean", required: true, constraints: "" },
      { name: "p_reason", type: "text", required: false, constraints: "used on rejection" },
    ],
    response: `{"ok":true}`,
  },
  {
    id: "search_services",
    method: "GET" as const,
    path: "/rest/v1/rpc/search_services",
    descriptionFr: "Recherche plein texte sur les services publics.",
    descriptionEn: "Full-text search over public services.",
    auth: "Clé publique ou JWT",
    role: "Public",
    bodyFields: [],
    response: `[{"id":"service-id","name":"Urbanisme"}]`,
  },
  {
    id: "search_news",
    method: "GET" as const,
    path: "/rest/v1/rpc/search_news",
    descriptionFr: "Recherche plein texte sur les actualités publiées.",
    descriptionEn: "Full-text search over published news.",
    auth: "Clé publique ou JWT",
    role: "Public",
    bodyFields: [],
    response: `[{"id":"news-id","title":"Alerte chaleur"}]`,
  },
  {
    id: "stats_service",
    method: "GET" as const,
    path: "/rest/v1/rpc/stats_service",
    descriptionFr: "Agrégats d'activité pour un service donné.",
    descriptionEn: "Activity aggregates for one service.",
    auth: "JWT utilisateur",
    role: "Membre du service ou admin",
    bodyFields: [],
    response: `{"requests":42,"reports":12}`,
  },
  {
    id: "rebuild_knowledge_base",
    method: "POST" as const,
    path: "/rest/v1/rpc/rebuild_knowledge_base",
    descriptionFr: "Reconstruit la base de connaissance publiée.",
    descriptionEn: "Rebuilds the published knowledge base.",
    auth: "JWT utilisateur",
    role: "Administrateur",
    bodyFields: [],
    response: `{"updated":128}`,
  },
  {
    id: "propose_ai_content",
    method: "POST" as const,
    path: "/rest/v1/rpc/propose_ai_content",
    descriptionFr: "Ajoute une proposition de contenu IA à valider.",
    descriptionEn: "Creates a proposed AI-generated content entry.",
    auth: "JWT utilisateur",
    role: "Administrateur / admin de service",
    bodyFields: [
      { name: "p_target_table", type: "text", required: true, constraints: "table cible" },
      { name: "p_target_id", type: "uuid", required: true, constraints: "record id" },
      { name: "p_model", type: "text", required: true, constraints: "" },
      { name: "p_description", type: "text", required: true, constraints: "" },
    ],
    response: `{"ok":true}`,
  },
  {
    id: "apply_ai_content",
    method: "POST" as const,
    path: "/rest/v1/rpc/apply_ai_content",
    descriptionFr: "Approuve ou rejette un contenu IA proposé.",
    descriptionEn: "Approves or rejects proposed AI content.",
    auth: "JWT utilisateur",
    role: "Administrateur",
    bodyFields: [
      { name: "p_id", type: "uuid", required: true, constraints: "references ai_generated_content" },
      { name: "p_approve", type: "boolean", required: true, constraints: "" },
    ],
    response: `{"ok":true}`,
  },
  {
    id: "send_newsletter_digest",
    method: "POST" as const,
    path: "/rest/v1/rpc/send_newsletter_digest",
    descriptionFr: "Crée les notifications digest de newsletter.",
    descriptionEn: "Creates newsletter digest notifications.",
    auth: "JWT utilisateur",
    role: "Admin ou automatisation",
    bodyFields: [{ name: "p_frequency", type: "text", required: false, constraints: "instant/daily/weekly" }],
    response: `{"created":12}`,
  },
  {
    id: "set_my_home_sector",
    method: "POST" as const,
    path: "/rest/v1/rpc/set_my_home_sector",
    descriptionFr: "Met à jour le secteur de résidence du citoyen courant.",
    descriptionEn: "Updates the current citizen home sector.",
    auth: "JWT utilisateur",
    role: "Citoyen connecté",
    bodyFields: [{ name: "p_sector_id", type: "uuid", required: true, constraints: "references sectors" }],
    response: `{"ok":true}`,
  },
  {
    id: "create_heatwave_alert",
    method: "POST" as const,
    path: "/rest/v1/rpc/create_heatwave_alert",
    descriptionFr: "Crée une alerte canicule avec ciblage secteur ou ville entière.",
    descriptionEn: "Creates a heatwave alert for one sector or the whole city.",
    auth: "JWT utilisateur",
    role: "Administrateur / admin de service",
    bodyFields: [
      { name: "p_title", type: "text", required: true, constraints: "" },
      { name: "p_summary", type: "text", required: true, constraints: "" },
      { name: "p_sector_id", type: "uuid", required: false, constraints: "nullable when all sectors" },
      { name: "p_service_id", type: "uuid", required: true, constraints: "references services" },
      { name: "p_recommended_actions", type: "text[]", required: true, constraints: "array of guidance strings" },
      { name: "p_all_sectors", type: "boolean", required: false, constraints: "default false" },
    ],
    response: `{"id":"danger-id"}`,
  },
  {
    id: "dispatch_heat_alert_notifications",
    method: "POST" as const,
    path: "/rest/v1/rpc/dispatch_heat_alert_notifications",
    descriptionFr: "Diffuse une alerte canicule aux citoyens ciblés.",
    descriptionEn: "Dispatches a heatwave alert to targeted citizens.",
    auth: "JWT utilisateur",
    role: "Administrateur / webhook serveur",
    bodyFields: [{ name: "p_alert_id", type: "uuid", required: true, constraints: "references dangers" }],
    response: `{"delivered":25}`,
  },
  {
    id: "my_city_project_comments",
    method: "GET" as const,
    path: "/rest/v1/rpc/my_city_project_comments",
    descriptionFr: "Exporte les commentaires de projets du compte courant.",
    descriptionEn: "Exports the current account project comments.",
    auth: "JWT utilisateur",
    role: "Compte courant",
    bodyFields: [],
    response: `[{"id":"comment-id","body":"..."}]`,
  },
]

const edgeDefinitions = [
  {
    id: "contact-submit",
    descriptionFr: "Formulaire public de contact avec rate limiting, stockage et email optionnel.",
    descriptionEn: "Public contact form with rate limiting, storage, and optional email.",
    auth: "Clé publique",
    role: "Public",
    bodyFields: [
      { name: "name", type: "string", required: true, constraints: "2..100 chars" },
      { name: "email", type: "string", required: true, constraints: "email <= 254 chars" },
      { name: "message", type: "string", required: true, constraints: "10..5000 chars" },
      { name: "website", type: "string", required: false, constraints: "honeypot antispam" },
    ],
    response: `{"ok":true,"emailSent":true}`,
  },
  {
    id: "admin-data",
    descriptionFr: "API serveur réservée aux administrateurs pour utilisateurs et messages de contact.",
    descriptionEn: "Server-side admin API for users and contact messages.",
    auth: "JWT utilisateur",
    role: "Administrateur",
    bodyFields: [
      { name: "action", type: "string", required: true, constraints: "list-users | set-role | list-contact | set-contact-status" },
      { name: "query", type: "string", required: false, constraints: "" },
      { name: "role", type: "string", required: false, constraints: "admin/member" },
      { name: "userId", type: "string", required: false, constraints: "" },
      { name: "status", type: "string", required: false, constraints: "new/read/closed" },
    ],
    response: `{"users":[]}`,
  },
  {
    id: "openrouter-chat",
    descriptionFr: "Assistant IA texte connecté à OpenRouter et aux données publiées.",
    descriptionEn: "Text AI assistant using OpenRouter and published data.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [
      { name: "message", type: "string", required: true, constraints: "1..4000 chars" },
      { name: "grounding", type: "string", required: false, constraints: "<= 12000 chars" },
      { name: "conversationId", type: "string", required: false, constraints: "existing conversation id" },
    ],
    response: `{"answer":"...","conversationId":"..."}`,
  },
  {
    id: "gemini-chat",
    descriptionFr: "Assistant texte Gemini guidé par la base de connaissance publiée.",
    descriptionEn: "Gemini text assistant grounded in published knowledge.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [
      { name: "message", type: "string", required: true, constraints: "1..4000 chars" },
      { name: "language", type: "string", required: false, constraints: "fr/en" },
      { name: "knowledge", type: "string", required: true, constraints: "1..60000 chars" },
      { name: "history", type: "array", required: false, constraints: "max 12 items" },
    ],
    response: `{"answer":"...","sourceUrls":[]}`,
  },
  {
    id: "gemini-voice-chat",
    descriptionFr: "Assistant vocal Gemini avec transcription et réponse courte.",
    descriptionEn: "Gemini voice assistant with transcript and concise answer.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [
      { name: "audioBase64", type: "string", required: true, constraints: "base64 WAV <= 30 sec" },
      { name: "knowledge", type: "string", required: true, constraints: "1..60000 chars" },
      { name: "history", type: "array", required: false, constraints: "max 12 items" },
      { name: "language", type: "string", required: false, constraints: "BCP-47 tag" },
    ],
    response: `{"transcript":"...","answer":"..."}`,
  },
  {
    id: "translate-content",
    descriptionFr: "Traduit un contenu public dans six langues ou exécute un batch planifié.",
    descriptionEn: "Translates public content into six locales or runs a scheduled batch.",
    auth: "JWT utilisateur",
    role: "Compte connecté / automatisation",
    bodyFields: [
      { name: "sourceLocale", type: "string", required: false, constraints: "auto/fr/en/mg/mfe/rcf/x-nova" },
      { name: "fields", type: "object", required: false, constraints: "field map to translate" },
      { name: "mode", type: "string", required: false, constraints: "hourly for scheduled mode" },
    ],
    response: `{"translations":{}}`,
  },
  {
    id: "dispatch-heat-alert",
    descriptionFr: "Diffuse une alerte canicule via webhook ou administrateur authentifié.",
    descriptionEn: "Dispatches a heat alert via webhook or authenticated admin.",
    auth: "JWT utilisateur ou secret webhook",
    role: "Administrateur / serveur webhook",
    bodyFields: [
      { name: "dangerId", type: "string", required: false, constraints: "required for admin-triggered calls" },
      { name: "record", type: "object", required: false, constraints: "webhook payload" },
    ],
    response: `{"delivered":25}`,
  },
  {
    id: "account-delete",
    descriptionFr: "Supprime définitivement le compte courant après reconnexion récente.",
    descriptionEn: "Permanently deletes the current account after a recent sign-in.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [],
    response: `{"ok":true}`,
  },
  {
    id: "device-login-alert",
    descriptionFr: "Envoie une alerte email lors d'une nouvelle connexion appareil.",
    descriptionEn: "Sends an email alert for a newly seen login device.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [{ name: "deviceId", type: "string", required: true, constraints: "UUID browser identifier" }],
    response: `{"sent":true}`,
  },
]

const authDefinitions = [
  {
    id: "auth-sign-up",
    method: "POST" as const,
    path: "/auth/v1/signup",
    descriptionFr: "Crée un compte Supabase public avec métadonnées de profil.",
    descriptionEn: "Creates a public Supabase account with profile metadata.",
    auth: "Clé publique",
    role: "Public",
    bodyFields: [
      { name: "email", type: "string", required: true, constraints: "" },
      { name: "password", type: "string", required: true, constraints: ">= 6 chars" },
      { name: "data", type: "object", required: false, constraints: "display_name, first_name, last_name, birth_date, sector_id, locale" },
    ],
    response: `{"user":{"id":"..."}}`,
  },
  {
    id: "auth-sign-in",
    method: "POST" as const,
    path: "/auth/v1/token?grant_type=password",
    descriptionFr: "Ouvre une session utilisateur et émet un JWT.",
    descriptionEn: "Signs a user in and returns a JWT session.",
    auth: "Clé publique",
    role: "Public",
    bodyFields: [
      { name: "email", type: "string", required: true, constraints: "" },
      { name: "password", type: "string", required: true, constraints: "" },
    ],
    response: `{"access_token":"eyJ...","refresh_token":"..."}`,
  },
  {
    id: "auth-user",
    method: "GET" as const,
    path: "/auth/v1/user",
    descriptionFr: "Renvoie le profil du JWT fourni.",
    descriptionEn: "Returns the profile behind the supplied JWT.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [],
    response: `{"id":"user-id","email":"..."}`,
  },
  {
    id: "auth-logout",
    method: "POST" as const,
    path: "/auth/v1/logout",
    descriptionFr: "Invalide la session courante côté client.",
    descriptionEn: "Invalidates the current client session.",
    auth: "JWT utilisateur",
    role: "Compte connecté",
    bodyFields: [],
    response: `{"message":"logged out"}`,
  },
]

function toRpcOperation(definition: (typeof rpcDefinitions)[number]): ApiOperation {
  const bodySource = body(definition.bodyFields)
  return {
    id: definition.id,
    group: "rpcs",
    resource: definition.id,
    title: definition.id,
    method: definition.method,
    path: definition.path,
    descriptionFr: definition.descriptionFr,
    descriptionEn: definition.descriptionEn,
    auth: definition.auth,
    role: definition.role,
    queryParams: definition.method === "GET"
      ? [
          { name: "filters", type: "string", required: false, descriptionFr: "Arguments RPC sous forme ligne par ligne, ex. p_limit=50", descriptionEn: "RPC arguments line by line, for example p_limit=50" },
        ]
      : [],
    bodyFields: definition.method === "GET" ? [] : definition.bodyFields,
    exampleRequestCurl: curl(definition.path, definition.method, definition.method !== "GET", bodySource),
    exampleRequestSupabaseJs: `const { data, error } = await supabase.rpc("${definition.id}", ${bodySource})`,
    exampleResponse: definition.response,
    errorCodes: definition.method === "GET" ? [...readErrors] : [...writeErrors],
    playground: { kind: "rpc", defaultSelect: "", defaultFilters: "", defaultOrder: "", defaultLimit: "", defaultBody: bodySource, confirmWrite: definition.method !== "GET" },
    searchableText: `${definition.id} ${definition.descriptionFr} ${definition.descriptionEn}`,
  }
}

function toEdgeOperation(definition: (typeof edgeDefinitions)[number]): ApiOperation {
  const bodySource = body(definition.bodyFields)
  return {
    id: definition.id,
    group: "functions",
    resource: definition.id,
    title: definition.id,
    method: "POST",
    path: `/functions/v1/${definition.id}`,
    descriptionFr: definition.descriptionFr,
    descriptionEn: definition.descriptionEn,
    auth: definition.auth,
    role: definition.role,
    queryParams: [],
    bodyFields: definition.bodyFields,
    exampleRequestCurl: curl(`/functions/v1/${definition.id}`, "POST", definition.bodyFields.length > 0, bodySource),
    exampleRequestSupabaseJs: `const { data, error } = await supabase.functions.invoke("${definition.id}", { body: ${bodySource} })`,
    exampleResponse: definition.response,
    errorCodes: [...writeErrors],
    playground: { kind: "edge", defaultSelect: "", defaultFilters: "", defaultOrder: "", defaultLimit: "", defaultBody: bodySource, confirmWrite: true },
    searchableText: `${definition.id} ${definition.descriptionFr} ${definition.descriptionEn}`,
  }
}

function toAuthOperation(definition: (typeof authDefinitions)[number]): ApiOperation {
  const bodySource = body(definition.bodyFields)
  return {
    id: definition.id,
    group: "auth",
    resource: definition.id,
    title: definition.id,
    method: definition.method,
    path: definition.path,
    descriptionFr: definition.descriptionFr,
    descriptionEn: definition.descriptionEn,
    auth: definition.auth,
    role: definition.role,
    queryParams: [],
    bodyFields: definition.method === "GET" ? [] : definition.bodyFields,
    exampleRequestCurl: curl(definition.path, definition.method, definition.method !== "GET", bodySource),
    exampleRequestSupabaseJs: definition.id === "auth-sign-up"
      ? `const { data, error } = await supabase.auth.signUp({ email, password, options: { data } })`
      : definition.id === "auth-sign-in"
        ? `const { data, error } = await supabase.auth.signInWithPassword({ email, password })`
        : definition.id === "auth-user"
          ? `const { data, error } = await supabase.auth.getUser()`
          : `const { error } = await supabase.auth.signOut()`,
    exampleResponse: definition.response,
    errorCodes: [...writeErrors],
    playground: { kind: "auth", defaultSelect: "", defaultFilters: "", defaultOrder: "", defaultLimit: "", defaultBody: bodySource, confirmWrite: definition.method !== "GET" },
    searchableText: `${definition.id} ${definition.descriptionFr} ${definition.descriptionEn}`,
  }
}

export const apiGroups = [
  {
    id: "tables" as const,
    titleFr: "Tables REST",
    titleEn: "REST tables",
    descriptionFr: "Ressources PostgREST exposées sous /rest/v1/<table>.",
    descriptionEn: "PostgREST resources exposed under /rest/v1/<table>.",
  },
  {
    id: "rpcs" as const,
    titleFr: "RPC SQL",
    titleEn: "SQL RPCs",
    descriptionFr: "Fonctions SQL exposées sous /rest/v1/rpc/<fn>.",
    descriptionEn: "SQL functions exposed under /rest/v1/rpc/<fn>.",
  },
  {
    id: "functions" as const,
    titleFr: "Edge Functions",
    titleEn: "Edge Functions",
    descriptionFr: "Fonctions Deno exposées sous /functions/v1/<fn>.",
    descriptionEn: "Deno functions exposed under /functions/v1/<fn>.",
  },
  {
    id: "auth" as const,
    titleFr: "Auth",
    titleEn: "Auth",
    descriptionFr: "Points d'entrée Supabase Auth utilisés par l'application.",
    descriptionEn: "Supabase Auth entry points used by the app.",
  },
]

export const appFeatures: AppFeatureDoc[] = [
  {
    id: "citizen-space",
    titleFr: "Espace citoyen",
    titleEn: "Citizen space",
    summaryFr: "Portail public et personnel pour consulter les services, démarches et contenus de la ville.",
    summaryEn: "Public and personal portal for services, requests, and city content.",
    bulletsFr: ["Création de compte et connexion sécurisée.", "Consultation des services, actualités et bâtiments.", "Historique personnel des demandes et signalements."],
    bulletsEn: ["Account creation and secure sign-in.", "Browse services, news, and buildings.", "Personal history for requests and reports."],
  },
  {
    id: "agent-space",
    titleFr: "Espace agent",
    titleEn: "Agent workspace",
    summaryFr: "Boîte de traitement pour les demandes, signalements, statuts et synchronisations.",
    summaryEn: "Operations workspace for requests, reports, statuses, and sync jobs.",
    bulletsFr: ["Vue des demandes en attente par service.", "Suivi des signalements et des preuves.", "Synchronisation et indicateurs d'activité."],
    bulletsEn: ["Pending requests by service.", "Report handling and evidence review.", "Synchronization and activity indicators."],
  },
  {
    id: "admin-space",
    titleFr: "Console d'administration",
    titleEn: "Admin console",
    summaryFr: "Gestion des utilisateurs, rôles, contenus, alertes et validation de contenus IA.",
    summaryEn: "Manage users, roles, content, alerts, and AI-generated material.",
    bulletsFr: ["Attribution des rôles et contrôle des accès.", "Validation de contenu et modération.", "Pilotage global de la plateforme."],
    bulletsEn: ["Role assignment and access control.", "Content validation and moderation.", "Global platform oversight."],
  },
  {
    id: "requests-reports",
    titleFr: "Demandes et signalements",
    titleEn: "Requests and reports",
    summaryFr: "Deux flux distincts : demandes administratives et signalements de terrain.",
    summaryEn: "Two distinct flows: administrative requests and field reports.",
    bulletsFr: ["Numéro unique, SLA et historique de statut.", "Preuves et regroupement des signalements.", "Notifications temps réel pour les cas critiques."],
    bulletsEn: ["Unique IDs, SLA, and status history.", "Evidence and report clustering.", "Real-time notifications for critical cases."],
  },
  {
    id: "dangers-map-chatbot",
    titleFr: "Dangers, carte et chatbot",
    titleEn: "Hazards, map, and chatbot",
    summaryFr: "Alertes publiques, carte hexagonale et assistants textuels/vocaux.",
    summaryEn: "Public alerts, the hex map, and text/voice assistants.",
    bulletsFr: ["Alertes ciblées par secteur ou ville entière.", "Base de connaissance publiée et quotas IA.", "Navigation et orientation via la carte interactive."],
    bulletsEn: ["Target alerts per sector or city-wide.", "Published knowledge base and AI quotas.", "Navigation and orientation through the interactive map."],
  },
  {
    id: "reputation-voting-newsletters-accessibility",
    titleFr: "Réputation, vote, newsletters et accessibilité",
    titleEn: "Reputation, voting, newsletters, and accessibility",
    summaryFr: "Fonctionnalités communautaires, consultation publique, abonnements et assistance vocale.",
    summaryEn: "Community features, public consultation, subscriptions, and voice assistance.",
    bulletsFr: ["Votes de réputation, avis et soutien aux signalements.", "Votes/commentaires sur les projets municipaux.", "Préférences de contraste, taille de police et guide vocal."],
    bulletsEn: ["Reputation votes, reviews, and support votes on reports.", "Votes/comments on municipal projects.", "Contrast, font-size, and voice-guide preferences."],
  },
]

export const apiOperations: ApiOperation[] = [
  ...apiModels.flatMap(tableOps),
  ...rpcDefinitions.map(toRpcOperation),
  ...edgeDefinitions.map(toEdgeOperation),
  ...authDefinitions.map(toAuthOperation),
]
