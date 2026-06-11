create table if not exists public.kitchen_line_links (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  secret_hash text not null,
  code text not null unique,
  line_user_id text,
  line_display_name text,
  status text not null default 'pending',
  expires_at timestamptz not null,
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint kitchen_line_links_status_check check (status in ('pending', 'linked', 'expired'))
);

alter table public.kitchen_line_links enable row level security;
revoke all on public.kitchen_line_links from anon, authenticated;

create index if not exists kitchen_line_links_device_idx
  on public.kitchen_line_links(device_id, secret_hash, created_at desc);

create index if not exists kitchen_line_links_status_expires_idx
  on public.kitchen_line_links(status, expires_at);

create index if not exists kitchen_line_links_linked_idx
  on public.kitchen_line_links(device_id, secret_hash, linked_at desc)
  where status = 'linked' and line_user_id is not null;

grant usage on schema public to service_role;
grant all on table public.kitchen_line_links to service_role;

notify pgrst, 'reload schema';
