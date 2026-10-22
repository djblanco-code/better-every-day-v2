-- 5.4 One round trip for the Jobs pages. `security invoker` (the default): RLS still decides what the caller sees,
-- the function only bundles the four selects that loadJobs() used to run as four parallel HTTP requests.
create or replace function public.get_jobs_state()
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  select jsonb_build_object(
    'searches', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'start', start, 'end', "end") order by start)
      from public.searches where user_id = (select auth.uid())), '[]'::jsonb),
    'applications', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'company', company, 'role', role, 'location', location, 'pay', pay, 'url', url, 'source', source,
        'stage', stage, 'applied_on', applied_on, 'notes', notes, 'follow_up', follow_up, 'history', history,
        'record', record, 'search_id', search_id, 'kind', kind, 'blocker', blocker, 'todo', todo, 'todo_status', todo_status)
        order by applied_on desc)
      from public.applications where user_id = (select auth.uid())), '[]'::jsonb),
    'assessments', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'company', company, 'role', role, 'platform', platform,
        'minutes', minutes, 'invited', invited, 'due', due, 'status', status, 'notes', notes))
      from public.assessments where user_id = (select auth.uid())), '[]'::jsonb),
    'actions', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'company', company, 'text', text, 'type', type, 'due', due,
        'note', note, 'done', done))
      from public.actions where user_id = (select auth.uid())), '[]'::jsonb)
  );
$$;
revoke all on function public.get_jobs_state() from public, anon;
grant execute on function public.get_jobs_state() to authenticated;

-- 5.5 Keep-alive target for the daily cron: the cheapest statement that counts as database activity. Callable by
-- anon on purpose; it returns the clock and nothing else.
create or replace function public.ping()
returns timestamptz
language sql
stable
as $$ select now(); $$;
grant execute on function public.ping() to anon, authenticated;
