create table if not exists public.login_alert_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_hash text not null check (device_hash ~ '^[a-f0-9]{64}$'),
  first_seen_at timestamptz not null default now(),
  unique (user_id, device_hash)
);

alter table public.login_alert_devices enable row level security;
revoke all on public.login_alert_devices from public, anon, authenticated;
grant select, insert, delete on public.login_alert_devices to service_role;
