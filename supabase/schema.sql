-- Run this in Supabase → SQL Editor (New query → Run)

create table if not exists public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  survey_variant text not null check (survey_variant in ('A', 'B')),
  session_token text not null,
  fitting_room_id text not null,
  scanned_sku text not null,
  user_decision text not null,
  payload jsonb not null
);

create index if not exists survey_responses_created_at_idx
  on public.survey_responses (created_at desc);

create index if not exists survey_responses_session_token_idx
  on public.survey_responses (session_token);

alter table public.survey_responses enable row level security;

-- Anonymous fitting-room kiosks can insert responses only (no PII).
drop policy if exists "anon_insert_survey_responses" on public.survey_responses;
create policy "anon_insert_survey_responses"
  on public.survey_responses
  for insert
  to anon
  with check (true);
