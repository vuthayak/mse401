-- Demo pending requests + one active cart for the attendant screen.
-- Run after add-attendant-queue.sql, add-fitting-room-carts.sql, and
-- recommender-seed.sql.
-- Safe to re-run: clears previous demo-* rows and fulfills leftover pending
-- backlog so wait timers stay in the few-minute range.
--
-- Seeds one request each in rooms 1, 2, 3, and 5 with short ages (1–6 min),
-- plus an active cart in room 2 with three try-on items.

delete from public.item_requests
where session_token like 'demo-%';

-- Clear any previous demo carts (cascade deletes cart items).
delete from public.fitting_room_carts
where session_token like 'demo-%';

-- Clear day-old backlog (e.g. rows that defaulted to room 2 when the column
-- was added) so they no longer sit in the open queue with multi-hour waits.
update public.item_requests
set
  status = 'fulfilled',
  fulfilled_at = coalesce(fulfilled_at, now())
where status = 'pending'
  and session_token not like 'demo-%';

-- Room 2: one size swap (~1 min) — typical live-kiosk room.
insert into public.item_requests (
  session_token, store_id, source_survey_item_id, variation_id,
  request_kind, size, status, fitting_room, created_at
)
select
  'demo-room-2',
  'kw-flagship',
  'essential-zip-hoodie-black-m',
  cv.variation_id,
  'size_swap',
  cv.size,
  'pending',
  2,
  now() - interval '1 minute'
from public.catalog_variations cv
where cv.survey_item_id = 'black-zip-hoodie'
  and not cv.is_default
order by cv.size_order
limit 1;

-- Room 1: size swap (~2 min).
insert into public.item_requests (
  session_token, store_id, source_survey_item_id, variation_id,
  request_kind, size, status, fitting_room, created_at
)
select
  'demo-room-1',
  'kw-flagship',
  'nike-windrunner-black-m',
  cv.variation_id,
  'size_swap',
  cv.size,
  'pending',
  1,
  now() - interval '2 minutes'
from public.catalog_variations cv
where cv.survey_item_id = 'nike-windbreaker'
  and not cv.is_default
order by cv.size_order
limit 1;

-- Room 3: recommended alternative (~4 min).
insert into public.item_requests (
  session_token, store_id, source_survey_item_id, variation_id,
  request_kind, size, status, fitting_room, created_at
)
select
  'demo-room-3',
  'kw-flagship',
  'adidas-santiago-track-colourblock-navy-m',
  cv.variation_id,
  'recommendation',
  cv.size,
  'pending',
  3,
  now() - interval '4 minutes'
from public.catalog_variations cv
where cv.survey_item_id is null
  and cv.is_default
order by cv.variation_id
limit 1;

-- Room 5: size swap (~6 min).
insert into public.item_requests (
  session_token, store_id, source_survey_item_id, variation_id,
  request_kind, size, status, fitting_room, created_at
)
select
  'demo-room-5',
  'kw-flagship',
  'waterloo-zip-hoodie-heather-grey-m',
  cv.variation_id,
  'size_swap',
  cv.size,
  'pending',
  5,
  now() - interval '6 minutes'
from public.catalog_variations cv
where cv.survey_item_id = 'waterloo-hoodie'
  and not cv.is_default
order by cv.size_order desc
limit 1;

-- Active cart in room 2 (three try-on items) so the attendant + kiosk have
-- something to show without using the check-in menu first.
do $$
declare
  cart uuid;
begin
  -- Clear any leftover active cart in room 2 so the unique index allows insert.
  update public.fitting_room_carts
  set cleared_at = now()
  where store_id = 'kw-flagship'
    and fitting_room = 2
    and cleared_at is null;

  insert into public.fitting_room_carts (
    store_id, fitting_room, session_token, last_activity_at
  )
  values (
    'kw-flagship', 2, 'demo-cart-room-2', now() - interval '2 minutes'
  )
  returning id into cart;

  insert into public.fitting_room_cart_items (cart_id, variation_id, position, status)
  values
    (cart, 'essential-zip-hoodie-black-m', 0, 'pending'),
    (cart, 'nike-windrunner-black-m', 1, 'pending'),
    (cart, 'chevrolet-graphic-jersey-maroon-m', 2, 'pending');
end;
$$;
