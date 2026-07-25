-- Run this in Supabase → SQL Editor (New query → Run)
-- Breaking change: drops legacy survey_responses table.

drop table if exists public.survey_responses;

create table if not exists public.survey_a_responses (
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

create table if not exists public.survey_b_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_token text not null,
  selected_item text not null,
  intent text not null check (intent in ('YES', 'NO')),
  fabric boolean not null,
  fit boolean not null,
  colour boolean not null,
  price boolean not null
);

-- Survey C: 2x2 grid of 5-point scales, purchase intent captured last.
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

create index if not exists survey_a_responses_created_at_idx
  on public.survey_a_responses (created_at desc);

create index if not exists survey_a_responses_session_token_idx
  on public.survey_a_responses (session_token);

create index if not exists survey_b_responses_created_at_idx
  on public.survey_b_responses (created_at desc);

create index if not exists survey_b_responses_session_token_idx
  on public.survey_b_responses (session_token);

create index if not exists survey_c_responses_created_at_idx
  on public.survey_c_responses (created_at desc);

create index if not exists survey_c_responses_session_token_idx
  on public.survey_c_responses (session_token);

alter table public.survey_a_responses enable row level security;
alter table public.survey_b_responses enable row level security;
alter table public.survey_c_responses enable row level security;

grant usage on schema public to anon;
grant insert on table public.survey_a_responses to anon;
grant insert on table public.survey_b_responses to anon;
grant insert on table public.survey_c_responses to anon;

-- Insights dashboard reads via RPC (no direct table SELECT for anon).
-- See supabase/add-survey-c-insights-rpc.sql for get_survey_c_insights_rows().

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

drop policy if exists "anon_insert_survey_c_responses" on public.survey_c_responses;
create policy "anon_insert_survey_c_responses"
  on public.survey_c_responses
  as permissive
  for insert
  to anon
  with check (true);
