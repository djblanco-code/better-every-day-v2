-- 0.5 invite gate. The invite code lives in a private schema that the API never exposes; accepting it is a
-- security-definer function, so a client can never flip users.invited directly.

create schema if not exists private;
revoke all on schema private from anon, authenticated;

create table if not exists private.config (
  key   text primary key,
  value text not null
);
alter table private.config enable row level security;   -- no policies: only the owner (and security-definer functions) read it

-- Clients may update their own row (RLS) but never these two columns.
revoke update (invited, budget_cents) on public.users from authenticated;

create or replace function public.accept_invite(code text)
returns boolean
language plpgsql
security definer
set search_path = public, private
as $$
declare
  expected text;
begin
  if auth.uid() is null then
    return false;
  end if;
  select value into expected from private.config where key = 'invite_code';
  if expected is null or code is null or length(code) = 0 then
    return false;
  end if;
  -- constant-time comparison is not available in plpgsql; the code is low-value and rate-limited by auth
  if trim(code) <> expected then
    return false;
  end if;
  update public.users set invited = true where id = auth.uid();
  return true;
end;
$$;

revoke all on function public.accept_invite(text) from public;
grant execute on function public.accept_invite(text) to authenticated;

-- The owner sets the code once (and can rotate it) with:
--   insert into private.config (key, value) values ('invite_code', 'NEW-CODE')
--   on conflict (key) do update set value = excluded.value;
