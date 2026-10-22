-- 5.1 RLS performance: `auth.uid()` wrapped in a subselect so Postgres evaluates it once per statement (initPlan)
-- instead of once per row. Supabase's guide measures ~95% faster policy checks on large tables.
-- Generic: every policy in `public` whose expression mentions a bare auth.uid() is dropped and recreated with the
-- same name, command, roles and expressions, only the call wrapped. Idempotent: a second run finds nothing to change.
do $$
declare p record; q text; w text; rl text;
begin
  for p in
    select schemaname, tablename, policyname, cmd, permissive, qual, with_check, array_to_string(roles, ', ') as r
    from pg_policies
    where schemaname = 'public'
      and (coalesce(qual, '') like '%auth.uid()%' or coalesce(with_check, '') like '%auth.uid()%')
      and coalesce(qual, '') not like '%( SELECT auth.uid()%'
      and coalesce(with_check, '') not like '%( SELECT auth.uid()%'
  loop
    q := replace(p.qual, 'auth.uid()', '(select auth.uid())');
    w := replace(p.with_check, 'auth.uid()', '(select auth.uid())');
    rl := p.r;
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    execute format('create policy %I on %I.%I as %s for %s to %s %s %s',
      p.policyname, p.schemaname, p.tablename,
      case when p.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      lower(p.cmd), rl,
      case when q is not null then 'using (' || q || ')' else '' end,
      case when w is not null then 'with check (' || w || ')' else '' end);
  end loop;
end $$;

-- 5.2 Policy-column indexes. Every own-rows table already leads its primary key with user_id, or has a (user_id, ...)
-- index (sessions, external_reps, audit_log, applications). Nothing to add; this query is the proof, kept for re-runs:
--   select tablename from pg_tables t where schemaname = 'public'
--     and exists (select 1 from information_schema.columns c where c.table_name = t.tablename and c.column_name = 'user_id')
--     and not exists (select 1 from pg_indexes i where i.tablename = t.tablename and i.indexdef like '%(user_id%');
