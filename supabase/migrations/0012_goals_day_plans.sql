-- Phase 9: goals (the once questionnaire) and the daily plan ritual (asked once per planning day, 6:00 America/New_York).
create table public.goals (
  user_id    uuid not null references public.users (id) on delete cascade,
  id         text not null,
  area       text not null check (area in ('job', 'interview', 'network', 'health', 'money', 'learn', 'other')),
  title      text not null,                 -- "what done looks like"
  why        text not null default '',
  priority   int not null default 0,        -- 0 = most important
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- One row per user: the answers that are not a goal (wish, obstacle, if-then plan, weekly hours, best time, days off).
create table public.goal_profile (
  user_id        uuid primary key references public.users (id) on delete cascade,
  wish           text not null default '',
  obstacle       text not null default '',
  if_then        text not null default '',
  hours_per_week int not null default 7,
  best_time      text not null default 'morning' check (best_time in ('morning', 'afternoon', 'evening')),
  days_off       text[] not null default '{}',   -- 'sun'..'sat'
  updated_at     timestamptz not null default now()
);

-- The daily plan: asked once per planning day. `day` is the date in America/New_York after the 6:00 reset.
create table public.day_plans (
  user_id        uuid not null references public.users (id) on delete cascade,
  day            text not null,
  time_available int not null check (time_available between 0 and 600),
  energy         int check (energy between 1 and 5),
  focus_goal_id  text,
  note           text not null default '',
  created_at     timestamptz not null default now(),
  primary key (user_id, day)
);

do $$
declare t text;
begin
  foreach t in array array['goals', 'goal_profile', 'day_plans'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
