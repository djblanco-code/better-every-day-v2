-- 1.1 shared question banks + curriculum. Read-only for every signed-in user; written only by the seed script
-- (service role) so nobody's progress can alter the shared problem set.

create table public.banks (
  track      text not null,          -- leetcode | python | system_design | dsa | debugging | curriculum
  item_id    text not null,          -- problem slug / bank id / week number
  data       jsonb not null,         -- the item exactly as in supabase/seed/*.json
  updated_at timestamptz not null default now(),
  primary key (track, item_id)
);

alter table public.banks enable row level security;

create policy "banks_read_authenticated" on public.banks
  for select to authenticated using (true);

revoke all on public.banks from anon;
-- no insert/update/delete policies: the service role bypasses RLS and is the only writer

create index banks_track_idx on public.banks (track);
