-- Alternative Item Recommender — Stage 1 rule engine + pgvector search.
-- Run after recommender-schema.sql and recommender-seed.sql.

-- ---------------------------------------------------------------------------
-- Resolve the garment a shopper carried into the fitting room.
-- ---------------------------------------------------------------------------
-- survey_c_responses.selected_item stores a survey item id; the try-on is the
-- default (mid) size of the style carrying that id.

create or replace function public.get_try_on_variation(p_survey_item_id text)
returns setof public.catalog_variations
language sql
stable
security definer
set search_path = public, extensions
as $$
  select *
  from public.catalog_variations
  where survey_item_id = p_survey_item_id
    and is_default
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Stage 1: deterministic heuristic filter
-- ---------------------------------------------------------------------------
-- Maps the 4-dimension Likert vector onto hard SQL boundaries:
--
--   fit    <= 2 (too loose)  -> target size_order - 1
--   fit    >= 4 (too tight)  -> target size_order + 1
--   fabric <= 2              -> different material_id
--   colour <= 2              -> different color_id
--   price  <= 2              -> unit_price <= 0.75 * current
--
-- Availability (quantity > 0 at the shopper's store) is always enforced, so no
-- out-of-stock garment can ever surface.
--
-- p_relax_level lets the caller widen the net when strict filtering starves the
-- pool:
--   0 - category group + fabric + colour + price
--   1 - category group + price
--   2 - availability only
--
-- Exactly one variation is returned per style: the in-stock size closest to the
-- shopper's target size. Without this the same garment would occupy every slot
-- in the result as three different sizes.

create or replace function public.stage1_candidates(
  p_store_id text,
  p_current_variation_id text,
  p_fabric smallint,
  p_fit smallint,
  p_colour smallint,
  p_price smallint,
  p_relax_level integer default 0,
  p_limit integer default 40
)
returns table (
  variation_id text,
  style_id text,
  sku_code text,
  title text,
  brand text,
  apparel_type text,
  design_type text,
  category_group text,
  fit_profile text,
  description text,
  size text,
  size_order smallint,
  unit_price numeric,
  image_path text,
  material_id text,
  material_label text,
  material_family text,
  hand_feel text,
  color_id text,
  color_label text,
  color_family text,
  quantity integer,
  matched_rules text[],
  rule_score integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  with current_item as (
    select * from public.catalog_variations where variation_id = p_current_variation_id
  ),
  flags as (
    select
      p_fabric <= 2 as fabric_bad,
      p_colour <= 2 as colour_bad,
      p_price <= 2 as price_bad,
      (p_fit <= 2 or p_fit >= 4) as fit_bad,
      case when p_fit <= 2 then -1 when p_fit >= 4 then 1 else 0 end as size_delta
  ),
  pool as (
    select cv.*, si.quantity
    from public.catalog_variations cv
    join public.store_inventory si
      on si.variation_id = cv.variation_id
     and si.store_id = p_store_id
    cross join current_item ci
    cross join flags f
    where si.quantity > 0
      and cv.variation_id <> ci.variation_id
      and (p_relax_level >= 2 or cv.category_group = ci.category_group)
      and (p_relax_level >= 1 or not f.fabric_bad or cv.material_id <> ci.material_id)
      and (p_relax_level >= 1 or not f.colour_bad or cv.color_id <> ci.color_id)
      and (p_relax_level >= 2 or not f.price_bad or cv.unit_price <= 0.75 * ci.unit_price)
  ),
  -- One row per style, so a single garment cannot occupy every result slot as
  -- three different sizes. Alternate colourways are only allowed to compete
  -- separately when the shopper actually rejected the colour, which is the one
  -- case where "same shirt, different colour" is the answer rather than noise.
  best_size as (
    select distinct on (
      p.style_id,
      case when f.colour_bad then p.color_id else '' end
    ) p.*
    from pool p
    cross join current_item ci
    cross join flags f
    order by
      p.style_id,
      case when f.colour_bad then p.color_id else '' end,
      abs(p.size_order - (ci.size_order + f.size_delta)),
      p.unit_price,
      p.variation_id
  ),
  annotated as (
    select
      b.*,
      array_remove(array[
        case when b.style_id = ci.style_id and b.color_id = ci.color_id
             then 'size_swap' end,
        case when b.style_id = ci.style_id and b.color_id <> ci.color_id
             then 'alt_colourway' end,
        case when f.fit_bad and b.size_order = ci.size_order + f.size_delta
             then 'size_adjusted' end,
        case when f.fabric_bad and b.material_family <> ci.material_family
             then 'fabric_pivot' end,
        case when f.fabric_bad and b.material_id <> ci.material_id
                  and b.material_family = ci.material_family
             then 'fabric_change' end,
        case when f.colour_bad and b.color_family <> ci.color_family
             then 'colour_change' end,
        case when f.price_bad and b.unit_price <= 0.75 * ci.unit_price
             then 'budget' end,
        case when b.category_group = ci.category_group
             then 'same_category' end
      ], null) as matched_rules
    from best_size b
    cross join current_item ci
    cross join flags f
  )
  select
    a.variation_id,
    a.style_id,
    a.sku_code,
    a.title,
    a.brand,
    a.apparel_type,
    a.design_type,
    a.category_group,
    a.fit_profile,
    a.description,
    a.size,
    a.size_order,
    a.unit_price,
    a.image_path,
    a.material_id,
    a.material_label,
    a.material_family,
    a.hand_feel,
    a.color_id,
    a.color_label,
    a.color_family,
    a.quantity,
    a.matched_rules,
    (
      (case when 'size_swap'     = any (a.matched_rules) then 45 else 0 end) +
      (case when 'alt_colourway' = any (a.matched_rules) then 35 else 0 end) +
      (case when 'fabric_pivot'  = any (a.matched_rules) then 30 else 0 end) +
      (case when 'same_category' = any (a.matched_rules) then 25 else 0 end) +
      (case when 'budget'        = any (a.matched_rules) then 20 else 0 end) +
      (case when 'size_adjusted' = any (a.matched_rules) then 15 else 0 end) +
      (case when 'fabric_change' = any (a.matched_rules) then 15 else 0 end) +
      (case when 'colour_change' = any (a.matched_rules) then 15 else 0 end)
    )::integer as rule_score
  from annotated a
  order by rule_score desc, a.unit_price asc, a.variation_id asc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Stage 2 support: HNSW cosine similarity over a Stage 1 candidate pool
-- ---------------------------------------------------------------------------

create or replace function public.search_similar_variations(
  p_query_embedding extensions.vector(768),
  p_candidate_ids text[],
  p_match_count integer default 10
)
returns table (
  variation_id text,
  similarity double precision
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    e.variation_id,
    1 - (e.embedding <=> p_query_embedding) as similarity
  from public.item_embeddings e
  where e.variation_id = any (p_candidate_ids)
  order by e.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
-- The catalog lookups are safe for the tablet client to call directly; the
-- embedding search is reserved for the API's service role.

grant execute on function public.get_try_on_variation(text) to anon, authenticated, service_role;
grant execute on function public.stage1_candidates(text, text, smallint, smallint, smallint, smallint, integer, integer) to anon, authenticated, service_role;
grant execute on function public.search_similar_variations(extensions.vector, text[], integer) to service_role;
revoke execute on function public.search_similar_variations(extensions.vector, text[], integer) from anon, authenticated;
