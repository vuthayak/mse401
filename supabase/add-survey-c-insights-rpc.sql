-- Read path for the retailer insights dashboard.
-- Returns Survey C rows without session_token (no direct table SELECT for anon).
-- Run in Supabase → SQL Editor after survey_c_responses exists.

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
    r.created_at,
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
grant execute on function public.get_survey_c_insights_rows() to anon;
grant execute on function public.get_survey_c_insights_rows() to authenticated;
