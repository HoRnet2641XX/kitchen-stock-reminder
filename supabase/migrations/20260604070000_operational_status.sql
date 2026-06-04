create or replace function public.get_kitchen_operational_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, extensions, cron
as $$
declare
  v_profiles bigint := 0;
  v_push_active bigint := 0;
  v_events_24h bigint := 0;
  v_cron_active boolean := false;
  v_cron_schedule text := null;
begin
  select count(*) into v_profiles from public.kitchen_stock_profiles;
  select count(*) into v_push_active from public.kitchen_push_subscriptions where status = 'active';
  select count(*) into v_events_24h
    from public.kitchen_client_events
   where created_at >= now() - interval '24 hours';

  select active, schedule
    into v_cron_active, v_cron_schedule
    from cron.job
   where jobname = 'kitchen_stock_reminders'
   order by jobid desc
   limit 1;

  return jsonb_build_object(
    'profiles', v_profiles,
    'pushActive', v_push_active,
    'clientEvents24h', v_events_24h,
    'cronActive', coalesce(v_cron_active, false),
    'cronSchedule', v_cron_schedule,
    'checkedAt', now()
  );
exception when others then
  return jsonb_build_object(
    'profiles', v_profiles,
    'pushActive', v_push_active,
    'clientEvents24h', v_events_24h,
    'cronActive', false,
    'cronSchedule', null,
    'error', sqlerrm,
    'checkedAt', now()
  );
end;
$$;

grant execute on function public.get_kitchen_operational_status() to service_role;
