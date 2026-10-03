# Nova Terra — Master Plan

> **Single source of truth.** Every new table, feature, route or decision is added here *first*, then built.
> Source requirements: [REQUESTS.md](./REQUESTS.md). Stack: React 19 + Vite + Tailwind 4 + React Query + react-hook-form/zod + Supabase (Postgres, Auth, Storage, Edge Functions) + OpenRouter (chatbot) — see [SUPABASE.md](./SUPABASE.md), [OPENROUTER.md](./OPENROUTER.md).

**How to keep this plan in sync**

1. Scope change → edit this file in the same commit as the code.
2. Tick the checkbox (`[x]`) in §9 when a task is merged. Never delete a task; mark `~~dropped~~` + reason.
3. Add a line to §12 *Changelog* for every schema or scope change.
4. SQL files in `supabase/nova-terra/` must always match §3 (tables) and §4 (seed).

---

## 1. Product summary

Nova Terra is a fictional futuristic city. The web app has three spaces:

| Space                             | Who                    | Purpose                                                                             |
| --------------------------------- | ---------------------- | ----------------------------------------------------------------------------------- |
| **Public / Citizen portal** | visitors, citizens     | home, services, news, interactive hex map, chatbot, dangers, requests, reports      |
| **Agent workspace** (D19)   | agents, service admins | inbox of requests + reports, validation, evidence, stats, API sync status           |
| **Admin console**           | general admin          | users, roles, services, content moderation, audit logs, AI-generated content review |

Extra features from "OTHERS INFORMATIONS": voice-to-text reports, support call, chatbot (paths/documents/steps), fictional-CIN verification by AI, reputation points, minors with a sponsor, grouping of reports by type/location, comments on announcements, admin-moderated announcements, newsletters by topic.

---

## 2. Decisions taken (defaults — change here if the team disagrees)

These answer REQUESTS.md §8 so nothing blocks development.

| #  | Question                 | Default decision                                                                                                                                                        |
| -- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1  | Auth identifier          | Email + password (Supabase Auth). Phone stored in profile, not used to log in.                                                                                          |
| 2  | Full address mandatory?  | No. Only**sector** (+ optional building) is asked.                                                                                                                |
| 3  | 2FA for agents           | Not in MVP (flag`profiles.requires_2fa` reserved).                                                                                                                    |
| 4  | Anonymous contact        | Allowed via the existing`contact_messages` table (rate-limited). A *request* requires an account. `~~dropped~~` + no need for anonymous contact                 |
| 5  | Attachments              | `image/jpeg, image/png, image/webp, application/pdf`, ≤ 5 MB, max 5 per request.                                                                                     |
| 6  | Target delays            | `services.default_sla_hours` (24–120 h) → `requests.due_at`.                                                                                                      |
| 7  | Cameras / satellites     | **Simulated**: ai AI agent generate random reports, and the admin will validate it or not, the admin on the service will validate it or not. Never live streams. |
| 8  | Transport data           | Public (`visibility = 'public'`) except `personal` vehicles (owner only).                                                                                           |
| 9  | Who validates AI content | General admin (city content) / service admin (own service).                                                                                                             |
| 10 | Chatbot creates reports  | Yes,**only after explicit user confirmation** (two-step).                                                                                                         |
| 11 | Chat history             | Optional, user opt-in (`chat_sessions.keep_history`).                                                                                                                 |
| 12 | DB                       | Supabase (Postgres).                                                                                                                                                    |
| 13 | F22 difficulty           | **High** (Notion property wins; text said "Facile").                                                                                                              |
| 14 | Verified-only reporting  | Only`kyc_status = 'verified'` citizens can create **reports**; unverified can read, ask the chatbot, send requests for information, vote nothing.               |
| 15 | Fictional data flag      | Every seeded row has`is_fictional = true` where meaningful; the whole dataset is re-creatable by script.                                                              |
| 16 | Visually impaired profile ("mal voyant") | Profile option → **high-contrast theme** + **adjustable font size** (85–200 %), saved in `accessibility_preferences`, applied instantly and on every device after login. Also available to visitors (localStorage) without an account. |
| 17 | "Mal entendant" profile (as specified) | Profile option → an **AI voice reads the screen aloud** (text-to-speech) and the user **answers by speaking** (speech-to-text) and **navigates by voice**. ⚠ See note below the table. |
| 18 | Voice guide | Any user can enable a **voice guide** that explains where they are, how to move through the app, and which voice commands exist. |
| 19 | Textual guided tour | Step-by-step **text tour** (spotlight + popover, keyboard accessible) per area of the app; content stored in DB (`guide_tours`, `guide_tour_steps`), role-aware, resumable, replayable from the help menu; optional voice narration of each step. |

> ⚠ **Terminology note (to confirm with the team).** Reading the screen aloud and answering by voice is what a *blind / low-vision* user needs; a *hard-of-hearing* user is better served by captions and visual alerts. We implement the behaviour exactly as specified, but the settings are **independent toggles** (§5.5), so labels can be renamed without code changes. We also add hearing-oriented features (captions, visual alerts, no audio-only information) under the same "mal entendant" option so that profile also works for its literal meaning.

---

## 3. Database design

### 3.1 Conventions

- Schema `public`. PKs are `uuid default gen_random_uuid()`; **seed rows use stable fixed UUIDs** (pattern `00000000-0000-4000-8000-0000000000NN` per table family, see §4.2).
- Every table: `created_at timestamptz default now()`, `updated_at` (trigger `set_updated_at`). Soft delete (`deleted_at`) on `profiles`, `citizens`, `news`, `reports`, `requests`.
- Status/priority/category = **Postgres enums** (never free text).
- Every table: `GRANT` + `ENABLE ROW LEVEL SECURITY` + policies (the 3-step rule from `supabase/schema.sql` header). Idempotent (`create … if not exists`, `drop policy if exists`).
- Data classification (REQUESTS §5.4) stored as comment on each table: `public / internal / confidential / sensitive`.
- Provenance columns on imported/AI content: `source_type`, `source_ref`, `confidence_score numeric(3,2)`, `validation_status`, `validated_by`, `validated_at`, `ai_version`.

### 3.2 Enums

```
user_role            citizen | agent | service_admin | general_admin | system
account_status       pending | active | suspended | disabled
kyc_status           none | pending | verified | rejected
priority_level       low | medium | high | critical
request_status       new | received | to_qualify | assigned | in_progress | waiting_info | resolved | closed | rejected | cancelled
report_status        draft | received | to_verify | validated | rejected | assigned | in_progress | resolved | archived
report_source        citizen | agent | chatbot | camera | satellite | external_api | import
evidence_source      citizen | camera | satellite | agent | api
validation_status    pending | validated | rejected
visibility_level     public | internal | confidential | sensitive
service_status       open | temporarily_closed | suspended | hidden
building_type        administrative | residential | hospital | school | security | industrial | energy | telecom | public_place | transport_hub
building_status      operational | temporarily_closed | under_maintenance | restricted
transport_type       hover_tram | maglev | sky_pod | shuttle | drone_taxi | cargo_drone | personal_hoverbike | ferry | Aethelon Apex (car)| Vortex Phantom (Motorcyle) 
transport_status     active | idle | maintenance | out_of_service
danger_severity      info | low | moderate | high | extreme
danger_status        draft | active | archived
news_importance      normal | important | urgent
sync_status          running | success | partial | failed
ui_theme             default | high_contrast_light | high_contrast_dark | yellow_on_black
accessibility_need   low_vision | hard_of_hearing
voice_action_type    navigate | click | read | fill | submit | help | stop | open_tour
notification_type    request_update | report_update | news | danger_alert | system | newsletter | reputation
```

### 3.3 Tables (39) — each gets **10 seed rows**

Legend: **PK** primary key · **FK→** foreign key · `?` nullable.

#### A. Geography & organisation

| # | Table                 | Key columns                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 | `sectors`           | id,`code` (unique, e.g. `S-01`), name, description, `hex_q int`, `hex_r int` (axial coords, unique together), `x numeric`, `y numeric` (reference-plane position, editable by drag), `color`, `activity_level smallint 0–100`, `is_active`                                                                                                                                                                                   |
| 2 | `departments`       | id, name, code (unique), description, head_title                                                                                                                                                                                                                                                                                                                                                                                                |
| 3 | `buildings`         | id, name,`type building_type`, `sector_id FK→sectors`, `x`, `y`, `lat`, `lng` (fictional), address, `opening_hours jsonb`, `accessibility jsonb`, `status building_status`, description, image_url?, `is_fictional`                                                                                                                                                                                                        |
| 4 | `services`          | id,`department_id FK→departments`, `building_id FK→buildings`, name, slug (unique), category, description, address, phone, email, `opening_hours jsonb`, `closing_days text[]`, `languages text[]`, `procedures jsonb` (steps), `required_documents text[]`, `fees text?`, `booking_url?`, `default_sla_hours int`, `status service_status`, `published_at?`, `is_emergency bool`, `last_updated_by FK→profiles` |
| 5 | `service_relations` | id,`from_service_id`, `to_service_id`, `relation_type` (`escalates_to`, `collaborates_with`, `supervises`), note — "relations between services"                                                                                                                                                                                                                                                                                    |
| 6 | `transports`        | id, code (unique),`type transport_type`, `plate?`, `visibility` (`public`/`personal`), `status transport_status`, `sector_id`, `x`, `y`, `capacity int`, `route_name?`, `owner_service_id FK→services?`, `owner_citizen_id FK→citizens?`, `last_seen_at`                                                                                                                                                          |

#### B. Identity, roles & reputation

| #  | Table                                    | Key columns                                                                                                                                                                                                                                                                                                                                                    |
| -- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7  | `profiles` *(extends starter table)* | id**PK = FK→auth.users**, `first_name`, `last_name`, display_name, avatar_url, phone?, `role user_role` (server-set only), `account_status`, `primary_service_id FK→services?`, `allowed_sector_ids uuid[]`, `notification_prefs jsonb`, `locale`, `last_login_at`, `deleted_at?`                                                  |
| 8  | `citizens`                             | id,`profile_id FK→profiles` (unique), `sector_id FK→sectors`, `building_id FK→buildings?`, `birth_date`, `is_minor generated`, `sponsor_citizen_id FK→citizens?` (required if minor), `cin_number` (fictional, unique), `kyc_status`, `reputation_points int default 0`, `reputation_level`, `consent_terms_at`, `consent_data_at` |
| 9  | `service_members`                      | id,`profile_id`, `service_id`, `member_role` (`agent`/`admin`), `can_validate_reports bool`, `granted_by`, `granted_at`, `revoked_at?` — admin per service (police, fire, ambulance, municipal…)                                                                                                                                           |
| 10 | `permissions`                          | id,`code` (unique, e.g. `report.validate`), description, resource, action (`read/create/update/validate/delete`)                                                                                                                                                                                                                                         |
| 11 | `role_permissions`                     | id,`role user_role`, `permission_id`, `scope` (`own/service/all`) — D09 matrix, deny by default                                                                                                                                                                                                                                                       |
| 12 | `citizen_verifications`                | id,`citizen_id`, `cin_image_path` (private bucket), `ai_model`, `ai_score numeric`, `ai_extracted jsonb`, `status validation_status`, `reviewed_by?`, `rejection_reason?`, `submitted_at`, `decided_at?` — AI checks the fictional CIN against a fixed model                                                                              |
| 13 | `reputation_votes`                     | id,`from_citizen_id`, `to_citizen_id`, `points smallint (-1/+1/+2…)`, `reason?`, **unique(from,to)**, check `from <> to`. *Users vote on people, never on reports.*                                                                                                                                                                         |

#### C. Requests (D04 / F22)

| #  | Table                      | Key columns                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14 | `requests`               | id,`tracking_number` (unique, `NT-REQ-2026-0001` via sequence), `requester_id FK→profiles`, `service_id`, `assigned_agent_id?`, category, subject, description, `priority`, `status request_status`, `urgency_flag`, `due_at`, `satisfaction smallint 1–5?`, `closed_at?`, `resolution_note?` (**required** when status = resolved/closed — check constraint), `source` (`web`/`chatbot`/`support_call`) |
| 15 | `request_comments`       | id,`request_id`, `author_id`, `body`, `is_internal bool` (internal never visible to citizen via RLS), `attachments jsonb`                                                                                                                                                                                                                                                                                                               |
| 16 | `request_status_history` | id,`request_id`, `from_status?`, `to_status`, `changed_by`, `reason?`, `changed_at` (filled by trigger)                                                                                                                                                                                                                                                                                                                               |

#### D. Reports (signalements)

| #  | Table                     | Key columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17 | `report_clusters`       | id, title,`category`, `sector_id?`, `building_id?`, `report_count` (maintained), `centroid_x`, `centroid_y`, `cluster_key` (e.g. `power_outage@S-03`) — grouping by common type/location                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 18 | `reports`               | id,`report_number` (unique `NT-REP-2026-0001`), title, description, `category` (`infrastructure/safety/health/environment/transport/noise/other`), `sector_id`, `building_id?`, `x?`, `y?`, `observed_at`, `source report_source`, `reporter_citizen_id?`, `reporter_system?`, `service_id` (auto-routed by category+sector), `assigned_agent_id?`, `priority`, `status report_status`, `confidence_score`, `facts jsonb` (facts observed), `voice_transcript?`, `transcript_reviewed bool`, `cluster_id?`, `validated_by?`, `validated_at?`, `resolved_at?`, `is_public bool` (only after validation) |
| 19 | `report_evidence`       | id,`report_id`, `source evidence_source` (**camera/satellite separated from citizen proofs**), `file_path` (private bucket), `mime_type`, `captured_at`, `confidence_score`, `validation_status`, `validated_by?`, `visibility` (default `confidential`; camera/satellite = `sensitive`), `alt_text`                                                                                                                                                                                                                                                                                                                       |
| 20 | `report_status_history` | same shape as 16 for reports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

#### E. Content & communication

| #  | Table                                           | Key columns                                                                                                                                                                                                                                                                                              |
| -- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21 | `news`                                        | id, slug, title, summary, body, category, cover_image_url,`service_id` (issuer), `author_id`, `importance`, `status` (`draft/pending_review/published/archived`), `published_at`, `valid_until?`, `affected_sector_ids uuid[]`, `reviewed_by?` (announcements are regulated by admins) |
| 22 | `news_comments`                               | id,`news_id`, `author_id`, body, `status` (`visible/hidden`), `moderated_by?`                                                                                                                                                                                                                  |
| 23 | `newsletter_topics`                           | id, code (`safety`, `transport`, `energy`, `health`, `culture`, `urbanism`, `environment`, `education`, `emergency`, `city_hall`), label, description                                                                                                                                |
| 24 | `newsletter_subscriptions`                    | id,`profile_id`, `topic_id`, `frequency` (`instant/daily/weekly`), `is_active`, unique(profile, topic)                                                                                                                                                                                         |
| 25 | `notifications` *(starter table, extended)* | id,`user_id`, `type notification_type`, title, body, `entity_type`, `entity_id`, `read_at?`, `link_url`                                                                                                                                                                                      |
| 26 | `support_calls`                               | id,`caller_id?`, `service_id`, `agent_id?`, `status` (`requested/connected/ended/missed`), `started_at`, `ended_at?`, `duration_s`, `summary?`, `created_request_id?` — "call with a support" (simulated)                                                                           |

#### F. Dangers & observation

| #  | Table                      | Key columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 27 | `dangers`                | id, slug, title,`severity`, `status`, summary, `affected_sector_ids`, `valid_from`, `valid_until?`, `recommended_actions text[]`, `forbidden_actions text[]`, `emergency_contacts jsonb`, `assembly_building_ids uuid[]`, `protocol_steps jsonb` (ordered: identify → confirm → inform → shelter → zones → coordinate → update → close), `source`, `responsible_service_id`, `validated_by`, `validated_at`, `procedure_version int`, `is_fictional_alert bool` |
| 28 | `cameras`                | id, code, name,`sector_id`, `building_id?`, `x`, `y`, `status`, `is_live_public bool default false`, `visibility sensitive`                                                                                                                                                                                                                                                                                                                                                              |
| 29 | `satellite_observations` | id,`satellite_code`, `observed_at`, `sector_id`, `x`, `y`, `image_path`, `analysis jsonb`, `confidence_score`, `validation_status`, `validated_by?`, `validated_at?`, `generated_report_id?`                                                                                                                                                                                                                                                                                   |

#### G. Platform, AI & traceability

| #  | Table                    | Key columns                                                                                                                                                                                                                             |
| -- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 30 | `audit_logs`           | id,`actor_id?`, `actor_type` (`user/system/api`), `action`, `entity_type`, `entity_id`, `old_value jsonb`, `new_value jsonb`, `reason?`, `ip_hash?`, `created_at` — insert-only (no update/delete grants)        |
| 31 | `api_synchronizations` | id,`source` (`nova_api`, `camera_feed`, `satellite_feed`), `started_at`, `finished_at?`, `status sync_status`, `items_imported`, `items_pending_validation`, `items_failed`, `error_log jsonb`, `external_ref?` |
| 32 | `chat_sessions`        | id,`profile_id?`, `channel` (`text/voice`), `keep_history bool`, `language`, `started_at`, `escalated_to_agent bool`                                                                                                      |
| 33 | `chat_messages`        | id,`session_id`, `role` (`user/assistant/system`), `content`, `sources jsonb` (links to service/news/danger pages), `confidence`, `pending_action jsonb?` (draft report/request awaiting confirmation), `created_at`    |
| 34 | `knowledge_base`       | id,`entity_type`, `entity_id`, title, content, url, `version int`, `is_published`, `embedding vector(1536)?` (optional pgvector), `content_hash` — versioned chatbot source, rebuilt from published rows only              |
| 35 | `ai_generated_content` | id,`target_table`, `target_id`, `model`, `prompt_version`, `payload jsonb`, `status validation_status`, `reviewed_by?`, `reviewed_at?` — human validation before publication (§4.3 REQUESTS)                          |

#### H. Accessibility, voice & guidance

| #  | Table | Key columns |
| -- | ----- | ----------- |
| 36 | `accessibility_preferences` | id, `profile_id FK→profiles` (**unique**), `needs accessibility_need[]`, `theme ui_theme default 'default'`, `font_scale numeric(3,2) default 1.00 check 0.85–2.00`, `line_spacing numeric(3,2)`, `reduce_motion bool`, `read_screen_aloud bool` (AI reads each page/section), `voice_navigation bool` (speak to navigate / answer), `voice_guide bool` (voice explains how to use the app), `tts_voice text?`, `tts_rate numeric(3,2) default 1.00`, `speech_lang text`, `captions bool` (text mirror of all voice output), `visual_alerts bool` (banner/flash instead of sound), `confirm_by_voice bool default true`, `tour_completed text[]` (tour codes) |
| 37 | `guide_tours` | id, `code` (unique), title, description, `audience user_role[]`, `route_scope text` (route prefix where it starts), `is_published`, `version int`, `estimated_minutes` |
| 38 | `guide_tour_steps` | id, `tour_id FK→guide_tours`, `step_order int` (unique with tour), `route text`, `target_selector text?` (`[data-tour="…"]`, null = centered), title, `body` (text shown), `voice_script text?` (spoken variant), `placement` (`top/bottom/left/right/center`), `locale text` |
| 39 | `voice_commands` | id, `code` (unique), `locale`, `phrases text[]` (utterances: "open the map", "ouvre la carte"…), `action voice_action_type`, `target text?` (route or `data-voice` id), `description`, `requires_confirmation bool`, `min_role user_role?` — admin-editable so commands evolve without redeploy |

> Starter tables `items` is dropped (demo). `ai_conversations / ai_messages / ai_usage` are **kept** only for quota (`ai_usage`); history moves to `chat_*`. `contact_messages` and `contact_rate_limits` kept for anonymous contact.
> **Total: 39 tables (+ 4 kept) → 390 seed rows minimum** (`guide_tour_steps` may exceed 10 so the full Welcome tour is seeded).

### 3.4 Key relations (ER overview)

```
departments 1─* services *─1 buildings *─1 sectors
services *─* services (service_relations)
auth.users 1─1 profiles 1─1 citizens *─1 sectors / buildings
citizens 1─* citizens (sponsor) ; citizens 1─* citizen_verifications
citizens *─* citizens (reputation_votes)
profiles *─* services (service_members)
user_role (enum) ─ role_permissions ─ permissions
profiles 1─* requests *─1 services ; requests 1─* request_comments / request_status_history
citizens/system 1─* reports *─1 sectors/buildings/services ; reports 1─* report_evidence / report_status_history
reports *─1 report_clusters
news 1─* news_comments ; profiles *─* newsletter_topics (subscriptions)
cameras / satellite_observations ─> reports (generated) ; evidence
dangers ─> sectors, buildings(assembly), services(responsible)
chat_sessions 1─* chat_messages ; knowledge_base ← services/news/dangers
profiles 1─1 accessibility_preferences ; guide_tours 1─* guide_tour_steps ; voice_commands (lookup)
audit_logs ← every sensitive write ; api_synchronizations ← imports
```

### 3.5 Functions & triggers

| Name                                                                                                           | Purpose                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `set_updated_at()`                                                                                           | generic trigger                                                                                                      |
| `handle_new_user()` *(extend)*                                                                             | creates`profiles` (role=`citizen`, status=`pending`) + `citizens` stub from `raw_user_meta_data`           |
| `current_role()` / `is_admin()` / `is_service_member(service_id)` / `can_validate_service(service_id)` | RLS helpers (`security definer`, `search_path=''`)                                                               |
| `next_tracking_number(prefix)` + sequences                                                                   | `NT-REQ-…`, `NT-REP-…`                                                                                         |
| `route_report_to_service()`                                                                                  | trigger: category + sector →`service_id`                                                                          |
| `log_request_status()` / `log_report_status()`                                                             | write history rows on status change                                                                                  |
| `enforce_close_requires_note()`                                                                              | check: resolved/closed needs`resolution_note`                                                                      |
| `enforce_minor_sponsor()`                                                                                    | minor ⇒ sponsor is an adult, verified citizen                                                                       |
| `enforce_report_verified_only()`                                                                             | insert on`reports` by citizen requires `kyc_status = 'verified'`                                                 |
| `enforce_validate_own_service()`                                                                             | only`service_members.can_validate_reports` of the report's service (or general admin) may set `validated`        |
| `apply_reputation_vote()`                                                                                    | updates`citizens.reputation_points` after a vote; forbids self-vote                                                |
| `refresh_cluster()`                                                                                          | assigns/updates`report_clusters.report_count`                                                                      |
| `audit_row_change()`                                                                                         | generic audit trigger on`profiles`, `service_members`, `role_permissions`, `reports`, `requests`, `news` |
| `search_services(q)`, `search_news(q)`                                                                     | `tsvector` + GIN full-text (French/English)                                                                        |
| `stats_service(service_id)`                                                                                  | RPC for agent dashboard KPIs                                                                                         |

### 3.6 Indexes

`requests(service_id,status,due_at)`, `requests(requester_id)`, `reports(service_id,status)`, `reports(sector_id)`, `reports(cluster_id)`, `report_evidence(report_id)`, `buildings(sector_id)`, `transports(sector_id,status)`, `news(status,published_at desc)`, GIN on `services/news` tsvector, `audit_logs(entity_type,entity_id,created_at desc)`, `notifications(user_id,read_at)`.

### 3.7 Row-Level Security (matrix mapped from D09)

Default = **deny**. Highlights:

- `sectors, buildings, services(published), news(published), dangers(active), transports(public), newsletter_topics, departments`: public `select`.
- `profiles`: own row read/update (cannot change `role`, `account_status`, `kyc_status`, points — column guard via trigger); service admins read members of their services; general admin all. *(Starter `profiles_select_all` is replaced: only `display_name/avatar/reputation` exposed through a `public_profiles` view.)*
- `requests`: requester reads own; agents/admins of `service_id` read/update; others none. `request_comments.is_internal = true` hidden from requester.
- `reports`: public sees only `is_public = true AND status in (validated,assigned,in_progress,resolved)`; reporter sees own; service members see their service; only verified citizens insert.
- `report_evidence`: never public; reporter sees own `citizen` evidence; camera/satellite evidence only service admins/general admin.
- `audit_logs`: select general admin (service admin: limited to own service entities); **no** update/delete.
- `reputation_votes`: insert by authenticated verified citizens; read aggregated only.
- Storage buckets: `cin-documents` (private, owner + admin), `report-evidence` (private, signed URLs), `news-media` (public read, admin write), `avatars` (public read, owner write), `request-attachments` (private).

### 3.7b Implementation notes (deviations from the first draft — the SQL is the reference)
- **`items` is kept** for now (the starter UI still uses it); it will be dropped when the starter `items` pages are removed.
- Existing `notifications` keeps its `href` column (not `link_url`) and gains `type`, `entity_type`, `entity_id`.
- `reputation_level` is a generated column; `is_minor` is maintained by trigger (a generated column cannot use `current_date`). `reputation_points = reputation_base + sum(votes received)`.
- `embedding vector` on `knowledge_base` is omitted (pgvector optional) — full-text GIN index instead.
- Extra enums: `report_category`, `news_status`. `transport_type` also contains `aethelon_apex` (car) and `vortex_phantom` (motorcycle).
- `voice_commands.locale` accepts `fr | en | any` (seed uses `any` with bilingual phrases).
- Tracking numbers use sequences starting at 1000 (`NT-REQ-YYYY-NNNN`, `NT-REP-YYYY-NNNN`); seed uses 0001–0010.
- Column protection: `guard_profile_update` / `guard_citizen_update` triggers stop non-admins from changing `role`, `account_status`, `kyc_status`, reputation, etc. Citizens cancel / rate their own request through RPCs `cancel_my_request`, `rate_my_request`.
- `is_admin()` is true for the starter JWT claim (`app_metadata.role = 'admin'`) **or** an active `profiles.role = 'general_admin'`.
- Seed audit: `audit_logs` only receives UPDATE/DELETE triggers; seeds insert directly, so exactly 10 audit rows exist after seeding.

### 3.8 Delivery files (import into Supabase → SQL Editor, in this order)

```
supabase/nova-terra/
  00_reset_dev.sql        -- optional: drops Nova Terra objects (dev only, guarded)
  01_enums_extensions.sql -- extensions (pgcrypto, pg_trgm, unaccent), enums
  02_tables.sql           -- 35 tables, FKs, checks, indexes
  03_functions_triggers.sql
  04_rls_grants.sql       -- GRANT + ENABLE RLS + policies for every table
  05_storage.sql          -- buckets + storage policies
  06_seed_auth.sql        -- 10 auth.users + auth.identities + profiles (demo password)
  07a_seed_city_identity.sql      -- sectors … reputation_votes (tables 1-13)
  07b_seed_requests_reports.sql   -- requests, reports, evidence, satellite (14-20, 29)
  07c_seed_content_platform.sql   -- news, dangers, platform, accessibility, voice (21-28, 30-39 + starter)
  08_citizen_rpcs.sql     -- phase 1: complete_citizen_profile, submit_cin_verification, decide_cin_verification, touch_last_login
  09_workflow_support.sql -- phases 3-6: request notifications, remind_stalled_requests, public_reports view, simulate_observation/api_sync, list_agents
  10_knowledge_base.sql   -- phases 7-9: rebuild_knowledge_base, apply_ai_content, propose_ai_content, send_newsletter_digest
  99_verify.sql           -- SELECT count(*) per table must be ≥ 10; FK/orphan checks
```

`00_reset_dev.sql` wipes only the fictional data (guarded by `set app.allow_nova_reset = 'yes'`). Each file is **idempotent** and < 100 KB (SQL Editor limit comfort). A `scripts/build-sql.mjs` can concatenate into one `nova-terra_full.sql` if wanted.

---

## 4. Fictional data (10 rows per table)

### 4.1 The city

**Nova Terra** — floating hive-city, 10 hexagonal sectors on an axial grid (`hex_q, hex_r`), pixel position `x = size·√3·(q + r/2)`, `y = size·1.5·r`.

| #  | Code | Sector           | (q,r)  | Role                      | Color   |
| -- | ---- | ---------------- | ------ | ------------------------- | ------- |
| 1  | S-01 | Nexus Core       | (0,0)  | Administration, city hall | #6366f1 |
| 2  | S-02 | Aurora Heights   | (1,0)  | Residential               | #f59e0b |
| 3  | S-03 | Helios Grid      | (1,-1) | Energy                    | #eab308 |
| 4  | S-04 | Ferrum Docks     | (0,-1) | Industrial                | #78716c |
| 5  | S-05 | Lumen Gardens    | (-1,0) | Parks, culture            | #22c55e |
| 6  | S-06 | Vitalis District | (-1,1) | Hospitals                 | #ef4444 |
| 7  | S-07 | Orbis Port       | (0,1)  | Spaceport, transport      | #0ea5e9 |
| 8  | S-08 | Cipher Quarter   | (2,-1) | Telecom, tech             | #8b5cf6 |
| 9  | S-09 | Sentinel Ward    | (-2,1) | Security                  | #0f172a |
| 10 | S-10 | Academia Spire   | (1,1)  | Schools, research         | #14b8a6 |

### 4.2 Stable IDs

Fixed UUID pattern: `<table-prefix>-0000-4000-8000-0000000000NN` (NN = 01…10) so seed is re-runnable (`on conflict (id) do update`). Demo auth users use `aaaaaaaa-…-0000000000NN`.

### 4.3 Seed content per table (10 rows each)

| Table                        | The 10 rows                                                                                                                                                                                                                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sectors`                  | S-01…S-10 above                                                                                                                                                                                                                                                                                                                                                              |
| `departments`              | Administration, Public Safety, Health, Infrastructure, Energy & Water, Mobility, Environment, Education, Culture & Leisure, Digital & Telecom                                                                                                                                                                                                                                 |
| `buildings`                | Nova Terra City Hall (S-01), Aurora Residence Tower (S-02), Helios Fusion Plant (S-03), Ferrum Cargo Hub (S-04), Lumen Botanical Dome (S-05), Vitalis Central Hospital (S-06), Orbis Spaceport Terminal (S-07), Cipher Data Citadel (S-08), Sentinel Police HQ (S-09), Academia Spire University (S-10); includes 1`temporarily_closed` + 1 `under_maintenance` edge case |
| `services`                 | Citizen Relations Office, Nova Police, Fire & Rescue, Emergency Medical (Ambulance), Public Works & Roads, Energy & Water Utility, Transport Authority, Environment & Waste, Education & Youth, Urban Planning — one`temporarily_closed`, one `hidden` (unpublished)                                                                                                     |
| `service_relations`        | Police→Fire (collaborates), Fire→Ambulance (collaborates), Citizen Relations→all (escalates_to) ×3, Transport→Public Works, Energy→Public Works, Environment→Public Works, Urban Planning→Public Works (supervises), Ambulance→Hospital svc                                                                                                                          |
| `transports`               | Hover-tram T1, Maglev M1, Sky-pod P1–P2, Shuttle SH1, Drone-taxi D1, Cargo drone C1, Ferry F1, personal Aethelon Apex (car) and Vortex Phantom (motorcycle, in `maintenance`)                                                                                                                                                                                                               |
| `profiles`                 | 1 general admin, 4 service admins (Police, Fire, Ambulance, Citizen Relations), 1 agent, 4 citizens (verified, pending KYC, suspended + rejected KYC, 1 minor) → 10 with `auth.users`                                                                                                                                                                                                                              |
| `citizens`                 | 10 civil identities (every profile): 7 adult verified, 1 pending, 1 rejected, 1 **minor** sponsored by a verified adult; reputation 0–120                                                                                                                                                                                                                          |
| `service_members`          | 5 admin memberships (Police, Fire, Ambulance, Citizen Relations, Public Works), 5 agent memberships (1 with `can_validate_reports`, 1 revoked)                                                                                                                                                                                                                                                                 |
| `permissions`              | `service.read`, `request.create`, `request.read_service`, `request.update`, `report.create`, `report.validate`, `news.publish`, `user.manage`, `role.edit`, `audit.read`                                                                                                                                                                                  |
| `role_permissions`         | 10 mappings reproducing the D09 matrix (scope own/service/all)                                                                                                                                                                                                                                                                                                                |
| `citizen_verifications`    | 10 CIN checks: 6 verified (score 0.9+), 2 pending, 2 rejected (blurry / mismatched model)                                                                                                                                                                                                                                                                                     |
| `reputation_votes`         | 10 votes between citizens (positive, one negative), no self-vote                                                                                                                                                                                                                                                                                                              |
| `requests`                 | 10 requests spanning**every status**: new, received, to_qualify, assigned, in_progress, waiting_info, resolved, closed, rejected, cancelled; 2 overdue (`due_at` in past), 2 with attachments, 1 via chatbot                                                                                                                                                          |
| `request_comments`         | 10: public replies + internal notes                                                                                                                                                                                                                                                                                                                                           |
| `request_status_history`   | 10 transitions consistent with the requests above                                                                                                                                                                                                                                                                                                                             |
| `report_clusters`          | 10 (e.g.`power_outage@S-03`, `noise@S-02`, `road_damage@S-04`…)                                                                                                                                                                                                                                                                                                        |
| `reports`                  | 10: all statuses incl. draft, to_verify (camera/satellite auto-generated, unvalidated), validated, rejected, resolved, archived; sources: citizen, agent, chatbot, camera, satellite, external_api; one with`voice_transcript`                                                                                                                                              |
| `report_evidence`          | 10: citizen photos, camera frames, satellite tiles (sample images in`public/sample/…`), different confidence/validation                                                                                                                                                                                                                                                    |
| `report_status_history`    | 10                                                                                                                                                                                                                                                                                                                                                                            |
| `news`                     | 10: 1 urgent, 1 important, 1 expired/archived, 1 draft, 1 pending_review, rest published; various categories                                                                                                                                                                                                                                                                  |
| `news_comments`            | 10 (1 hidden by moderator)                                                                                                                                                                                                                                                                                                                                                    |
| `newsletter_topics`        | safety, transport, energy, health, culture, urbanism, environment, education, emergency, city_hall                                                                                                                                                                                                                                                                            |
| `newsletter_subscriptions` | 10 mixing frequencies                                                                                                                                                                                                                                                                                                                                                         |
| `notifications`            | 10: request_update, report_update, news, danger_alert, newsletter… (read + unread)                                                                                                                                                                                                                                                                                           |
| `support_calls`            | 10: connected, missed, ended with duration, one that created a request                                                                                                                                                                                                                                                                                                        |
| `dangers`                  | 10:**Alien invasion protocol** (extreme, with 8 ordered steps), Solar-flare blackout, Anti-gravity failure, Toxic nebula cloud, Meteor shower, Cyber-attack on grid, Hull breach in Ferrum Docks, Contagion quarantine, Temporal-rift anomaly, Training drill (archived). All flagged `is_fictional_alert`                                                            |
| `cameras`                  | 10 simulated cameras, one per sector, 1 offline                                                                                                                                                                                                                                                                                                                               |
| `satellite_observations`   | 10 simulated observations, mix of pending/validated/rejected, 2 generated a report                                                                                                                                                                                                                                                                                            |
| `audit_logs`               | 10 entries (role change, report validated, news published, service hidden, verification decided…)                                                                                                                                                                                                                                                                            |
| `api_synchronizations`     | 10: success ×6, partial ×2, failed ×1 with error_log, running ×1                                                                                                                                                                                                                                                                                                          |
| `chat_sessions`            | 10: text + voice, some`keep_history`, 1 escalated                                                                                                                                                                                                                                                                                                                           |
| `chat_messages`            | 10 with`sources` links + 1 `pending_action` awaiting confirmation                                                                                                                                                                                                                                                                                                         |
| `knowledge_base`           | 10 versioned entries from services/news/dangers                                                                                                                                                                                                                                                                                                                               |
| `ai_generated_content`     | 10: AI-generated city content (sectors/services/buildings descriptions) pending/validated                                                                                                                                                                                                                                                                                     |

| `accessibility_preferences` | 10 (one per profile): 2 low-vision (high-contrast dark + font 1.5 / 1.8), 2 voice-assist (read aloud + voice navigation, rate 0.9 / 1.1), 1 both, 1 hard-of-hearing (captions + visual alerts), 1 voice guide only, 3 defaults |
| `guide_tours` | 10: Welcome, Services & news, Interactive map, Send a request, File a report (+ voice), Chatbot, Dangers & alerts, Profile & accessibility, Agent workspace (agent), Admin console (admin) |
| `guide_tour_steps` | ≥ 10: full 10-step Welcome tour (header → search → services → news → map → chatbot → report → login → accessibility menu → help); more steps added per tour |
| `voice_commands` | 10 (fr + en phrases): go home, open services, open news, open map, open chatbot, new report, my requests, read this page, "where am I / help", stop / cancel |

Kept tables also receive 10 rows each: `contact_messages`, `ai_usage` (and `contact_rate_limits` is left empty by design — runtime-only).

**Edge cases covered (REQUESTS §4.2):** closed service, hidden service, overdue request, rejected KYC, minor with sponsor, failed API sync, unvalidated camera report, expired news, revoked service-admin, 0-reputation citizen.

**Demo credentials:** shared password documented in `docs/SUPABASE.md` (dev only). Never reuse in prod.

---

## 5. Architecture (frontend)

```
src/
  features/
    auth/          signup (D01), login (D03), reset password, guards (RequireRole)
    profile/       my profile, notification prefs, KYC upload, sponsor link (D08)
    services/      list, search, detail (D05)
    news/          list, detail, comments, admin editor (D06)
    home/          D07 sections
    requests/      create (D04), my requests, tracking (F22)
    reports/       form (sector→building→map pick), voice input, my reports, public list, clusters
    map/           HexMap (SVG), SectorLayer, BuildingLayer, TransportLayer, route finder, CRUD panels
    chatbot/       ChatWidget, voice (STT/TTS), confirmation card, source links
    dangers/       list, detail, protocol stepper
    agent/         D19 workspace: dashboard, inbox, detail, evidence, stats, sync indicator
    admin/         users, roles/permissions, services, moderation, AI content review, audit logs, sync
    reputation/    votes, badges
    newsletter/    topics subscription
    accessibility/ AccessibilityProvider (theme + font scale as CSS variables), settings panel, quick toggle in header
    voice/         VoiceProvider: ScreenReader (TTS), Listener (STT), intent router, spoken confirmation, live captions
    guide/         GuideTourProvider, popover/spotlight, tour launcher + /guide page, voice narration hook
  lib/             supabase.ts (exists), permissions.ts, hex.ts (axial↔pixel), stt.ts, tts.ts, a11y-prefs.ts (localStorage ↔ DB sync), voice-intents.ts, page-reader.ts (DOM → readable text)
  types/database.ts  generated: `supabase gen types typescript`
supabase/functions/
  verify-cin        AI check of fictional CIN (OpenRouter vision) → citizen_verifications
  chatbot           RAG over knowledge_base, tool: draft_report / draft_request (needs confirm)
  confirm-action    executes pending_action after user confirmation
  transcribe        (optional) server STT fallback; default = browser Web Speech API
  sync-nova-api     simulated import → api_synchronizations + pending items
  send-newsletter   digest by topic/frequency
  rebuild-knowledge regenerates knowledge_base from published rows
  voice-intent      fallback: free-speech utterance → {action, target, args, confidence} via OpenRouter when no voice_commands match
```

### 5.1 Routes

```
/                         home (D07)
/services, /services/:slug
/news, /news/:slug
/map
/dangers, /dangers/:slug
/guide                    textual guide: tours list + replay (public)
/contact                  anonymous allowed
/auth/signup  /auth/login  /auth/reset
/app                      citizen space
/app/requests, /app/requests/new, /app/requests/:id
/app/reports, /app/reports/new, /app/reports/:id
/app/profile, /app/accessibility, /app/verification, /app/notifications, /app/newsletter
/app/assistant            chatbot (full page; widget everywhere)
/agent                    D19 dashboard (role: agent+)
/agent/requests, /agent/requests/:id
/agent/reports, /agent/reports/:id
/agent/evidence/:id, /agent/stats, /agent/sync
/admin                    users, roles, services, news moderation, ai-content, audit, map editor
```

Guards: client (`RequireRole`) **and** server (RLS / edge functions). URL tampering must end in a controlled 403 page.

### 5.2 Hex map specifics

- Pure SVG, `viewBox` driven; hexes from `(hex_q, hex_r)`; buildings/transports positioned by `(x, y)`.
- Admin mode: add / delete / recolor sector, drag building & transport (updates `x,y`), CRUD side panel (React Query mutations).
- Layers toggle: sectors, buildings, transports, dangers (hatched zones), reports (validated only), observations (admin only).
- Navigation: Dijkstra over a graph of buildings/transport hubs; "closed" buildings excluded; restricted zones avoided.
- Mobile: pinch-zoom + bottom sheet details.

### 5.3 Chatbot rules (REQUESTS §4.1)

Answers only from `knowledge_base` (published); always returns `sources`; says "I don't know" + offers agent handoff; asks confirmation before creating anything (`pending_action` → confirm button); emergency keywords route to the danger page + emergency contacts; voice via Web Speech API (STT editable before sending, TTS toggle); personal data masked before storage.

### 5.4 Reputation rules

Points shown on profile; only verified citizens vote; one vote per pair; no self-vote; no votes on reports; reputation displayed next to public reports/comments as a credibility badge (never overrides admin validation).

### 5.5 Accessibility, voice & guidance

**Settings model.** Three independent groups, any combination allowed. Stored in `accessibility_preferences`, mirrored in localStorage (visitors, and first paint so there is no flash of the wrong theme), synced on login.

| Group | Settings | Behaviour |
|---|---|---|
| **Vision ("mal voyant")** | `theme` (`high_contrast_light/dark`, `yellow_on_black`), `font_scale` 0.85–2.00, `line_spacing`, `reduce_motion` | Themes are CSS-variable sets on `:root[data-theme]` (contrast ≥ 7:1, AAA). Font size is a root `font-size` multiplier so every `rem` scales. Layout must not break at 200 % (no fixed heights, nav collapses to a drawer). Focus ring ≥ 3 px. Map and charts add patterns/labels, not colour alone. |
| **Voice assist ("mal entendant", as specified)** | `read_screen_aloud`, `voice_navigation`, `tts_rate/voice`, `speech_lang`, `confirm_by_voice` | On each route change the **page reader** builds a spoken summary from landmarks (`main`, headings, `aria-label`, `data-voice` hints, form fields) and reads it with `speechSynthesis`. The user can interrupt ("stop"), repeat, or go to next/previous section. The microphone is **opt-in per session** (button + visible "listening" state); the user answers by voice: dictates fields (read back for confirmation), picks options, says "next", "submit", "go to services". |
| **Hearing support (literal meaning)** | `captions`, `visual_alerts` | Every spoken/audio output also appears as on-screen text; alerts never rely on sound alone (banner + icon + vibration where available); chatbot voice replies always have text. |

**Voice navigation pipeline**
1. Listener: Web Speech API `SpeechRecognition` (Chromium/Safari). Fallback: push-to-talk recording → `transcribe` edge function.
2. Utterance normalised (lowercase, accents stripped) and fuzzy-matched against `voice_commands.phrases` for the active locale.
3. No match → `voice-intent` edge function (LLM, strict JSON output). Unknown → "I did not understand, say *help*".
4. Router executes: `navigate` (react-router), `click`/`fill` only on elements flagged `data-voice` (never arbitrary DOM), `read`, `open_tour`.
5. Anything that **submits, creates or deletes** (`requires_confirmation`, or any mutation) → the assistant reads the content back and waits for a spoken "yes / confirm". Same two-step rule as the chatbot. Passwords are never dictated.
6. Everything spoken is mirrored as text (captions) and exposed in an `aria-live="polite"` region. If a real screen reader is suspected, read-aloud pauses by default (manual override), so the two don't talk over each other.

**Voice guide.** "Help" (button, `?` key, or saying "help") speaks the current page name, what can be done here, 3–5 relevant voice commands, and how to leave. Text comes from `guide_tour_steps.voice_script` + `voice_commands.description`, so it stays in sync with the textual tour.

**Textual guided tour.** `GuideTourProvider` loads `guide_tours` + steps for the user's role and shows a popover anchored on `[data-tour]` with Next / Back / Skip / "Don't show again", progress "3/10", keyboard (←/→/Esc), focus trapped and announced. It routes automatically between steps, offers a non-blocking prompt on first visit, and can be replayed from the header "?" menu and `/guide`. Progress is saved in `accessibility_preferences.tour_completed` (localStorage for visitors). It must work with high-contrast themes and 200 % font.

**Definition of Done for every feature page:** one `h1`, landmark regions (needed by the page reader), visible text labels on all controls, and `data-tour` / `data-voice` attributes on key elements.

**Acceptance criteria**
- High contrast + 175 % font on every public page: no horizontal scroll, all content reachable, 0 axe contrast violations.
- Hands-free path works: open app → hear home → say "open services" → hear list → open a service → say "contact this service" → dictate a request → hear it read back → confirm → hear the tracking number.
- Denying microphone permission leaves a fully working keyboard/text path with a clear message.
- The Welcome tour can be completed, skipped, resumed after reload and replayed, keyboard only.
- Preferences follow the user across devices after login; visitors keep theirs in the browser.

---

## 6. Security & compliance checklist

- [ ] All tables: GRANT + RLS + policies (verified by `99_verify.sql`)
- [ ] `role`, `account_status`, `kyc_status`, `reputation_points` writable only by server/admin
- [ ] Private buckets + signed URLs for evidence and CIN
- [ ] No camera live feed exposed; sensitive evidence admin-only
- [ ] Audit trigger on sensitive tables, `audit_logs` append-only
- [ ] Rate limits on contact, chatbot (existing `ai_usage` quota), KYC attempts
- [ ] `service_role` / OpenRouter key only in Edge Function secrets
- [ ] `accessibility_preferences`: RLS own-row only; voice router acts only on `data-voice` elements; mutations always need confirmation
- [ ] Microphone opt-in per session; raw audio is **not stored**; transcripts stored only if the user opts in, masked like chat
- [ ] Fictional data banner visible in the UI ("Simulation — Nova Terra")

## 7. Accessibility, performance, UX

Baseline WCAG 2.2 AA for everyone, **AAA contrast in the high-contrast themes** (see §5.5). Keyboard navigation, contrast AA, alt text from `alt_text`, labelled forms, SR-friendly map (list alternative of buildings), pagination on lists, React Query cache for public data, skeleton loaders, graceful API-error states, i18n (fr/en) using existing `locale.tsx`.

## 8. Testing

- **Vitest**: hex math, permissions helper, zod schemas, status transitions.
- **SQL tests** (`99_verify.sql`): counts ≥ 10, no orphan FKs, RLS smoke checks as each role.
- **Accessibility**: `@axe-core/playwright` on every public route in default + each high-contrast theme + 200 % font; Vitest for `page-reader` (DOM → text), intent matcher, theme/font persistence; mocked `SpeechRecognition` / `speechSynthesis` for the voice flow.
- **Playwright e2e**: signup→login→request→agent processes; minor/unverified cannot report; service admin cannot validate other service's report; URL tampering blocked.

---

## 9. Implementation roadmap (ordered by REQUESTS "priorité de réalisation")

Legend `[ ]` todo · `[~]` in progress · `[x]` done

### Phase 0 — Foundations

- [ ] 0.1 Review & freeze this plan (answer open decisions in §2)
- [x] 0.2 Write SQL files 01–05 (enums, tables, functions, RLS, storage)
- [x] 0.3 Write seed 06–07 (a/b/c) + `99_verify.sql` — validated on an in-memory Postgres (PGlite): every file runs twice without error, `99_verify` is all green, 39 RLS/trigger smoke tests pass
- [x] 0.4 Files 01–07c imported by the owner. **Files 08, 09, 10 (added during phases 1–9) must be imported too** — see `docs/SUPABASE.md`
- [~] 0.5 Domain enums in `src/lib/types.ts` done; `supabase gen types` → `src/types/database.ts` + typed client after 0.4
- [x] 0.6 `src/lib/permissions.ts` (D09 matrix, `can`, `homeForRole`) done + tested; `RequireRole`, status badges and layouts wait for Phase 1.3 (needs `profiles.role` in the auth provider)
- [x] 0.7 Accessibility foundations: theme tokens (`data-theme`), root font-scale variable, `AccessibilityProvider`, landmark + `data-voice`/`data-tour` conventions (done **before** building pages so nothing is retrofitted)

### Phase 1 — Identity & access (D01, D03, D08, D09)

- [x] 1.1 D01 Signup form (zod: password strength, consent, sector), email verification, default citizen profile
- [x] 1.2 D03 Login, logout, session expiry, reset password, suspended-account block, role-based redirect
- [x] 1.3 D08 Profile page + admin user management (roles, status, service attachment, history via audit)
- [x] 1.4 D09 Permission matrix enforced (RLS + `RequireRole` + 403 page) with tests per role
- [x] 1.5 KYC: CIN upload, `verify-cin` edge function, status UI; minor ↔ sponsor flow

### Phase 2 — Public portal (D05, D06, D07)

- [x] 2.1 D05 Services list/search/filter/detail, closed badge, publish/hide (admin)
- [x] 2.2 D06 News list/detail/search, urgent highlight, expiry/archive, share link, admin editor with review step
- [x] 2.3 News comments + moderation
- [x] 2.4 D07 Home page (11 sections of REQUESTS D07, resilient to API failure)
- [x] 2.5 Newsletter topics + subscriptions + `send-newsletter`

### Phase 3 — Requests (D04, F22)

- [x] 3.1 D04 Contact/request form, attachments, tracking number, confirmation, anti-double-submit
- [x] 3.2 F22 Citizen tracking page + timeline; notifications on status change
- [x] 3.3 F22 Agent side: assign, change status, close requires note, SLA overdue flag, auto-reminder (cron)
- [x] 3.4 Support call (simulated) → optional request creation

### Phase 4 — Agent workspace (D19)

- [x] 4.1 Dashboard (KPIs via `stats_service`), inbox with filters/search
- [x] 4.2 Request/report detail, internal comments, history
- [x] 4.3 API sync indicator + import errors (`api_synchronizations`), `sync-nova-api` simulator
- [x] 4.4 Evidence viewer with restricted access

### Phase 5 — Reports (signalements)

- [x] 5.1 Report form (sector → building → optional map pick, category, facts, priority)
- [x] 5.2 Voice-to-text (Web Speech API), transcript review before submit
- [x] 5.3 Evidence upload (citizen) vs camera/satellite (separate flow/table)
- [x] 5.4 Routing to service, validation by service admin only, status workflow, public publication after validation
- [x] 5.5 Clusters (by type/location) view
- [x] 5.6 Reputation votes + badges

### Phase 6 — Interactive map

- [x] 6.1 HexMap read-only (sectors, buildings, transports)
- [x] 6.2 Layers + search + building detail panel
- [x] 6.3 Admin CRUD + drag & drop (x,y)
- [x] 6.4 Navigation/itinerary, closed buildings, danger zones
- [x] 6.5 Cameras/satellite observations (admin-only layer) + validation

### Phase 7 — Chatbot

- [x] 7.1 `rebuild-knowledge` + `knowledge_base`
- [x] 7.2 Text chat with sources, fallback & handoff (extend `openrouter-chat` → `chatbot`)
- [x] 7.3 Voice in/out
- [x] 7.4 Guided request/report creation with confirmation (`pending_action`)
- [x] 7.5 Paths / required documents / steps answers (from `services.procedures`)

### Phase 8 — Dangers

- [x] 8.1 Danger list/detail + protocol stepper, alien invasion protocol
- [x] 8.2 Chatbot link + emergency routing, banner for active alerts
- [x] 8.3 Admin validation, archive old alerts

### Phase 9 — AI city generation & polish

- [x] 9.1 `ai_generated_content` generation + admin review UI
- [x] 9.2 Audit log viewer, admin stats
- [~] 9.3 A11y pass, perf pass, e2e green, docs update

### Phase 10 — Accessibility, voice & guidance (starts after Phase 1; re-checked in Phase 9)

- [x] 10.1 Local part done (`AccessibilityProvider`, first-paint script, panel in `/app/parametres`); still to do: DB sync with `accessibility_preferences`, `/app/accessibility` page, header quick toggle
- [~] 10.2 Vision mode: 3 high-contrast themes, font 85–200 %, line spacing, reduce motion done; still to do: audit every page at 200 %
- [x] 10.3 Page reader (TTS): landmark/heading summary, repeat / next / previous / stop, rate and voice choice, aria-live mirror
- [x] 10.4 Voice listener (STT) + `voice_commands` matcher + `voice-intent` fallback + `transcribe` fallback
- [x] 10.5 Voice-driven forms: dictate fields, read back, spoken confirmation before submit (requests, reports; passwords typed only)
- [x] 10.6 Hearing support: captions for all voice output, visual alerts, vibration
- [x] 10.7 Voice guide ("help", where am I, available commands)
- [x] 10.8 Textual guided tour: provider, popover/spotlight, tours + steps seed, `/guide` page, replay, role-aware, optional voice narration
- [~] 10.9 Accessibility test suite (axe, mocked speech APIs, keyboard-only e2e)


### Implementation status and known gaps (updated after phases 1–10)

Everything below was built with **only the packages already installed** (RULESET §1.3) and validated with `npm run typecheck`, `npm run lint` (no error in new files), 200+ Vitest tests and 73 SQL/RLS checks on an in-memory Postgres.

| Planned | What was actually built | Gap / next step |
|---|---|---|
| `verify-cin` edge function (AI vision) | SQL RPC `submit_cin_verification` applies the *model* (format `NT-CIN-######`), admins can override in `/admin/verifications` | Real AI vision check on the CIN image (needs an edge function + OpenRouter key) |
| `chatbot`, `confirm-action` edge functions | Retrieval engine in the browser (`chatbot-engine.ts`): published knowledge base + structured service data, sources, "I don't know", confirmation before any creation | Optional LLM to rephrase answers (existing `openrouter-chat` can be wired in) |
| `transcribe`, `voice-intent` edge functions | Browser Web Speech API + fuzzy command matcher (`voice-commands`, table `voice_commands`) | Server-side transcription fallback for browsers without `SpeechRecognition` (Firefox) |
| `sync-nova-api` edge function | Admin/agent simulators (`simulate_api_sync`, `simulate_observation`) produce syncs and "to verify" camera/satellite reports | Real import job |
| `send-newsletter` edge function | SQL RPC `send_newsletter_digest` creates in-app notifications (once per news item and subscriber), button in `/admin` | E-mail delivery |
| `rebuild-knowledge` edge function | SQL RPC `rebuild_knowledge_base` (versioned, published content only), button in `/admin/ai-content` | Schedule it |
| Auto-reminder (F22) | SQL `remind_stalled_requests()` | **Schedule it** (pg_cron or Supabase scheduled function) |
| 2FA for agents | — | Out of MVP (decision 3) |
| Anonymous contact | Dropped (decision 4): `/contact` redirects residents to the request form and shows emergency numbers to visitors | `contact-submit` function and `contact_messages` are now unused by the UI |
| `@axe-core/playwright` | Not installed (new package needs approval) | Add it, then run axe on every route in each contrast theme |
| E2E | `e2e/starter-flows.spec.ts` rewritten for Nova Terra (local demo mode) | **Not executed here** (Playwright browsers not installed) — run `npm run test:e2e` |
| Generated DB types | `src/lib/db-types.ts` written by hand | Replace with `supabase gen types` |
| i18n | New screens are bilingual through `tx(fr, en)`; legal pages and a few starter pages stay French only | — |
| Starter leftovers | `items`, `ai_conversations`, old `/admin` page, `admin-data`, `contact-submit` functions are no longer routed | Delete when the team agrees |

---

## 10. Requirement traceability

| Source                    | Covered by                                                                 |
| ------------------------- | -------------------------------------------------------------------------- |
| D01                       | Ph.1.1 · tables`profiles, citizens`                                     |
| D03                       | Ph.1.2 · Supabase Auth,`audit_logs`                                     |
| D04                       | Ph.3.1 ·`requests`, `contact_messages`                                |
| D05                       | Ph.2.1 ·`services`, `departments`, `buildings`                      |
| D06                       | Ph.2.2–2.3 ·`news`, `news_comments`                                  |
| D07                       | Ph.2.4                                                                     |
| D08                       | Ph.1.3 ·`profiles, service_members`                                     |
| D09                       | Ph.1.4 ·`permissions, role_permissions`, RLS                            |
| D19                       | Ph.4 ·`api_synchronizations`, `report_evidence`                       |
| F22                       | Ph.3.2–3.3 ·`requests, request_*`                                      |
| Chatbot                   | Ph.7 ·`chat_*, knowledge_base`                                          |
| Data structure            | Ph.0 · all SQL files                                                      |
| Services / city           | §4 ·`ai_generated_content`                                             |
| Signalements              | Ph.5 ·`reports, report_evidence, report_clusters`                       |
| Map                       | Ph.6 ·`sectors, buildings, transports, cameras, satellite_observations` |
| Dangers                   | Ph.8 ·`dangers`                                                         |
| CIN / minors / reputation | Ph.1.5, 5.6 ·`citizen_verifications, reputation_votes`                  |
| Newsletter / comments     | Ph.2.3, 2.5                                                                |
| Support call              | Ph.3.4 ·`support_calls`                                                 |
| Mal voyant (contrast + font size) | Ph.0.7, 10.1–10.2 · `accessibility_preferences` |
| Mal entendant (AI reads screen, voice answers + navigation) | Ph.10.3–10.6 · `accessibility_preferences`, `voice_commands` |
| Voice help to navigate | Ph.10.7 · `voice_commands`, `guide_tour_steps.voice_script` |
| Textual guided tour | Ph.10.8 · `guide_tours`, `guide_tour_steps` |

## 11. Out of scope (for now)

Real payment, real cameras/satellites, 2FA, multi-city, native mobile app, real CIN/legal identity checks, replacing native screen readers (our voice assist complements NVDA/VoiceOver), storing raw voice audio.

## 12. Changelog

| Date       | Change                                                                         |
| ---------- | ------------------------------------------------------------------------------ |
| 2026-10-03 | Plan created: 35 tables, 10-row seed spec, 9-phase roadmap, default decisions. |
| 2026-10-03 | Added accessibility & guidance: low-vision themes + font size, voice assist (read aloud + voice answers/navigation), voice guide, textual guided tour. +4 tables (36–39), enums, §5.5, Phase 10, task 0.7, decisions 16–19. |
| 2026-10-03 | **Phase 0 implemented**: `supabase/nova-terra/` (00–07c, 99), validated on PGlite (idempotent, 39 RLS/trigger tests). Front: `a11y-prefs`, `AccessibilityProvider`, high-contrast themes (`styles/accessibility.css`), first-paint script, settings panel, `permissions.ts`, `types.ts`. Notes in §3.7b. Tasks 0.2, 0.3, 0.7 done; 0.4 pending (owner imports SQL). |
| 2026-10-03 | **Phases 1–10 implemented** (see §9 and the status table before §10). New SQL: 08, 09, 10. New front-end features: auth/profile/KYC, services, news + comments, newsletter, requests (citizen + agent), reports (voice, evidence, validation, public clusters, reputation), hex map + editor + routes, dangers, retrieval chatbot with voice, AI-content review, audit log, support calls, accessibility (themes, font, voice assist, captions), guided tours. `/contact` now follows decision 4. |
