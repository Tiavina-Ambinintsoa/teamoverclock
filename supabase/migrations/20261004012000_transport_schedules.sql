create table if not exists public.transport_schedules (
  id uuid primary key default gen_random_uuid(),
  line_code text not null,
  line_name text not null,
  transport_type text not null check (transport_type in ('hover_tram', 'maglev', 'sky_pod', 'shuttle', 'drone_taxi', 'cargo_drone', 'personal_hoverbike', 'ferry', 'aethelon_apex', 'vortex_phantom')),
  from_stop text not null,
  to_stop text not null,
  departure_time time not null,
  days_of_week smallint[] not null check (
    cardinality(days_of_week) > 0
    and days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  duration_min int not null check (duration_min > 0),
  sector_id uuid references public.sectors (id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'delayed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists transport_schedules_line_time_idx
  on public.transport_schedules (line_code, departure_time);

alter table public.transport_schedules enable row level security;

grant select on public.transport_schedules to anon, authenticated;
grant insert, update, delete on public.transport_schedules to authenticated, service_role;

drop policy if exists "transport_schedules_select_public" on public.transport_schedules;
create policy "transport_schedules_select_public" on public.transport_schedules
  for select to anon, authenticated using (true);

drop policy if exists "transport_schedules_write_admin" on public.transport_schedules;
create policy "transport_schedules_write_admin" on public.transport_schedules
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

insert into public.transport_schedules (
  id, line_code, line_name, transport_type, from_stop, to_stop, departure_time, days_of_week,
  duration_min, sector_id, status, notes, created_at
)
values
  ('10000000-0000-4000-8000-000000000001', 'HT-01', 'Nexus Core ↔ Orbis Port', 'hover_tram', 'Nexus Core Central', 'Orbis Port Terminal', '06:15:00', '{1,2,3,4,5}', 18, '00000001-0000-4000-8000-000000000001', 'scheduled', 'Service express du matin.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000002', 'HT-01', 'Nexus Core ↔ Orbis Port', 'hover_tram', 'Nexus Core Central', 'Orbis Port Terminal', '08:45:00', '{1,2,3,4,5}', 18, '00000001-0000-4000-8000-000000000001', 'scheduled', null, '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000003', 'HT-01', 'Nexus Core ↔ Orbis Port', 'hover_tram', 'Orbis Port Terminal', 'Nexus Core Central', '18:10:00', '{1,2,3,4,5}', 20, '00000001-0000-4000-8000-000000000007', 'delayed', 'Affluence renforcée en fin de journée.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000004', 'MG-02', 'Orbis Port ↔ Academia Spire', 'maglev', 'Orbis Port Terminal', 'Academia Spire Campus', '07:05:00', '{1,2,3,4,5}', 14, '00000001-0000-4000-8000-000000000007', 'scheduled', 'Priorité aux étudiants et personnels.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000005', 'MG-02', 'Orbis Port ↔ Academia Spire', 'maglev', 'Academia Spire Campus', 'Orbis Port Terminal', '12:20:00', '{1,2,3,4,5,6}', 14, '00000001-0000-4000-8000-000000000010', 'scheduled', null, '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000006', 'SK-03', 'Lumen Gardens ↔ Aurora Heights', 'sky_pod', 'Lumen Gardens Canopy', 'Aurora Heights Belvedere', '10:00:00', '{2,3,4,5,6,7}', 11, '00000001-0000-4000-8000-000000000005', 'scheduled', 'Parcours panoramique.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000007', 'SK-03', 'Lumen Gardens ↔ Aurora Heights', 'sky_pod', 'Aurora Heights Belvedere', 'Lumen Gardens Canopy', '16:40:00', '{2,3,4,5,6,7}', 11, '00000001-0000-4000-8000-000000000002', 'scheduled', null, '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000008', 'SH-04', 'Sentinel Ward ↔ Vitalis District', 'shuttle', 'Sentinel HQ', 'Vitalis Central Hospital', '05:50:00', '{1,2,3,4,5,6,7}', 16, '00000001-0000-4000-8000-000000000009', 'scheduled', 'Service prioritaire sécurité / santé.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000009', 'SH-04', 'Sentinel Ward ↔ Vitalis District', 'shuttle', 'Vitalis Central Hospital', 'Sentinel HQ', '21:15:00', '{1,2,3,4,5,6,7}', 16, '00000001-0000-4000-8000-000000000006', 'scheduled', 'Retour de garde.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000010', 'DT-05', 'Cipher Quarter ↔ Nexus Core', 'drone_taxi', 'Cipher Citadel Roof', 'Nexus Core Plaza', '09:30:00', '{1,2,3,4,5}', 9, '00000001-0000-4000-8000-000000000008', 'scheduled', 'Capacité limitée à 4 passagers.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000011', 'DT-05', 'Cipher Quarter ↔ Nexus Core', 'drone_taxi', 'Nexus Core Plaza', 'Cipher Citadel Roof', '17:35:00', '{1,2,3,4,5}', 9, '00000001-0000-4000-8000-000000000001', 'delayed', 'Vent latéral modéré.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000012', 'CD-06', 'Ferrum Docks Freight Loop', 'cargo_drone', 'Ferrum Docks Hangar A', 'Helios Grid Depot', '04:40:00', '{1,2,3,4,5,6}', 22, '00000001-0000-4000-8000-000000000004', 'scheduled', 'Fret municipal réservé.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000013', 'PH-07', 'Aurora Heights Personal Loop', 'personal_hoverbike', 'Aurora Heights Podium', 'Lumen Gardens Gate', '13:10:00', '{6,7}', 12, '00000001-0000-4000-8000-000000000002', 'scheduled', 'Fenêtre loisirs du week-end.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000014', 'FY-08', 'Lumen Gardens Sky Ferry', 'ferry', 'Lumen Marina', 'Orbis Port Terminal', '11:25:00', '{5,6,7}', 27, '00000001-0000-4000-8000-000000000005', 'scheduled', 'Parcours touristique et événementiel.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000015', 'AA-09', 'Orbis Apex Relay', 'aethelon_apex', 'Orbis Port Terminal', 'Cipher Citadel Roof', '14:55:00', '{1,3,5}', 8, '00000001-0000-4000-8000-000000000007', 'scheduled', 'Liaison premium haute altitude.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000016', 'VP-10', 'Sentinel Rapid Response', 'vortex_phantom', 'Sentinel HQ', 'Ferrum Rescue Depot', '19:25:00', '{1,2,3,4,5,6,7}', 10, '00000001-0000-4000-8000-000000000009', 'scheduled', 'Escorte urgente légère.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000017', 'HT-11', 'Vitalis District ↔ Nexus Core', 'hover_tram', 'Vitalis Central Hospital', 'Nexus Core Central', '07:40:00', '{1,2,3,4,5}', 15, '00000001-0000-4000-8000-000000000006', 'scheduled', 'Flux santé / administration.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000018', 'MG-12', 'Helios Grid ↔ Nexus Core', 'maglev', 'Helios Fusion Plant', 'Nexus Core Central', '15:05:00', '{1,2,3,4,5}', 13, '00000001-0000-4000-8000-000000000003', 'cancelled', 'Maintenance énergétique exceptionnelle.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000019', 'SH-13', 'Academia Spire ↔ Lumen Gardens', 'shuttle', 'Academia Spire Campus', 'Lumen Gardens Canopy', '08:20:00', '{1,2,3,4,5}', 19, '00000001-0000-4000-8000-000000000010', 'scheduled', 'Ligne pédagogique et culturelle.', '2026-10-04T01:20:00Z'),
  ('10000000-0000-4000-8000-000000000020', 'FY-14', 'Aurora Heights Evening Ferry', 'ferry', 'Aurora Heights Belvedere', 'Orbis Port Terminal', '20:30:00', '{5,6,7}', 24, '00000001-0000-4000-8000-000000000002', 'scheduled', 'Dessert les événements du soir.', '2026-10-04T01:20:00Z')
on conflict (id) do update
set
  line_code = excluded.line_code,
  line_name = excluded.line_name,
  transport_type = excluded.transport_type,
  from_stop = excluded.from_stop,
  to_stop = excluded.to_stop,
  departure_time = excluded.departure_time,
  days_of_week = excluded.days_of_week,
  duration_min = excluded.duration_min,
  sector_id = excluded.sector_id,
  status = excluded.status,
  notes = excluded.notes,
  created_at = excluded.created_at;
