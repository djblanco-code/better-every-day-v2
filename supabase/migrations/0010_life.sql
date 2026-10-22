-- Phase 6: Life (habits, health check-ins, money). Own rows only, same pattern as 0007, policies already in
-- initPlan form. Amounts are integer cents; dates are ISO text like the rest of the schema.
create table public.habits (
  user_id     uuid not null references public.users (id) on delete cascade,
  id          text not null,
  name        text not null,
  icon        text not null default '',
  cadence     text not null default 'daily' check (cadence in ('daily', 'weekdays', 'weekly')),
  target_per_week int not null default 7,
  active      boolean not null default true,
  sort        int not null default 0,
  created_at  timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.habit_logs (
  user_id   uuid not null references public.users (id) on delete cascade,
  habit_id  text not null,
  date      text not null,
  done      boolean not null default true,
  note      text not null default '',
  entry_id  text,
  primary key (user_id, habit_id, date)
);
create index habit_logs_user_date_idx on public.habit_logs (user_id, date);

-- One row per day: the morning check-in plus what the day looked like. `time_available` is minutes the user
-- can give Recall today; the plan trims to it.
create table public.checkins (
  user_id          uuid not null references public.users (id) on delete cascade,
  date             text not null,
  sleep_hours      numeric(3,1),
  energy           int check (energy between 1 and 5),
  mood             int check (mood between 1 and 5),
  exercise_minutes int not null default 0,
  weight           numeric(5,1),
  time_available   int,
  note             text not null default '',
  updated_at       timestamptz not null default now(),
  primary key (user_id, date)
);

create table public.transactions (
  user_id      uuid not null references public.users (id) on delete cascade,
  id           text not null,
  date         text not null,
  kind         text not null default 'expense' check (kind in ('expense', 'income')),
  amount_cents int not null check (amount_cents >= 0),
  category     text not null default 'other',
  merchant     text not null default '',
  note         text not null default '',
  entry_id     text,
  primary key (user_id, id)
);
create index transactions_user_date_idx on public.transactions (user_id, date);

-- Standing monthly limit per category (no month column: the same limit applies every month until changed).
create table public.budgets (
  user_id     uuid not null references public.users (id) on delete cascade,
  category    text not null,
  limit_cents int not null check (limit_cents >= 0),
  primary key (user_id, category)
);

do $$
declare t text;
begin
  foreach t in array array['habits', 'habit_logs', 'checkins', 'transactions', 'budgets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
