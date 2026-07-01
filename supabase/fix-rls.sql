-- Run this if you already created the tables and still see RLS errors.

grant usage on schema public to anon;
grant insert on table public.survey_a_responses to anon;
grant insert on table public.survey_b_responses to anon;

drop policy if exists "anon_insert_survey_a_responses" on public.survey_a_responses;
create policy "anon_insert_survey_a_responses"
  on public.survey_a_responses
  as permissive
  for insert
  to anon
  with check (true);

drop policy if exists "anon_insert_survey_b_responses" on public.survey_b_responses;
create policy "anon_insert_survey_b_responses"
  on public.survey_b_responses
  as permissive
  for insert
  to anon
  with check (true);
