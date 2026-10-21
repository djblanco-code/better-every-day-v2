-- 1.5 session drafts: what the user has typed for a problem, autosaved so a draft started on the phone shows up
-- on the laptop. One row per (user, track, item). RLS: own rows only.

create table public.drafts (
  user_id    uuid not null references public.users (id) on delete cascade,
  track      text not null,
  item_id    text not null,
  text       text not null default '',
  started_at timestamptz,                 -- when the timer was started (null until Start is pressed)
  updated_at timestamptz not null default now(),
  primary key (user_id, track, item_id)
);

alter table public.drafts enable row level security;
create policy "drafts_select_own" on public.drafts for select to authenticated using (user_id = auth.uid());
create policy "drafts_insert_own" on public.drafts for insert to authenticated with check (user_id = auth.uid());
create policy "drafts_update_own" on public.drafts for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "drafts_delete_own" on public.drafts for delete to authenticated using (user_id = auth.uid());
revoke all on public.drafts from anon;
