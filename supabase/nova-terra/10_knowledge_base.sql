-- ============================================================================
-- NOVA TERRA — 10 : base de connaissances versionnée du chatbot + application des contenus IA validés
-- Source de vérité : docs/PLAN.md §9 (phases 7 et 9). Relançable. À exécuter après 09.
-- ============================================================================

-- Reconstruit knowledge_base uniquement à partir des contenus PUBLIÉS (services, actualités actives, dangers actifs).
-- Un contenu modifié crée une nouvelle version et dépublie l'ancienne ; un contenu retiré est dépublié.
create or replace function public.rebuild_knowledge_base()
returns int language plpgsql security definer set search_path = '' as $$
declare
  r record;
  v_hash text;
  v_changed int := 0;
  v_last public.knowledge_base%rowtype;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;

  for r in
    select 'service'::text as et, s.id as eid, s.name as title,
           trim(both ' ' from coalesce(s.description, '') || ' Catégorie : ' || s.category
             || coalesce(' Horaires : ' || (select string_agg(k || ' ' || v, ', ') from jsonb_each_text(s.opening_hours) as x(k, v)), '')
             || coalesce(' Documents nécessaires : ' || nullif(array_to_string(s.required_documents, ', '), ''), '')
             || coalesce(' Étapes : ' || (select string_agg((p ->> 'step') || '. ' || (p ->> 'text'), ' ') from jsonb_array_elements(s.procedures) as p), '')
             || coalesce(' Téléphone : ' || s.phone, '')
             || case when s.status <> 'open' then ' (service actuellement ' || s.status::text || ')' else '' end) as content,
           '/services/' || s.slug as url
    from public.services s where s.published_at is not null and s.status <> 'hidden'
    union all
    select 'news', n.id, n.title, n.summary || ' ' || n.body, '/news/' || n.slug
    from public.news n
    where n.status = 'published' and n.deleted_at is null and (n.valid_until is null or n.valid_until >= now())
    union all
    select 'danger', d.id, d.title,
           d.summary || ' À faire : ' || array_to_string(d.recommended_actions, '; ')
             || ' À ne pas faire : ' || array_to_string(d.forbidden_actions, '; ')
             || coalesce(' Protocole : ' || (select string_agg((p ->> 'order') || '. ' || (p ->> 'title'), ' ' order by (p ->> 'order')::int) from jsonb_array_elements(d.protocol_steps) as p), ''),
           '/dangers/' || d.slug
    from public.dangers d where d.status = 'active'
  loop
    v_hash := md5(r.title || '|' || r.content);
    select * into v_last from public.knowledge_base k where k.entity_type = r.et and k.entity_id = r.eid order by k.version desc limit 1;
    if v_last.id is null then
      insert into public.knowledge_base (entity_type, entity_id, title, content, url, version, is_published, content_hash)
      values (r.et, r.eid, r.title, r.content, r.url, 1, true, v_hash);
      v_changed := v_changed + 1;
    elsif v_last.content_hash <> v_hash then
      update public.knowledge_base set is_published = false where entity_type = r.et and entity_id = r.eid;
      insert into public.knowledge_base (entity_type, entity_id, title, content, url, version, is_published, content_hash)
      values (r.et, r.eid, r.title, r.content, r.url, v_last.version + 1, true, v_hash);
      v_changed := v_changed + 1;
    elsif not v_last.is_published then
      update public.knowledge_base set is_published = true where id = v_last.id;
      v_changed := v_changed + 1;
    end if;
  end loop;

  -- Dépublie ce qui n'est plus public
  with live as (
    select 'service'::text as et, s.id as eid from public.services s where s.published_at is not null and s.status <> 'hidden'
    union all select 'news', n.id from public.news n where n.status = 'published' and n.deleted_at is null and (n.valid_until is null or n.valid_until >= now())
    union all select 'danger', d.id from public.dangers d where d.status = 'active'
  ), gone as (
    update public.knowledge_base k set is_published = false
    where k.is_published and k.entity_type in ('service', 'news', 'danger')
      and not exists (select 1 from live l where l.et = k.entity_type and l.eid = k.entity_id)
    returning 1
  )
  select v_changed + count(*) into v_changed from gone;
  return v_changed;
end;
$$;
revoke all on function public.rebuild_knowledge_base() from public, anon;
grant execute on function public.rebuild_knowledge_base() to authenticated;

-- Valide un contenu généré par IA et applique sa description à la table cible (humain dans la boucle).
create or replace function public.apply_ai_content(p_id uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare v_row public.ai_generated_content%rowtype;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select * into v_row from public.ai_generated_content where id = p_id for update;
  if v_row.id is null then raise exception 'Content not found' using errcode = 'P0002'; end if;
  if v_row.status <> 'pending' then raise exception 'Already reviewed' using errcode = '23514'; end if;

  if p_approve and v_row.target_id is not null and (v_row.payload ->> 'description') is not null then
    if v_row.target_table = 'sectors' then update public.sectors set description = v_row.payload ->> 'description' where id = v_row.target_id;
    elsif v_row.target_table = 'buildings' then update public.buildings set description = v_row.payload ->> 'description' where id = v_row.target_id;
    elsif v_row.target_table = 'services' then update public.services set description = v_row.payload ->> 'description' where id = v_row.target_id;
    end if;
  end if;
  update public.ai_generated_content
  set status = case when p_approve then 'validated' else 'rejected' end::public.validation_status,
      reviewed_by = (select auth.uid()), reviewed_at = now()
  where id = p_id;
end;
$$;
revoke all on function public.apply_ai_content(uuid, boolean) from public, anon;
grant execute on function public.apply_ai_content(uuid, boolean) to authenticated;

-- Propose un contenu (simulation de génération IA) : toujours « pending » tant qu'un humain ne l'a pas validé
create or replace function public.propose_ai_content(p_target_table text, p_target_id uuid, p_model text, p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_target_table not in ('sectors', 'buildings', 'services') then raise exception 'Invalid target' using errcode = '22023'; end if;
  insert into public.ai_generated_content (target_table, target_id, model, prompt_version, payload, status)
  values (p_target_table, p_target_id, coalesce(nullif(p_model, ''), 'local-template-v1'), 'city-v3', jsonb_build_object('description', p_description), 'pending')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.propose_ai_content(text, uuid, text, text) from public, anon;
grant execute on function public.propose_ai_content(text, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Lettres d'information : notifie les abonnés actifs des actualités publiées qui correspondent à leurs sujets.
-- p_frequency : 'instant' (dernière heure), 'daily' (24 h) ou 'weekly' (7 jours). Une actualité n'est notifiée qu'une fois par abonné.
-- À planifier (pg_cron / tâche planifiée) ou à lancer depuis l'administration.
-- ---------------------------------------------------------------------------
create or replace function public.send_newsletter_digest(p_frequency text default 'daily')
returns int language plpgsql security definer set search_path = '' as $$
declare
  v_since timestamptz;
  v_count int := 0;
begin
  if (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Not allowed' using errcode = '42501';
  end if;
  if p_frequency not in ('instant', 'daily', 'weekly') then raise exception 'Invalid frequency' using errcode = '22023'; end if;
  v_since := now() - case p_frequency when 'instant' then interval '1 hour' when 'daily' then interval '1 day' else interval '7 days' end;

  with topic_map(category, topic) as (
    values ('transport', 'transport'), ('culture', 'culture'), ('energy', 'energy'), ('education', 'education'),
           ('environment', 'environment'), ('infrastructure', 'urbanism'), ('guide', 'city_hall'), ('health', 'health')
  ), matches as (
    select distinct s.profile_id, n.id as news_id, n.title, n.summary, n.slug
    from public.news n
    join public.newsletter_topics t on (
      t.code in (select tm.topic from topic_map tm where tm.category = n.category)
      or (n.importance = 'urgent' and t.code in ('emergency', 'safety')))
    join public.newsletter_subscriptions s on s.topic_id = t.id and s.is_active and s.frequency = p_frequency
    join public.profiles p on p.id = s.profile_id and p.account_status = 'active'
    where n.status = 'published' and n.deleted_at is null and n.published_at >= v_since
      and not exists (
        select 1 from public.notifications x
        where x.user_id = s.profile_id and x.entity_id = n.id and x.type = 'newsletter')
  ), ins as (
    insert into public.notifications (user_id, type, title, body, href, entity_type, entity_id)
    select m.profile_id, 'newsletter', left(m.title, 120), left(m.summary, 500), '/news/' || m.slug, 'news', m.news_id
    from matches m
    returning 1
  )
  select count(*) into v_count from ins;
  return v_count;
end;
$$;
revoke all on function public.send_newsletter_digest(text) from public, anon;
grant execute on function public.send_newsletter_digest(text) to authenticated, service_role;
