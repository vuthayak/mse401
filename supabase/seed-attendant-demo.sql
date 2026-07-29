-- Demo pending requests for the attendant screen.
-- Run after add-attendant-queue.sql and recommender-seed.sql.
-- Safe to re-run: clears previous demo-* rows and fulfills leftover pending
-- backlog so wait timers stay in the few-minute range.
--
-- Seeds one request each in rooms 1, 2, 3, and 5 with short ages (1–6 min).

delete from public.item_requests
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
  'black-zip-hoodie',
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
  'nike-windbreaker',
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
  'adidas-track-jacket',
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
  'waterloo-hoodie',
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
