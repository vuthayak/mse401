-- Retention policy: sever session linkage after 24 hours, drop item requests
-- after 1 day, and drop cleared fitting-room carts after 24 hours. Ratings
-- remain for analytics; only the pseudonymous link that ties multiple
-- responses to one kiosk session is cleared.
--
-- Run in Supabase → SQL Editor.
-- Requires the pg_cron extension (Database → Extensions → pg_cron). If the
-- extension is unavailable on your plan, still create the purge function and
-- invoke it manually or from an external scheduler:
--   select public.purge_expired_session_tokens();

alter table public.survey_a_responses
  alter column session_token drop not null;

alter table public.survey_b_responses
  alter column session_token drop not null;

alter table public.survey_c_responses
  alter column session_token drop not null;

create or replace function public.purge_expired_session_tokens()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Null session tokens older than 24 hours so responses can no longer be
  -- linked across a session. Ratings and intent stay for retailer analytics.
  update public.survey_a_responses
    set session_token = null
    where session_token is not null
      and created_at < now() - interval '24 hours';

  update public.survey_b_responses
    set session_token = null
    where session_token is not null
      and created_at < now() - interval '24 hours';

  update public.survey_c_responses
    set session_token = null
    where session_token is not null
      and created_at < now() - interval '24 hours';

  -- Item requests identify a garment size request for staff fulfillment;
  -- drop them after 1 day once the operational window has closed.
  delete from public.item_requests
    where created_at < now() - interval '1 day';

  -- Cleared fitting-room carts (and cascaded items) after 24 hours.
  if to_regclass('public.fitting_room_carts') is not null then
    delete from public.fitting_room_carts
      where cleared_at is not null
        and cleared_at < now() - interval '24 hours';
  end if;
end;
$$;

revoke all on function public.purge_expired_session_tokens() from public;
-- Callable by service role / SQL editor only — not by anon or authenticated.

-- Schedule hourly if pg_cron is available. Safe to re-run: unschedule first.
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge-expired-session-tokens';

    perform cron.schedule(
      'purge-expired-session-tokens',
      '0 * * * *',
      $cron$select public.purge_expired_session_tokens()$cron$
    );
  else
    raise notice
      'pg_cron is not installed — create the function only. Call purge_expired_session_tokens() manually or from an external scheduler.';
  end if;
end;
$$;
