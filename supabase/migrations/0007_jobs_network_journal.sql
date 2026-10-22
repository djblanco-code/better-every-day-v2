-- Phase 2/3: Jobs (applications, searches, assessments, actions), Network (people, events), Journal (entries).
-- Every table: user_id + own-row RLS in this same migration. Shapes mirror v1 state/tracker.json + journal/network.

create table public.searches (
  id        text not null,
  user_id   uuid not null references public.users (id) on delete cascade,
  name      text not null,
  start     date not null,
  "end"     date,
  primary key (user_id, id)
);

create table public.applications (
  id          text not null,                       -- v1 key (sha1 of url) or new id
  user_id     uuid not null references public.users (id) on delete cascade,
  company     text not null,
  role        text not null default '',
  location    text not null default '',
  pay         text not null default '',
  url         text not null default '',
  source      text not null default 'me' check (source in ('agent', 'me')),
  stage       text not null default 'applied' check (stage in ('applied','intro_call','interview','final','offer','ghosted','rejected','passed')),
  applied_on  date not null,
  notes       text not null default '',
  follow_up   text not null default '',
  history     jsonb not null default '[]'::jsonb,   -- [{stage, on}]
  record      text not null default '',
  search_id   text,
  kind        text not null default 'applied' check (kind in ('applied', 'todo')),   -- todo = "apply yourself" row
  blocker     text not null default '',
  todo        text not null default '',
  todo_status text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);
create index applications_user_stage_idx on public.applications (user_id, stage);
create index applications_user_date_idx on public.applications (user_id, applied_on);

create table public.assessments (
  id       text not null,
  user_id  uuid not null references public.users (id) on delete cascade,
  company  text not null,
  role     text not null default '',
  platform text not null default '',
  minutes  text not null default '',
  invited  date,
  due      date,
  status   text not null default 'todo' check (status in ('todo', 'done', 'expired', 'skipped')),
  notes    text not null default '',
  primary key (user_id, id)
);

create table public.actions (
  id       text not null,
  user_id  uuid not null references public.users (id) on delete cascade,
  company  text not null,
  text     text not null,
  type     text not null default 'schedule',
  due      date,
  note     text not null default '',
  done     boolean not null default false,
  primary key (user_id, id)
);

create table public.people (
  id                text not null,
  user_id           uuid not null references public.users (id) on delete cascade,
  entry_id          text,
  date              date,
  name              text not null,
  company           text not null default '',
  role              text not null default '',
  relationship      text not null default 'contact' check (relationship in ('contact', 'mentor', 'recruiter', 'peer')),
  met_at            text not null default '',
  how_they_can_help text not null default '',
  follow_up         text not null default '',
  follow_up_done    boolean not null default false,
  email             text not null default '',
  linkedin          text not null default '',
  notes             text not null default '',
  primary key (user_id, id)
);

create table public.events (
  id       text not null,
  user_id  uuid not null references public.users (id) on delete cascade,
  entry_id text,
  date     date,
  name     text not null,
  kind     text not null default 'other',
  org      text not null default '',
  notes    text not null default '',
  primary key (user_id, id)
);

create table public.journal_entries (
  id          text not null,
  user_id     uuid not null references public.users (id) on delete cascade,
  date        date not null,
  time        text not null default '',
  text        text not null,
  summary     text,
  items       jsonb not null default '[]'::jsonb,
  parse_error text not null default '',
  parser      integer not null default 2,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

do $$
declare t text;
begin
  foreach t in array array['searches', 'applications', 'assessments', 'actions', 'people', 'events', 'journal_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = auth.uid())', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = auth.uid())', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = auth.uid())', t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
