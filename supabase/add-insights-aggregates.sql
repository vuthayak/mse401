-- Public insights via aggregates only (demo-friendly, no retailer login).
--
-- Replaces the per-response get_survey_c_insights_rows() payload with one row
-- per (UTC day, selected_item, intent). Counts/sums are enough for the
-- dashboard and CSV export; individual responses never leave Postgres.
--
-- selected_item historically held survey slugs (e.g. nike-windbreaker). New
-- responses store catalog variation_ids. Legacy slugs are normalized to the
-- default variation so the expanded taxonomy still attributes them.
--
-- Run in Supabase → SQL Editor after add-insights-auth.sql (or after the
-- original insights RPC) and recommender-schema.sql. Safe to re-run.

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
  with normalized as (
    select
      r.created_at,
      coalesce(
        (
          select cv.variation_id
          from public.catalog_variations cv
          where cv.survey_item_id = r.selected_item
            and cv.is_default
          limit 1
        ),
        r.selected_item
      ) as selected_item,
      r.intent,
      r.fabric,
      r.fit,
      r.colour,
      r.price
    from public.survey_c_responses r
  )
  select
    date_trunc('day', n.created_at) as created_at,
    n.selected_item,
    n.intent,
    count(*)::bigint as response_count,
    sum(n.fabric)::bigint as sum_fabric,
    sum(n.fit)::bigint as sum_fit,
    sum(n.colour)::bigint as sum_colour,
    sum(n.price)::bigint as sum_price,
    count(*) filter (where n.fabric <= 2)::bigint as unhappy_fabric,
    count(*) filter (where n.fit <= 2)::bigint as unhappy_fit,
    count(*) filter (where n.colour <= 2)::bigint as unhappy_colour,
    count(*) filter (where n.price <= 2)::bigint as unhappy_price,
    count(*) filter (where n.fabric >= 4)::bigint as happy_fabric,
    count(*) filter (where n.fit >= 4)::bigint as happy_fit,
    count(*) filter (where n.colour >= 4)::bigint as happy_colour,
    count(*) filter (where n.price >= 4)::bigint as happy_price
  from normalized n
  group by 1, 2, 3
  order by 1 desc, 2, 3;
$$;

revoke all on function public.get_survey_c_insights_rows() from public;
grant execute on function public.get_survey_c_insights_rows() to anon;
grant execute on function public.get_survey_c_insights_rows() to authenticated;

comment on function public.get_survey_c_insights_rows() is
  'Retailer insights aggregates: one row per (day, item, intent). Legacy survey slugs map to default variation_ids. No individual responses or session tokens.';
