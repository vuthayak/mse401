-- DEPRECATED for the demo path.
-- Prefer add-insights-aggregates.sql, which returns day/item/intent aggregates
-- and grants execute to anon (no retailer login).
--
-- This file locked insights behind Supabase Auth and coarsened timestamps to
-- the hour while still returning one row per survey response. Keep only if you
-- intentionally want authenticated access to per-response rows.

create or replace function public.get_survey_c_insights_rows()
returns table (
  id uuid,
  created_at timestamptz,
  selected_item text,
  fabric smallint,
  fit smallint,
  colour smallint,
  price smallint,
  intent text
)
language sql
security definer
set search_path = public
as $$
  select
    r.id,
    date_trunc('hour', r.created_at) as created_at,
    r.selected_item,
    r.fabric,
    r.fit,
    r.colour,
    r.price,
    r.intent
  from public.survey_c_responses r
  order by r.created_at desc;
$$;

revoke all on function public.get_survey_c_insights_rows() from public;
revoke execute on function public.get_survey_c_insights_rows() from anon;
grant execute on function public.get_survey_c_insights_rows() to authenticated;
