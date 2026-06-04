create extension if not exists pgcrypto with schema extensions;

create table if not exists public.kitchen_stock_profiles (
  device_id text primary key,
  secret_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.kitchen_stock_profiles enable row level security;

revoke all on public.kitchen_stock_profiles from anon, authenticated;

create or replace function public.hash_kitchen_stock_secret(p_secret text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(extensions.digest(coalesce(p_secret, ''), 'sha256'), 'hex');
$$;

create or replace function public.get_kitchen_stock_state(p_device_id text, p_secret text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  v_secret_hash text := public.hash_kitchen_stock_secret(p_secret);
  v_payload jsonb;
begin
  select payload
    into v_payload
    from public.kitchen_stock_profiles
   where device_id = p_device_id
     and secret_hash = v_secret_hash;

  return v_payload;
end;
$$;

create or replace function public.upsert_kitchen_stock_state(p_device_id text, p_secret text, p_payload jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v_secret_hash text := public.hash_kitchen_stock_secret(p_secret);
  v_updated_at timestamptz;
begin
  if p_device_id is null or length(trim(p_device_id)) < 8 then
    raise exception 'invalid device id';
  end if;

  if p_secret is null or length(trim(p_secret)) < 20 then
    raise exception 'invalid sync secret';
  end if;

  if exists (
    select 1
      from public.kitchen_stock_profiles
     where device_id = p_device_id
       and secret_hash <> v_secret_hash
  ) then
    raise exception 'invalid sync secret';
  end if;

  insert into public.kitchen_stock_profiles as profiles (
    device_id,
    secret_hash,
    payload,
    updated_at
  )
  values (
    p_device_id,
    v_secret_hash,
    coalesce(p_payload, '{}'::jsonb),
    now()
  )
  on conflict (device_id) do update
    set payload = excluded.payload,
        updated_at = now()
    where profiles.secret_hash = excluded.secret_hash
  returning updated_at into v_updated_at;

  return jsonb_build_object('device_id', p_device_id, 'updated_at', v_updated_at);
end;
$$;

grant execute on function public.get_kitchen_stock_state(text, text) to anon, authenticated;
grant execute on function public.upsert_kitchen_stock_state(text, text, jsonb) to anon, authenticated;
