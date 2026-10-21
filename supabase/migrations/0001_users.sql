-- 0.6 users table. One row per signed-in account, created by a trigger on auth.users.
-- Rule (PROCESS.md): every table gets user ownership + RLS in the same migration that creates it.

create table public.users (
  id           uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  created_at   timestamptz not null default now(),
  invited      boolean not null default false,          -- set once the invite code is accepted (task 0.5)
  budget_cents integer not null default 1000            -- monthly AI spend cap, $10 default (PRD section 3)
);

alter table public.users enable row level security;

-- A user sees and edits only their own row. No insert or delete policy: rows are created by the trigger
-- below (security definer) and removed by the cascade when the auth user is deleted.
create policy "users_select_own" on public.users
  for select to authenticated using (id = auth.uid());

create policy "users_update_own" on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- The anon role gets nothing at all.
revoke all on public.users from anon;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email) values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill anyone who signed in before this migration ran.
insert into public.users (id, email)
select id, coalesce(email, '') from auth.users
on conflict (id) do nothing;
