-- Run this in Supabase → SQL Editor if survey_a_responses / survey_b_responses
-- already exist and you only need to add the Survey C table.
-- Safe to re-run; leaves existing tables and data untouched.

create table if not exists public.survey_c_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_token text not null,
  selected_item text not null,
  fabric smallint not null check (fabric between 1 and 5),
  fit smallint not null check (fit between 1 and 5),
  colour smallint not null check (colour between 1 and 5),
  price smallint not null check (price between 1 and 5),
  intent text not null check (intent in ('YES', 'NO'))
);

create index if not exists survey_c_responses_created_at_idx
  on public.survey_c_responses (created_at desc);

create index if not exists survey_c_responses_session_token_idx
  on public.survey_c_responses (session_token);

alter table public.survey_c_responses enable row level security;

grant usage on schema public to anon;
grant insert on table public.survey_c_responses to anon;

drop policy if exists "anon_insert_survey_c_responses" on public.survey_c_responses;
create policy "anon_insert_survey_c_responses"
  on public.survey_c_responses
  as permissive
  for insert
  to anon
  with check (true);
