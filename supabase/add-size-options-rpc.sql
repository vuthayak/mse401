-- Size options for the fitting-room "request a different size" panel.
-- Run after recommender-schema.sql and recommender-seed.sql.
-- Safe to re-run.

-- Resolves the default (tried-on) variation for a survey item, then returns
-- every variation of that same style_id AND color_id (same colourway, other
-- sizes), left-joined to store_inventory for quantity.

create or replace function public.get_size_options(
  p_survey_item_id text,
  p_store_id text default 'kw-flagship'
)
returns table (
  variation_id text,
  size text,
  size_order smallint,
  unit_price numeric,
  image_path text,
  title text,
  brand text,
  color_label text,
  is_tried_on boolean,
  quantity integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with tried_on as (
    select *
    from public.catalog_variations
    where survey_item_id = p_survey_item_id
      and is_default
    limit 1
  )
  select
    cv.variation_id,
    cv.size,
    cv.size_order,
    cv.unit_price,
    cv.image_path,
    cv.title,
    cv.brand,
    cv.color_label,
    (cv.variation_id = tried_on.variation_id) as is_tried_on,
    coalesce(si.quantity, 0)::integer as quantity
  from tried_on
  join public.catalog_variations cv
    on cv.style_id = tried_on.style_id
   and cv.color_id = tried_on.color_id
  left join public.store_inventory si
    on si.variation_id = cv.variation_id
   and si.store_id = p_store_id
  order by cv.size_order;
$$;

grant execute on function public.get_size_options(text, text) to anon, authenticated, service_role;

-- Same colourway sizes for an arbitrary catalog variation (used once carts
-- store variation_ids instead of the five survey slugs).

create or replace function public.get_size_options_for_variation(
  p_variation_id text,
  p_store_id text default 'kw-flagship'
)
returns table (
  variation_id text,
  size text,
  size_order smallint,
  unit_price numeric,
  image_path text,
  title text,
  brand text,
  color_label text,
  is_tried_on boolean,
  quantity integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with tried_on as (
    select *
    from public.catalog_variations
    where variation_id = p_variation_id
    limit 1
  )
  select
    cv.variation_id,
    cv.size,
    cv.size_order,
    cv.unit_price,
    cv.image_path,
    cv.title,
    cv.brand,
    cv.color_label,
    (cv.variation_id = tried_on.variation_id) as is_tried_on,
    coalesce(si.quantity, 0)::integer as quantity
  from tried_on
  join public.catalog_variations cv
    on cv.style_id = tried_on.style_id
   and cv.color_id = tried_on.color_id
  left join public.store_inventory si
    on si.variation_id = cv.variation_id
   and si.store_id = p_store_id
  order by cv.size_order;
$$;

grant execute on function public.get_size_options_for_variation(text, text)
  to anon, authenticated, service_role;
