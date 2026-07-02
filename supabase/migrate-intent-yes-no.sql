-- Run in Supabase SQL Editor if tables already exist with old intent values.
-- Drops existing response data.

drop table if exists public.survey_a_responses;
drop table if exists public.survey_b_responses;

-- Then run supabase/schema.sql
