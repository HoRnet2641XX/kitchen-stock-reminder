grant usage on schema public to service_role;
grant all on table public.kitchen_line_links to service_role;

notify pgrst, 'reload schema';
