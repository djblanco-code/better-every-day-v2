-- 7.x Job Tracker redesign: a dated next action on every application, and mail suggestions from the inbox.
alter table public.applications
  add column if not exists next_action     text not null default '',
  add column if not exists next_action_on  text,
  add column if not exists last_contact_on text;
create index if not exists applications_user_next_idx on public.applications (user_id, next_action_on);

-- get_jobs_state() (0009) now carries the new columns.
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
        'record', record, 'search_id', search_id, 'kind', kind, 'blocker', blocker, 'todo', todo, 'todo_status', todo_status,
        'next_action', next_action, 'next_action_on', next_action_on, 'last_contact_on', last_contact_on)
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

-- Gmail app password, stored in the Vault exactly like the AI key (0006). The address is the mailbox to read.
create table public.mail_settings (
  user_id         uuid primary key references public.users (id) on delete cascade,
  address         text not null default '',
  secret_ref      uuid,
  secret_hint     text,
  last_checked_at timestamptz,
  updated_at      timestamptz not null default now()
);
alter table public.mail_settings enable row level security;
create policy "mail_settings_select_own" on public.mail_settings for select to authenticated using (user_id = (select auth.uid()));
create policy "mail_settings_update_own" on public.mail_settings for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mail_settings_insert_own" on public.mail_settings for insert to authenticated with check (user_id = (select auth.uid()));
revoke all on public.mail_settings from anon;
revoke update (secret_ref, secret_hint) on public.mail_settings from authenticated;

create or replace function public.set_mail_secret(p_address text, p_secret text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare uid uuid := auth.uid(); ref uuid; k text := regexp_replace(trim(p_secret), '\s', '', 'g');
begin
  if uid is null then raise exception 'not signed in'; end if;
  if length(k) < 8 then raise exception 'app password too short'; end if;
  if p_address !~ '^[^@\s]+@[^@\s]+$' then raise exception 'bad address'; end if;
  select secret_ref into ref from public.mail_settings where user_id = uid;
  if ref is not null then perform vault.update_secret(ref, k, 'mail_' || uid::text);
  else ref := vault.create_secret(k, 'mail_' || uid::text); end if;
  insert into public.mail_settings (user_id, address, secret_ref, secret_hint)
  values (uid, lower(trim(p_address)), ref, right(k, 4))
  on conflict (user_id) do update set address = excluded.address, secret_ref = excluded.secret_ref, secret_hint = excluded.secret_hint, updated_at = now();
  return right(k, 4);
end;
$$;

create or replace function public.clear_mail_secret()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare uid uuid := auth.uid(); ref uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select secret_ref into ref from public.mail_settings where user_id = uid;
  if ref is not null then delete from vault.secrets where id = ref; end if;
  update public.mail_settings set secret_ref = null, secret_hint = null, updated_at = now() where user_id = uid;
end;
$$;

-- Read the caller's own app password. Called by the mail checker on the server only.
create or replace function public.read_mail_secret()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare uid uuid := auth.uid(); ref uuid; k text;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select secret_ref into ref from public.mail_settings where user_id = uid;
  if ref is null then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where id = ref;
  return k;
end;
$$;
revoke all on function public.set_mail_secret(text, text), public.clear_mail_secret(), public.read_mail_secret() from public, anon;
grant execute on function public.set_mail_secret(text, text), public.clear_mail_secret(), public.read_mail_secret() to authenticated;

-- One row per inbox message the checker thinks is about an application. The user confirms or dismisses.
create table public.mail_suggestions (
  user_id      uuid not null references public.users (id) on delete cascade,
  id           text not null,                       -- message id from the mailbox, so a re-check is idempotent
  received_at  timestamptz not null,
  from_addr    text not null default '',
  from_name    text not null default '',
  subject      text not null default '',
  snippet      text not null default '',
  kind         text not null default 'other' check (kind in ('interview', 'assessment', 'rejection', 'offer', 'other')),
  app_id       text,                                -- matched application, if any
  company      text not null default '',
  status       text not null default 'new' check (status in ('new', 'applied', 'dismissed')),
  created_at   timestamptz not null default now(),
  primary key (user_id, id)
);
create index mail_suggestions_user_status_idx on public.mail_suggestions (user_id, status, received_at desc);
alter table public.mail_suggestions enable row level security;
create policy "mail_suggestions_select_own" on public.mail_suggestions for select to authenticated using (user_id = (select auth.uid()));
create policy "mail_suggestions_insert_own" on public.mail_suggestions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "mail_suggestions_update_own" on public.mail_suggestions for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "mail_suggestions_delete_own" on public.mail_suggestions for delete to authenticated using (user_id = (select auth.uid()));
revoke all on public.mail_suggestions from anon;
