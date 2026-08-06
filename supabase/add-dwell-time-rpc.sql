-- Historical dwell-time aggregates for the attendant dashboard (FR-11).
--
-- Returns one row per room and one row per catalog variation across completed
-- fitting-room carts (cleared_at is not null). Cart duration is
-- coalesce(finished_at, cleared_at) - created_at. Per-item duration is derived
-- by splitting each cart's duration evenly across its items (no per-item
-- timestamps exist on fitting_room_cart_items).
--
-- Client computes averages from session_count + total_seconds.
-- Run after add-fitting-room-carts.sql. Safe to re-run.

create or replace function public.get_dwell_time_stats(
  p_store_id text default 'kw-flagship'
)
returns table (
  scope text,
  scope_key text,
  session_count bigint,
  total_seconds numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with completed as (
    select
      c.id as cart_id,
      c.fitting_room,
      extract(
        epoch from (
          coalesce(c.finished_at, c.cleared_at) - c.created_at
        )
      )::numeric as duration_seconds
    from public.fitting_room_carts c
    where c.store_id = coalesce(p_store_id, 'kw-flagship')
      and c.cleared_at is not null
      and coalesce(c.finished_at, c.cleared_at) > c.created_at
  ),
  room_stats as (
    select
      'room'::text as scope,
      c.fitting_room::text as scope_key,
      count(*)::bigint as session_count,
      coalesce(sum(c.duration_seconds), 0)::numeric as total_seconds
    from completed c
    group by c.fitting_room
  ),
  item_counts as (
    select
      i.cart_id,
      count(*)::numeric as item_count
    from public.fitting_room_cart_items i
    join completed c on c.cart_id = i.cart_id
    group by i.cart_id
  ),
  item_stats as (
    select
      'item'::text as scope,
      i.variation_id as scope_key,
      count(*)::bigint as session_count,
      coalesce(
        sum(c.duration_seconds / nullif(ic.item_count, 0)),
        0
      )::numeric as total_seconds
    from public.fitting_room_cart_items i
    join completed c on c.cart_id = i.cart_id
    join item_counts ic on ic.cart_id = i.cart_id
    group by i.variation_id
  )
  select * from room_stats
  union all
  select * from item_stats
  order by 1, 2;
$$;

revoke all on function public.get_dwell_time_stats(text) from public;
grant execute on function public.get_dwell_time_stats(text)
  to anon, authenticated, service_role;
