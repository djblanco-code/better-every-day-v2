-- 1.6 / 1.7 bring-your-own AI key (Supabase Vault), per-user AI settings, budget, and the audit log.
-- The raw key never sits in a table the API can read: it lives in vault.secrets and is reached only through
-- security-definer functions. Clients can SET a key; reading it back is for the server gateway only (see NOTES).

create extension if not exists supabase_vault with schema vault;

create table public.ai_settings (
  user_id        uuid primary key references public.users (id) on delete cascade,
  provider       text not null default 'anthropic' check (provider in ('anthropic', 'gemini')),
  model          text,
  key_ref        uuid,                                     -- vault.secrets.id
  key_hint       text,                                     -- last 4 chars, for the settings page only
  company_focus  text not null default '',
  default_minutes integer not null default 25,
  updated_at     timestamptz not null default now()
);
alter table public.ai_settings enable row level security;
create policy "ai_settings_select_own" on public.ai_settings for select to authenticated using (user_id = auth.uid());
create policy "ai_settings_update_own" on public.ai_settings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_settings_insert_own" on public.ai_settings for insert to authenticated with check (user_id = auth.uid());
revoke all on public.ai_settings from anon;
revoke update (key_ref) on public.ai_settings from authenticated;   -- only the functions below touch the ref

create table public.audit_log (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users (id) on delete cascade,
  at          timestamptz not null default now(),
  agent       text not null,              -- grader | journal | restate | test_key | ...
  provider    text not null,
  model       text not null,
  input_hash  text not null,
  ok          boolean not null,
  tokens_in   integer not null default 0,
  tokens_out  integer not null default 0,
  cost_cents  numeric(10,4) not null default 0,
  error       text
);
create index audit_log_user_at_idx on public.audit_log (user_id, at);
alter table public.audit_log enable row level security;
create policy "audit_select_own" on public.audit_log for select to authenticated using (user_id = auth.uid());
create policy "audit_insert_own" on public.audit_log for insert to authenticated with check (user_id = auth.uid());
revoke all on public.audit_log from anon;

-- Store (or replace) the caller's key in the Vault. Returns the hint.
create or replace function public.set_ai_key(p_provider text, p_key text)
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  uid uuid := auth.uid();
  ref uuid;
  k   text := trim(p_key);
begin
  if uid is null then raise exception 'not signed in'; end if;
  if length(k) < 10 then raise exception 'key too short'; end if;
  if p_provider not in ('anthropic', 'gemini') then raise exception 'unknown provider'; end if;
  select key_ref into ref from public.ai_settings where user_id = uid;
  if ref is not null then
    perform vault.update_secret(ref, k, 'ai_key_' || uid::text);
  else
    ref := vault.create_secret(k, 'ai_key_' || uid::text);
  end if;
  insert into public.ai_settings (user_id, provider, key_ref, key_hint)
  values (uid, p_provider, ref, right(k, 4))
  on conflict (user_id) do update set provider = excluded.provider, key_ref = excluded.key_ref, key_hint = excluded.key_hint, updated_at = now();
  return right(k, 4);
end;
$$;

-- Remove the caller's key.
create or replace function public.clear_ai_key()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare uid uuid := auth.uid(); ref uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select key_ref into ref from public.ai_settings where user_id = uid;
  if ref is not null then delete from vault.secrets where id = ref; end if;
  update public.ai_settings set key_ref = null, key_hint = null, updated_at = now() where user_id = uid;
end;
$$;

-- Read the caller's own decrypted key. Called by the server gateway only (src/lib/ai); never from a component.
create or replace function public.read_ai_key()
returns text
language plpgsql
security definer
set search_path = public, vault
as $$
declare uid uuid := auth.uid(); ref uuid; k text;
begin
  if uid is null then return null; end if;
  select key_ref into ref from public.ai_settings where user_id = uid;
  if ref is null then return null; end if;
  select decrypted_secret into k from vault.decrypted_secrets where id = ref;
  return k;
end;
$$;

revoke all on function public.set_ai_key(text, text) from public;
revoke all on function public.clear_ai_key() from public;
revoke all on function public.read_ai_key() from public;
grant execute on function public.set_ai_key(text, text) to authenticated;
grant execute on function public.clear_ai_key() to authenticated;
grant execute on function public.read_ai_key() to authenticated;

-- Month-to-date spend, for the budget guard.
create or replace function public.ai_spend_cents_this_month()
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(cost_cents), 0) from public.audit_log
  where user_id = auth.uid() and at >= date_trunc('month', now());
$$;
revoke all on function public.ai_spend_cents_this_month() from public;
grant execute on function public.ai_spend_cents_this_month() to authenticated;
