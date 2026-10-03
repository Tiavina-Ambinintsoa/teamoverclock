-- ============================================================================
-- NOVA TERRA — Health service and managed health facilities
-- Run after 01-07. Safe to rerun; all locations and the service are fictional.
-- ============================================================================

alter table public.buildings
  add column if not exists service_id uuid references public.services (id) on delete set null,
  add column if not exists facility_type text,
  add column if not exists capabilities text[] not null default '{}',
  add column if not exists contact_phone text,
  add column if not exists contact_email text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.buildings'::regclass and conname = 'buildings_facility_type_check'
  ) then
    alter table public.buildings add constraint buildings_facility_type_check
      check (facility_type is null or facility_type in ('hospital', 'clinic', 'pharmacy', 'dentist', 'laboratory'));
  end if;
end
$$;

create index if not exists buildings_service_id_idx on public.buildings (service_id) where service_id is not null;

-- Keep public read access, but scope writes to the service manager or a general admin.
drop policy if exists "buildings_write_admin" on public.buildings;
drop policy if exists "buildings_write_manager" on public.buildings;
create policy "buildings_write_manager" on public.buildings for all to authenticated
  using (
    (select public.is_admin())
    or (service_id is not null and (select public.can_manage_service(service_id)))
  )
  with check (
    (select public.is_admin())
    or (service_id is not null and (select public.can_manage_service(service_id)))
  );

do $$
declare
  v_department_id uuid;
  v_hospital_id uuid;
  v_health_service_id uuid;
  v_sector_id uuid;
  facility record;
begin
  select id into v_department_id from public.departments where code = 'HEA';
  select id into v_hospital_id from public.buildings where name = 'Vitalis Central Hospital' limit 1;
  if v_department_id is null or v_hospital_id is null then
    raise exception 'Health seed requires the HEA department and Vitalis Central Hospital from 07a_seed_city_identity.sql';
  end if;

  insert into public.services (
    id, department_id, building_id, name, slug, category, description, address, phone, email,
    opening_hours, languages, procedures, required_documents, fees, default_sla_hours,
    status, published_at, is_emergency
  ) values (
    '00000004-0000-4000-8000-000000000011',
    v_department_id,
    v_hospital_id,
    'Health & Care Network',
    'health',
    'health',
    'Hospitals, clinics, pharmacies, dental care and medical laboratories across Nova Terra.',
    '3 Avenue Vitalis, S-06',
    '+999 115 0000',
    'health@novaterra.test',
    '{"always":"24/7"}',
    array['fr','en'],
    '[{"step":1,"text":"Choose a nearby health facility"},{"step":2,"text":"Contact the facility or book an appointment"}]'::jsonb,
    '{}',
    'Varies by facility',
    24,
    'open',
    now(),
    false
  )
  on conflict (slug) do nothing;
  select id into v_health_service_id from public.services where slug = 'health';
  if v_health_service_id is null then
    raise exception 'Could not create or find the health service';
  end if;

  update public.buildings set
    service_id = v_health_service_id,
    facility_type = 'hospital',
    capabilities = array['Emergency care', 'Inpatient care', 'Surgery', 'Maternity', 'Pediatrics'],
    contact_phone = '+999 115 0004',
    contact_email = 'vitalis@novaterra.test'
  where id = v_hospital_id and service_id is null;

  for facility in
    select *
    from (values
      ('00000003-0000-4000-8000-000000000011'::uuid, 'Aurora Community Clinic', 'clinic', 'S-02', -18::numeric, 12::numeric,
       '12 Terrasse d''Aurore, S-02', 'Primary care, vaccinations, family medicine', '+999 115 0011', 'aurora-clinic@novaterra.test',
       '{"mon-fri":"07:00-20:00","sat":"09:00-14:00"}'::jsonb, 'Community primary care clinic.'),
      ('00000003-0000-4000-8000-000000000012'::uuid, 'Nexus Central Pharmacy', 'pharmacy', 'S-01', 24::numeric, -16::numeric,
       '5 Place du Nexus, S-01', 'Prescription dispensing, over-the-counter medicine, medication advice', '+999 115 0012', 'nexus-pharmacy@novaterra.test',
       '{"mon-sat":"08:00-21:00","sun":"09:00-13:00"}'::jsonb, 'Community pharmacy with an after-hours service.'),
      ('00000003-0000-4000-8000-000000000013'::uuid, 'Lumen Dental Centre', 'dentist', 'S-05', -24::numeric, 18::numeric,
       '2 Promenade des Jardins, S-05', 'Dental check-ups, hygiene, restorative dentistry, urgent dental care', '+999 115 0013', 'lumen-dental@novaterra.test',
       '{"mon-fri":"08:00-18:00"}'::jsonb, 'Dental practice with step-free access.'),
      ('00000003-0000-4000-8000-000000000014'::uuid, 'Vitalis Diagnostic Laboratory', 'laboratory', 'S-06', 21::numeric, 17::numeric,
       '8 Avenue Vitalis, S-06', 'Blood tests, clinical chemistry, microbiology, diagnostic sampling', '+999 115 0014', 'vitalis-lab@novaterra.test',
       '{"mon-fri":"06:30-17:00","sat":"07:00-12:00"}'::jsonb, 'Clinical diagnostic laboratory next to the central hospital.')
    ) as locations(id, name, facility_type, sector_code, dx, dy, address, capabilities, phone, email, hours, description)
  loop
    select id into v_sector_id from public.sectors where code = facility.sector_code;
    if v_sector_id is null then
      raise exception 'Missing health facility sector %', facility.sector_code;
    end if;

    insert into public.buildings (
        id, name, type, sector_id, x, y, address, opening_hours, accessibility, status, description,
        service_id, facility_type, capabilities, contact_phone, contact_email, is_fictional
      )
      select facility.id, facility.name, 'hospital', s.id, s.x + facility.dx, s.y + facility.dy,
        facility.address, facility.hours, '{"step_free":true}'::jsonb, 'operational', facility.description,
        v_health_service_id, facility.facility_type, string_to_array(facility.capabilities, ', '),
        facility.phone, facility.email, true
      from public.sectors s where s.id = v_sector_id
      on conflict (id) do nothing;
  end loop;

  -- Carry over the existing Emergency Medical service administrator, if present.
  insert into public.service_members (profile_id, service_id, member_role, can_validate_reports, granted_by)
  select m.profile_id, v_health_service_id, 'admin', true, m.granted_by
  from public.service_members m
  join public.services existing_service on existing_service.id = m.service_id
  where existing_service.slug = 'emergency-medical'
    and m.member_role = 'admin'
    and m.revoked_at is null
  on conflict (profile_id, service_id) do nothing;
end
$$;
