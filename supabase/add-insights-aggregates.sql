-- Public insights via aggregates only (demo-friendly, no retailer login).
--
-- Replaces the per-response get_survey_c_insights_rows() payload with one row
-- per (UTC day, selected_item, intent). Counts/sums are enough for the
-- dashboard and CSV export; individual responses never leave Postgres.
--
-- Run in Supabase → SQL Editor after add-insights-auth.sql (or after the
-- original insights RPC). Safe to re-run.

drop function if exists public.get_survey_c_insights_rows();

create or replace function public.get_survey_c_insights_rows()
returns table (
  created_at timestamptz,
  selected_item text,
  intent text,
  response_count bigint,
  sum_fabric bigint,
  sum_fit bigint,
  sum_colour bigint,
  sum_price bigint,
  unhappy_fabric bigint,
  unhappy_fit bigint,
  unhappy_colour bigint,
  unhappy_price bigint,
  happy_fabric bigint,
  happy_fit bigint,
  happy_colour bigint,
  happy_price bigint
)
language sql
security definer
set search_path = public
as $$
  select
    date_trunc('day', r.created_at) as created_at,
    r.selected_item,
    r.intent,
    count(*)::bigint as response_count,
    sum(r.fabric)::bigint as sum_fabric,
    sum(r.fit)::bigint as sum_fit,
    sum(r.colour)::bigint as sum_colour,
    sum(r.price)::bigint as sum_price,
    count(*) filter (where r.fabric <= 2)::bigint as unhappy_fabric,
    count(*) filter (where r.fit <= 2)::bigint as unhappy_fit,
    count(*) filter (where r.colour <= 2)::bigint as unhappy_colour,
    count(*) filter (where r.price <= 2)::bigint as unhappy_price,
    count(*) filter (where r.fabric >= 4)::bigint as happy_fabric,
    count(*) filter (where r.fit >= 4)::bigint as happy_fit,
    count(*) filter (where r.colour >= 4)::bigint as happy_colour,
    count(*) filter (where r.price >= 4)::bigint as happy_price
  from public.survey_c_responses r
  group by 1, 2, 3
  order by 1 desc, 2, 3;
$$;

revoke all on function public.get_survey_c_insights_rows() from public;
grant execute on function public.get_survey_c_insights_rows() to anon;
grant execute on function public.get_survey_c_insights_rows() to authenticated;

comment on function public.get_survey_c_insights_rows() is
  'Retailer insights aggregates: one row per (day, item, intent). No individual responses or session tokens.';
