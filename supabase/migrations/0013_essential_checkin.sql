-- Phase 10: the morning check-in (PRD §4.8). Domain-neutral goal areas; per-goal minute commitments; the free-time
-- suggestion kept next to the confirmed number so later personalization can see how often they differ.

-- 1. Goal areas, neutral: career, craft, body, mind, money, people, projects, other. Old rows are mapped.
alter table public.goals drop constraint if exists goals_area_check;
update public.goals set area = case area
  when 'job' then 'career' when 'interview' then 'craft' when 'network' then 'people'
  when 'health' then 'body' when 'learn' then 'craft' else area end;
alter table public.goals add constraint goals_area_check
  check (area in ('career', 'craft', 'body', 'mind', 'money', 'people', 'projects', 'other'));

-- 2. The check-in answers that were missing.
alter table public.day_plans
  add column if not exists allocations        jsonb not null default '{}'::jsonb,   -- { goal_id: minutes }
  add column if not exists busy_until         text,                                   -- "HH:MM", from the user or a calendar
  add column if not exists suggested_minutes  int,                                    -- what the app proposed before the user confirmed
  add column if not exists summary            text not null default '';               -- the encouraging line shown that morning
