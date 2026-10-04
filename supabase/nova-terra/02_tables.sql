-- ============================================================================
-- NOVA TERRA — 02 : tables, contraintes, index
-- Source de vérité : docs/PLAN.md §3.3 (39 tables). Relançable sans risque.
-- Les FK circulaires (profiles <-> services, citizens <-> transports...) sont
-- ajoutées en fin de fichier. RLS/GRANT : voir 04_rls_grants.sql.
-- Prérequis : schema.sql du starter (profiles, notifications) déjà exécuté.
-- ============================================================================

create sequence if not exists public.request_number_seq start 1000;
create sequence if not exists public.report_number_seq  start 1000;

-- ---------------------------------------------------------------------------
-- A. Géographie & organisation
-- ---------------------------------------------------------------------------
create table if not exists public.sectors (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique check (code ~ '^S-[0-9]{2}$'),
  name           text not null,
  description    text,
  hex_q          int  not null,
  hex_r          int  not null,
  x              numeric not null default 0,
  y              numeric not null default 0,
  color          text not null default '#6366f1' check (color ~ '^#[0-9a-fA-F]{6}$'),
  activity_level smallint not null default 50 check (activity_level between 0 and 100),
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (hex_q, hex_r)
);
comment on table public.sectors is 'classification: public';

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text,
  head_title  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.departments is 'classification: public';

create table if not exists public.buildings (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  type          public.building_type not null,
  sector_id     uuid not null references public.sectors (id) on delete restrict,
  x             numeric not null default 0,
  y             numeric not null default 0,
  lat           numeric(9,6),
  lng           numeric(9,6),
  address       text,
  opening_hours jsonb not null default '{}'::jsonb,
  accessibility jsonb not null default '{}'::jsonb,
  status        public.building_status not null default 'operational',
  description   text,
  image_url     text,
  is_fictional  boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists buildings_sector_idx on public.buildings (sector_id);
comment on table public.buildings is 'classification: public';

create table if not exists public.services (
  id                 uuid primary key default gen_random_uuid(),
  department_id      uuid not null references public.departments (id) on delete restrict,
  building_id        uuid not null references public.buildings (id) on delete restrict,
  name               text not null,
  slug               text not null unique,
  category           text not null,
  description        text,
  address            text,
  phone              text,
  email              text,
  opening_hours      jsonb not null default '{}'::jsonb,
  closing_days       text[] not null default '{}',
  languages          text[] not null default array['fr','en'],
  procedures         jsonb not null default '[]'::jsonb,
  required_documents text[] not null default '{}',
  fees               text,
  booking_url        text,
  default_sla_hours  int not null default 72 check (default_sla_hours between 1 and 720),
  status             public.service_status not null default 'open',
  published_at       timestamptz,
  is_emergency       boolean not null default false,
  last_updated_by    uuid, -- FK → profiles ajoutée plus bas
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists services_department_idx on public.services (department_id);
create index if not exists services_search_idx on public.services
  using gin (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '')));
comment on table public.services is 'classification: public (si published_at is not null et status <> hidden)';

-- Les installations restent des bâtiments de la carte, rattachés à un service.
alter table public.buildings
  add column if not exists service_id uuid references public.services (id) on delete set null,
  add column if not exists facility_type text,
  add column if not exists offerings text[] not null default '{}',
  add column if not exists phone text,
  add column if not exists email text;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.buildings'::regclass and conname = 'buildings_facility_type_check'
  ) then
    alter table public.buildings add constraint buildings_facility_type_check check (
      service_id is null
      or (facility_type is not null and facility_type in (
        'hospital','pharmacy','dentist','clinic','care_center','administrative_office',
        'police_station','fire_station','service_center','utility_center','mobility_hub',
        'environment_center','school','other'
      ))
    );
  end if;
end
$$;
create index if not exists buildings_service_idx on public.buildings (service_id) where service_id is not null;

create table if not exists public.service_relations (
  id              uuid primary key default gen_random_uuid(),
  from_service_id uuid not null references public.services (id) on delete cascade,
  to_service_id   uuid not null references public.services (id) on delete cascade,
  relation_type   text not null check (relation_type in ('escalates_to', 'collaborates_with', 'supervises')),
  note            text,
  created_at      timestamptz not null default now(),
  check (from_service_id <> to_service_id),
  unique (from_service_id, to_service_id, relation_type)
);

create table if not exists public.transports (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  type             public.transport_type not null,
  plate            text,
  visibility       text not null default 'public' check (visibility in ('public', 'personal')),
  status           public.transport_status not null default 'active',
  sector_id        uuid not null references public.sectors (id) on delete restrict,
  x                numeric not null default 0,
  y                numeric not null default 0,
  capacity         int not null default 1 check (capacity >= 0),
  route_name       text,
  owner_service_id uuid references public.services (id) on delete set null,
  owner_citizen_id uuid, -- FK → citizens ajoutée plus bas
  last_seen_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (visibility = 'public' or owner_citizen_id is not null)
);
create index if not exists transports_sector_status_idx on public.transports (sector_id, status);
comment on table public.transports is 'classification: public (visibility=public) / confidential (personal)';

-- ---------------------------------------------------------------------------
-- B. Identité, rôles & réputation
-- ---------------------------------------------------------------------------
-- profiles et notifications existent déjà (schema.sql) : on les étend.
alter table public.profiles
  add column if not exists first_name           text,
  add column if not exists last_name            text,
  add column if not exists phone                text,
  add column if not exists role                 public.user_role not null default 'citizen',
  add column if not exists account_status       public.account_status not null default 'active',
  add column if not exists primary_service_id   uuid,
  add column if not exists allowed_sector_ids   uuid[] not null default '{}',
  add column if not exists notification_prefs   jsonb not null default '{"email": true, "in_app": true}'::jsonb,
  add column if not exists locale               text not null default 'fr' check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova')),
  add column if not exists requires_2fa         boolean not null default false,
  add column if not exists last_login_at        timestamptz,
  add column if not exists updated_at           timestamptz not null default now(),
  add column if not exists deleted_at           timestamptz;
create index if not exists profiles_role_idx on public.profiles (role);
comment on table public.profiles is 'classification: confidential (colonnes publiques via la vue public_profiles)';

create table if not exists public.citizens (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null unique references public.profiles (id) on delete cascade,
  sector_id           uuid references public.sectors (id) on delete set null,
  building_id         uuid references public.buildings (id) on delete set null,
  birth_date          date not null check (birth_date <= current_date),
  is_minor            boolean not null default false, -- maintenu par trigger (03)
  sponsor_citizen_id  uuid references public.citizens (id) on delete set null,
  cin_number          text unique, -- CIN FICTIF
  kyc_status          public.kyc_status not null default 'none',
  reputation_base     int not null default 0,
  reputation_points   int not null default 0,
  reputation_level    text generated always as (
    case when reputation_points >= 100 then 'guardian'
         when reputation_points >= 50  then 'trusted'
         when reputation_points >= 10  then 'regular'
         else 'newcomer' end
  ) stored,
  consent_terms_at    timestamptz,
  consent_data_at     timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  check (sponsor_citizen_id is null or sponsor_citizen_id <> id)
);
create index if not exists citizens_sector_idx on public.citizens (sector_id);
comment on table public.citizens is 'classification: confidential';

create table if not exists public.service_members (
  id                   uuid primary key default gen_random_uuid(),
  profile_id           uuid not null references public.profiles (id) on delete cascade,
  service_id           uuid not null references public.services (id) on delete cascade,
  member_role          text not null check (member_role in ('agent', 'admin')),
  can_validate_reports boolean not null default false,
  granted_by           uuid references public.profiles (id) on delete set null,
  granted_at           timestamptz not null default now(),
  revoked_at           timestamptz,
  created_at           timestamptz not null default now(),
  unique (profile_id, service_id)
);
create index if not exists service_members_service_idx on public.service_members (service_id) where revoked_at is null;
comment on table public.service_members is 'classification: internal';

create table if not exists public.permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  description text,
  resource    text not null,
  action      text not null check (action in ('read', 'create', 'update', 'validate', 'delete')),
  created_at  timestamptz not null default now()
);

create table if not exists public.role_permissions (
  id            uuid primary key default gen_random_uuid(),
  role          public.user_role not null,
  permission_id uuid not null references public.permissions (id) on delete cascade,
  scope         text not null default 'own' check (scope in ('own', 'service', 'all')),
  created_at    timestamptz not null default now(),
  unique (role, permission_id)
);

create table if not exists public.citizen_verifications (
  id               uuid primary key default gen_random_uuid(),
  citizen_id       uuid not null references public.citizens (id) on delete cascade,
  cin_image_path   text,
  ai_model         text,
  ai_score         numeric(3,2) check (ai_score between 0 and 1),
  ai_extracted     jsonb not null default '{}'::jsonb,
  status           public.validation_status not null default 'pending',
  reviewed_by      uuid references public.profiles (id) on delete set null,
  rejection_reason text,
  submitted_at     timestamptz not null default now(),
  decided_at       timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists citizen_verifications_citizen_idx on public.citizen_verifications (citizen_id);
comment on table public.citizen_verifications is 'classification: sensitive';

create table if not exists public.reputation_votes (
  id              uuid primary key default gen_random_uuid(),
  from_citizen_id uuid not null references public.citizens (id) on delete cascade,
  to_citizen_id   uuid not null references public.citizens (id) on delete cascade,
  points          smallint not null check (points between -2 and 2 and points <> 0),
  reason          text check (reason is null or char_length(reason) <= 280),
  created_at      timestamptz not null default now(),
  unique (from_citizen_id, to_citizen_id),
  check (from_citizen_id <> to_citizen_id)
);

-- ---------------------------------------------------------------------------
-- C. Demandes (D04 / F22)
-- ---------------------------------------------------------------------------
create table if not exists public.requests (
  id                uuid primary key default gen_random_uuid(),
  tracking_number   text not null unique default (
    'NT-REQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.request_number_seq')::text, 4, '0')
  ),
  requester_id      uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  service_id        uuid not null references public.services (id) on delete restrict,
  assigned_agent_id uuid references public.profiles (id) on delete set null,
  category          text not null,
  subject           text not null check (char_length(subject) between 3 and 150),
  description       text not null check (char_length(description) between 10 and 5000),
  priority          public.priority_level not null default 'medium',
  status            public.request_status not null default 'new',
  urgency_flag      boolean not null default false,
  due_at            timestamptz,
  satisfaction      smallint check (satisfaction between 1 and 5),
  attachments       jsonb not null default '[]'::jsonb,
  resolution_note   text,
  closed_at         timestamptz,
  source            text not null default 'web' check (source in ('web', 'chatbot', 'support_call')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz,
  -- F22 : une demande ne peut pas être clôturée sans réponse
  constraint requests_close_needs_note check (
    status not in ('resolved', 'closed') or char_length(coalesce(resolution_note, '')) >= 3
  )
);
create index if not exists requests_service_status_idx on public.requests (service_id, status, due_at);
create index if not exists requests_requester_idx on public.requests (requester_id);
comment on table public.requests is 'classification: confidential';

create table if not exists public.request_comments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body        text not null check (char_length(body) between 1 and 5000),
  is_internal boolean not null default false,
  attachments jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists request_comments_request_idx on public.request_comments (request_id, created_at);
comment on table public.request_comments is 'classification: internal si is_internal, sinon confidential';

create table if not exists public.request_status_history (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests (id) on delete cascade,
  from_status public.request_status,
  to_status   public.request_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  reason      text,
  changed_at  timestamptz not null default now()
);
create index if not exists request_status_history_request_idx on public.request_status_history (request_id, changed_at);

-- ---------------------------------------------------------------------------
-- D. Signalements
-- ---------------------------------------------------------------------------
create table if not exists public.report_clusters (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  category     public.report_category not null,
  sector_id    uuid references public.sectors (id) on delete set null,
  building_id  uuid references public.buildings (id) on delete set null,
  report_count int not null default 0,
  centroid_x   numeric,
  centroid_y   numeric,
  cluster_key  text not null unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  report_number       text not null unique default (
    'NT-REP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.report_number_seq')::text, 4, '0')
  ),
  title               text not null check (char_length(title) between 3 and 150),
  description         text not null check (char_length(description) between 10 and 5000),
  category            public.report_category not null,
  sector_id           uuid not null references public.sectors (id) on delete restrict,
  building_id         uuid references public.buildings (id) on delete set null,
  x                   numeric,
  y                   numeric,
  observed_at         timestamptz not null default now(),
  source              public.report_source not null default 'citizen',
  reporter_citizen_id uuid references public.citizens (id) on delete set null,
  reporter_system     text,
  service_id          uuid references public.services (id) on delete restrict, -- auto-routé par trigger
  assigned_agent_id   uuid references public.profiles (id) on delete set null,
  priority            public.priority_level not null default 'medium',
  status              public.report_status not null default 'received',
  confidence_score    numeric(3,2) check (confidence_score between 0 and 1),
  facts               jsonb not null default '{}'::jsonb,
  voice_transcript    text,
  transcript_reviewed boolean not null default false,
  cluster_id          uuid references public.report_clusters (id) on delete set null,
  validated_by        uuid references public.profiles (id) on delete set null,
  validated_at        timestamptz,
  resolved_at         timestamptz,
  is_public           boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  -- Publication uniquement après validation par un admin habilité
  constraint reports_public_needs_validation check (
    not is_public or (validated_by is not null and status in ('validated', 'assigned', 'in_progress', 'resolved'))
  ),
  -- Une transcription vocale doit être relue avant validation
  constraint reports_transcript_reviewed check (
    voice_transcript is null or transcript_reviewed or status in ('draft', 'received', 'to_verify', 'rejected')
  )
);
create index if not exists reports_service_status_idx on public.reports (service_id, status);
create index if not exists reports_sector_idx on public.reports (sector_id);
create index if not exists reports_cluster_idx on public.reports (cluster_id);
comment on table public.reports is 'classification: confidential (internal tant que is_public = false)';

create table if not exists public.report_evidence (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid not null references public.reports (id) on delete cascade,
  source           public.evidence_source not null,
  file_path        text not null,
  mime_type        text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  captured_at      timestamptz not null default now(),
  confidence_score numeric(3,2) check (confidence_score between 0 and 1),
  validation_status public.validation_status not null default 'pending',
  validated_by     uuid references public.profiles (id) on delete set null,
  visibility       public.visibility_level not null default 'confidential',
  alt_text         text not null default '',
  created_at       timestamptz not null default now(),
  -- caméras et satellites = données sensibles
  check (source not in ('camera', 'satellite') or visibility = 'sensitive')
);
create index if not exists report_evidence_report_idx on public.report_evidence (report_id);
comment on table public.report_evidence is 'classification: confidential (citizen) / sensitive (camera, satellite)';

create table if not exists public.report_status_history (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  from_status public.report_status,
  to_status   public.report_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  reason      text,
  changed_at  timestamptz not null default now()
);
create index if not exists report_status_history_report_idx on public.report_status_history (report_id, changed_at);

-- ---------------------------------------------------------------------------
-- E. Contenu & communication
-- ---------------------------------------------------------------------------
create table if not exists public.news (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique,
  title               text not null,
  summary             text not null,
  body                text not null,
  category            text not null,
  cover_image_url     text,
  service_id          uuid references public.services (id) on delete set null,
  author_id           uuid references public.profiles (id) on delete set null,
  importance          public.news_importance not null default 'normal',
  status              public.news_status not null default 'draft',
  published_at        timestamptz,
  valid_until         timestamptz,
  affected_sector_ids uuid[] not null default '{}',
  reviewed_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  check (status <> 'published' or (published_at is not null and reviewed_by is not null))
);
create index if not exists news_status_published_idx on public.news (status, published_at desc);
create index if not exists news_search_idx on public.news
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(summary, '') || ' ' || coalesce(category, '')));
comment on table public.news is 'classification: public (status = published)';

create table if not exists public.news_comments (
  id           uuid primary key default gen_random_uuid(),
  news_id      uuid not null references public.news (id) on delete cascade,
  author_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body         text not null check (char_length(body) between 1 and 1000),
  status       text not null default 'visible' check (status in ('visible', 'hidden')),
  moderated_by uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists news_comments_news_idx on public.news_comments (news_id, created_at);

create table if not exists public.newsletter_topics (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.newsletter_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  topic_id   uuid not null references public.newsletter_topics (id) on delete cascade,
  frequency  text not null default 'weekly' check (frequency in ('instant', 'daily', 'weekly')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  unique (profile_id, topic_id)
);

-- notifications (starter) : on ajoute le typage Nova Terra
alter table public.notifications
  add column if not exists type        public.notification_type not null default 'system',
  add column if not exists entity_type text,
  add column if not exists entity_id   uuid;
create index if not exists notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

create table if not exists public.support_calls (
  id                 uuid primary key default gen_random_uuid(),
  caller_id          uuid default auth.uid() references public.profiles (id) on delete set null,
  service_id         uuid not null references public.services (id) on delete restrict,
  agent_id           uuid references public.profiles (id) on delete set null,
  status             text not null default 'requested' check (status in ('requested', 'connected', 'ended', 'missed')),
  started_at         timestamptz not null default now(),
  ended_at           timestamptz,
  duration_s         int not null default 0 check (duration_s >= 0),
  summary            text,
  created_request_id uuid references public.requests (id) on delete set null,
  created_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- F. Dangers & observation
-- ---------------------------------------------------------------------------
create table if not exists public.dangers (
  id                     uuid primary key default gen_random_uuid(),
  slug                   text not null unique,
  title                  text not null,
  severity               public.danger_severity not null,
  status                 public.danger_status not null default 'draft',
  summary                text not null,
  affected_sector_ids    uuid[] not null default '{}',
  valid_from             timestamptz not null default now(),
  valid_until            timestamptz,
  recommended_actions    text[] not null default '{}',
  forbidden_actions      text[] not null default '{}',
  emergency_contacts     jsonb not null default '[]'::jsonb,
  assembly_building_ids  uuid[] not null default '{}',
  protocol_steps         jsonb not null default '[]'::jsonb,
  source                 text,
  responsible_service_id uuid references public.services (id) on delete set null,
  validated_by           uuid references public.profiles (id) on delete set null,
  validated_at           timestamptz,
  procedure_version      int not null default 1,
  is_fictional_alert     boolean not null default true,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  -- Une alerte active doit avoir un responsable et une validation
  check (status <> 'active' or (validated_by is not null and responsible_service_id is not null))
);
comment on table public.dangers is 'classification: public (status = active ou archived)';

create table if not exists public.cameras (
  id             uuid primary key default gen_random_uuid(),
  code           text not null unique,
  name           text not null,
  sector_id      uuid not null references public.sectors (id) on delete restrict,
  building_id    uuid references public.buildings (id) on delete set null,
  x              numeric not null default 0,
  y              numeric not null default 0,
  status         text not null default 'online' check (status in ('online', 'offline', 'maintenance')),
  is_live_public boolean not null default false check (is_live_public = false), -- jamais de direct public
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.cameras is 'classification: sensitive (simulé)';

create table if not exists public.satellite_observations (
  id                  uuid primary key default gen_random_uuid(),
  satellite_code      text not null,
  observed_at         timestamptz not null default now(),
  sector_id           uuid not null references public.sectors (id) on delete restrict,
  x                   numeric not null default 0,
  y                   numeric not null default 0,
  image_path          text,
  analysis            jsonb not null default '{}'::jsonb,
  confidence_score    numeric(3,2) check (confidence_score between 0 and 1),
  validation_status   public.validation_status not null default 'pending',
  validated_by        uuid references public.profiles (id) on delete set null,
  validated_at        timestamptz,
  generated_report_id uuid references public.reports (id) on delete set null,
  created_at          timestamptz not null default now()
);
comment on table public.satellite_observations is 'classification: sensitive (simulé)';

-- ---------------------------------------------------------------------------
-- G. Plateforme, IA & traçabilité
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_type  text not null default 'user' check (actor_type in ('user', 'system', 'api')),
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  reason      text,
  ip_hash     text,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
comment on table public.audit_logs is 'classification: confidential — insert-only';

create table if not exists public.api_synchronizations (
  id                       uuid primary key default gen_random_uuid(),
  source                   text not null check (source in ('nova_api', 'camera_feed', 'satellite_feed')),
  started_at               timestamptz not null default now(),
  finished_at              timestamptz,
  status                   public.sync_status not null default 'running',
  items_imported           int not null default 0,
  items_pending_validation int not null default 0,
  items_failed             int not null default 0,
  error_log                jsonb not null default '[]'::jsonb,
  external_ref             text,
  created_at               timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid default auth.uid() references public.profiles (id) on delete cascade,
  channel            text not null default 'text' check (channel in ('text', 'voice')),
  keep_history       boolean not null default false,
  language           text not null default 'fr',
  started_at         timestamptz not null default now(),
  escalated_to_agent boolean not null default false,
  created_at         timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.chat_sessions (id) on delete cascade,
  role           text not null check (role in ('user', 'assistant', 'system')),
  content        text not null,
  sources        jsonb not null default '[]'::jsonb,
  confidence     numeric(3,2) check (confidence between 0 and 1),
  pending_action jsonb,
  created_at     timestamptz not null default now()
);
create index if not exists chat_messages_session_idx on public.chat_messages (session_id, created_at);

create table if not exists public.knowledge_base (
  id           uuid primary key default gen_random_uuid(),
  entity_type  text not null check (entity_type in ('service', 'news', 'danger', 'building', 'sector', 'faq')),
  entity_id    uuid,
  title        text not null,
  content      text not null,
  url          text,
  version      int not null default 1,
  is_published boolean not null default false,
  content_hash text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (entity_type, entity_id, version)
);
create index if not exists knowledge_base_search_idx on public.knowledge_base
  using gin (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(content, '')));

create table if not exists public.ai_generated_content (
  id             uuid primary key default gen_random_uuid(),
  target_table   text not null,
  target_id      uuid,
  model          text not null,
  prompt_version text not null,
  payload        jsonb not null,
  status         public.validation_status not null default 'pending',
  reviewed_by    uuid references public.profiles (id) on delete set null,
  reviewed_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- H. Accessibilité, voix & guidage
-- ---------------------------------------------------------------------------
create table if not exists public.accessibility_preferences (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null unique default auth.uid() references public.profiles (id) on delete cascade,
  needs              public.accessibility_need[] not null default '{}',
  theme              public.ui_theme not null default 'default',
  font_scale         numeric(3,2) not null default 1.00 check (font_scale between 0.85 and 2.00),
  line_spacing       numeric(3,2) not null default 1.00 check (line_spacing between 1.00 and 2.00),
  reduce_motion      boolean not null default false,
  read_screen_aloud  boolean not null default false,
  voice_navigation   boolean not null default false,
  voice_guide        boolean not null default false,
  tts_voice          text,
  tts_rate           numeric(3,2) not null default 1.00 check (tts_rate between 0.50 and 2.00),
  speech_lang        text not null default 'fr-FR',
  captions           boolean not null default false,
  visual_alerts      boolean not null default false,
  confirm_by_voice   boolean not null default true,
  tour_completed     text[] not null default '{}',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.guide_tours (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,
  title             text not null,
  description       text,
  audience          public.user_role[] not null default array['citizen']::public.user_role[],
  route_scope       text not null default '/',
  is_published      boolean not null default true,
  version           int not null default 1,
  estimated_minutes int not null default 2,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.guide_tour_steps (
  id              uuid primary key default gen_random_uuid(),
  tour_id         uuid not null references public.guide_tours (id) on delete cascade,
  step_order      int not null check (step_order >= 1),
  route           text not null default '/',
  target_selector text,
  title           text not null,
  body            text not null,
  voice_script    text,
  placement       text not null default 'bottom' check (placement in ('top', 'bottom', 'left', 'right', 'center')),
  locale          text not null default 'fr' check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova')),
  created_at      timestamptz not null default now(),
  unique (tour_id, step_order, locale)
);

create table if not exists public.voice_commands (
  id                    uuid primary key default gen_random_uuid(),
  code                  text not null,
  locale                text not null default 'any' check (locale in ('fr', 'en', 'mg', 'mfe', 'rcf', 'x-nova', 'any')),
  phrases               text[] not null check (cardinality(phrases) >= 1),
  action                public.voice_action_type not null,
  target                text,
  description           text not null,
  requires_confirmation boolean not null default false,
  min_role              public.user_role,
  created_at            timestamptz not null default now(),
  unique (code, locale)
);

-- ---------------------------------------------------------------------------
-- Projets municipaux et votes citoyens (distincts des votes de réputation)
-- ---------------------------------------------------------------------------
create table if not exists public.city_projects (
  id          uuid primary key default gen_random_uuid(),
  service_id  uuid not null references public.services (id) on delete restrict,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  title       text not null check (char_length(title) between 3 and 150),
  description text not null check (char_length(description) between 10 and 5000),
  status      text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  created_at  timestamptz not null default now()
);
create index if not exists city_projects_service_status_idx on public.city_projects (service_id, status, created_at desc);

create table if not exists public.city_project_votes (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.city_projects (id) on delete cascade,
  citizen_id  uuid not null references public.citizens (id) on delete cascade,
  support     boolean not null,
  created_at  timestamptz not null default now(),
  unique (project_id, citizen_id)
);
create index if not exists city_project_votes_project_idx on public.city_project_votes (project_id, support);

create table if not exists public.city_project_comments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.city_projects (id) on delete cascade,
  author_id   uuid not null default auth.uid() references public.profiles (id) on delete restrict,
  body        text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at  timestamptz not null default now()
);
create index if not exists city_project_comments_project_idx on public.city_project_comments (project_id, created_at);

create table if not exists public.report_upvotes (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete cascade,
  citizen_id  uuid not null references public.citizens (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (report_id, citizen_id)
);
create index if not exists report_upvotes_report_idx on public.report_upvotes (report_id);

-- ---------------------------------------------------------------------------
-- Clés étrangères circulaires (ajoutées après création de toutes les tables)
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_primary_service_fk;
alter table public.profiles add constraint profiles_primary_service_fk
  foreign key (primary_service_id) references public.services (id) on delete set null;

alter table public.services drop constraint if exists services_last_updated_by_fk;
alter table public.services add constraint services_last_updated_by_fk
  foreign key (last_updated_by) references public.profiles (id) on delete set null;

alter table public.transports drop constraint if exists transports_owner_citizen_fk;
alter table public.transports add constraint transports_owner_citizen_fk
  foreign key (owner_citizen_id) references public.citizens (id) on delete set null;
