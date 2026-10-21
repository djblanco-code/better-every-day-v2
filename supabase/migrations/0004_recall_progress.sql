-- 1.4 per-user Recall state. Every table: user_id + RLS (own rows only). Shapes mirror v1 state/recall.json.

create table public.progress (
  user_id   uuid not null references public.users (id) on delete cascade,
  track     text not null,
  item_id   text not null,
  attempts  integer not null default 0,
  best      integer not null default 0,
  last      integer,
  last_date date,
  interval  integer not null default 0,
  next_due  date,
  primary key (user_id, track, item_id)
);

create table public.sessions (
  id             text primary key,                     -- `${date}-${epoch}` like v1
  user_id        uuid not null references public.users (id) on delete cascade,
  date           date not null,
  time           text not null,
  track          text not null,
  item_id        text not null,
  title          text not null default '',
  difficulty     text not null default '',
  topic          text not null default '',
  minutes_used   numeric,
  timer_minutes  integer,
  score          integer not null,
  sub            jsonb not null default '{}'::jsonb,   -- correctness, complexity, code_quality, communication
  verdict        text not null default '',
  strengths      jsonb not null default '[]'::jsonb,
  gaps           jsonb not null default '[]'::jsonb,
  next_step      text not null default '',
  model_outline  text not null default '',
  answer         text not null default '',
  grader         integer,
  model          text,
  created_at     timestamptz not null default now()
);
create index sessions_user_date_idx on public.sessions (user_id, date);

create table public.plans (
  user_id  uuid not null references public.users (id) on delete cascade,
  date     date not null,
  plan     jsonb not null,                              -- { date, week, slots[] }
  primary key (user_id, date)
);

create table public.program (
  user_id    uuid primary key references public.users (id) on delete cascade,
  start      date,
  done       jsonb not null default '{}'::jsonb,        -- reading/homework id -> { date, minutes }
  minutes    jsonb not null default '{}'::jsonb,        -- date -> extra minutes logged
  snapshots  jsonb not null default '{}'::jsonb         -- date -> readiness %
);

create table public.external_reps (
  id       text primary key,
  user_id  uuid not null references public.users (id) on delete cascade,
  date     date not null,
  kind     text not null check (kind in ('mock_interview', 'interview', 'study')),
  with_who text not null default '',
  format   text not null default '',
  rating   integer,
  minutes  integer,
  notes    text not null default ''
);
create index external_reps_user_date_idx on public.external_reps (user_id, date);

-- RLS: own rows only, for every table, in the same migration.
do $$
declare t text;
begin
  foreach t in array array['progress', 'sessions', 'plans', 'program', 'external_reps'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
