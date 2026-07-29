-- Fitting-room attendant queue — room column, staff RPCs, Realtime.
-- Run after add-item-requests-table.sql (and recommender-schema.sql so
-- catalog_variations exists). Safe to re-run.

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.item_requests
  add column if not exists fitting_room smallint not null default 2;

alter table public.item_requests
  drop constraint if exists item_requests_fitting_room_check;

alter table public.item_requests
  add constraint item_requests_fitting_room_check
  check (fitting_room between 1 and 5);

alter table public.item_requests
  add column if not exists fulfilled_at timestamptz;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists item_requests_pending_room_idx
  on public.item_requests (fitting_room)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- Staff-safe read: pending + recently handled, with catalog joins
-- ---------------------------------------------------------------------------

create or replace function public.get_room_requests(
  p_store_id text default 'kw-flagship'
)
returns table (
  id uuid,
  created_at timestamptz,
  fulfilled_at timestamptz,
  fitting_room smallint,
  status text,
  size text,
  request_kind text,
  variation_id text,
  title text,
  brand text,
  color_label text,
  image_path text,
  unit_price numeric,
  source_survey_item_id text,
  source_title text
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    ir.id,
    ir.created_at,
    ir.fulfilled_at,
    ir.fitting_room,
    ir.status,
    ir.size,
    ir.request_kind,
    ir.variation_id,
    cv.title,
    cv.brand,
    cv.color_label,
    cv.image_path,
    cv.unit_price,
    ir.source_survey_item_id,
    src.title as source_title
  from public.item_requests ir
  join public.catalog_variations cv
    on cv.variation_id = ir.variation_id
  left join lateral (
    select cv2.title
    from public.catalog_variations cv2
    where cv2.variation_id = ir.source_survey_item_id
       or (cv2.survey_item_id = ir.source_survey_item_id and cv2.is_default)
    order by
      case when cv2.variation_id = ir.source_survey_item_id then 0 else 1 end
    limit 1
  ) src on true
  where ir.store_id = p_store_id
  order by
    case when ir.status = 'pending' then 0 else 1 end,
    ir.created_at asc;
$$;

grant execute on function public.get_room_requests(text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Status transition (Delivered / Out of stock / Undo)
-- ---------------------------------------------------------------------------

create or replace function public.set_request_status(
  p_request_id uuid,
  p_status text
)
returns public.item_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated public.item_requests;
begin
  if p_status not in ('pending', 'fulfilled', 'cancelled') then
    raise exception 'invalid status: %', p_status;
  end if;

  update public.item_requests
  set
    status = p_status,
    fulfilled_at = case
      when p_status = 'pending' then null
      when status = 'pending' then now()
      else coalesce(fulfilled_at, now())
    end
  where id = p_request_id
  returning * into updated;

  if updated.id is null then
    raise exception 'request not found: %', p_request_id;
  end if;

  return updated;
end;
$$;

grant execute on function public.set_request_status(uuid, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime: anon SELECT (postgres_changes respects RLS) + publication
-- Session tokens are anonymous UUIDs; matches anon-readable catalog tables.
-- ---------------------------------------------------------------------------

grant select on table public.item_requests to anon;

drop policy if exists "anon_select_item_requests" on public.item_requests;
create policy "anon_select_item_requests"
  on public.item_requests
  as permissive
  for select
  to anon
  using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'item_requests'
  ) then
    alter publication supabase_realtime add table public.item_requests;
  end if;
end;
$$;
