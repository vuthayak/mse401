-- Alternative Item Recommender — Milestone 1: catalog, inventory, pgvector.
-- Run this in Supabase → SQL Editor before recommender-seed.sql and
-- recommender-rpc.sql.
--
-- Survey response tables (survey_a/b/c_responses) are untouched; this file only
-- adds the store catalog the recommender queries.

create extension if not exists vector with schema extensions;

-- ---------------------------------------------------------------------------
-- Reference tables
-- ---------------------------------------------------------------------------

create table if not exists public.stores (
  store_id text primary key,
  name text not null,
  city text
);

-- material_id drives the Stage 1 "fabric rated <= 2" NOT IN filter.
create table if not exists public.materials (
  material_id text primary key,
  label text not null,
  -- natural | synthetic | blend — lets the fabric swap prefer a real pivot
  -- (e.g. polyester -> organic cotton) rather than another synthetic.
  family text not null check (family in ('natural', 'synthetic', 'blend')),
  -- Qualitative hand-feel used in the LLM prompt and heuristic fallback.
  hand_feel text not null
);

-- color_id drives the Stage 1 "colour rated <= 2" exclusion + alternate
-- colourway lookup on the identical style.
create table if not exists public.colors (
  color_id text primary key,
  label text not null,
  family text not null,
  hex text
);

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

create table if not exists public.styles (
  style_id text primary key,
  title text not null,
  brand text not null,
  apparel_type text not null,
  design_type text not null,
  -- Coarse substitution bucket. The alternatives-only framework never swaps a
  -- jacket for a pair of shorts, so Stage 1 keeps candidates inside this group
  -- until it has to relax.
  category_group text not null check (category_group in ('outerwear', 'tops', 'bottoms', 'shorts')),
  material_id text not null references public.materials (material_id),
  fit_profile text not null,
  description text not null,
  -- Set only for the five garments carried into the fitting room, so
  -- survey_c_responses.selected_item resolves to a catalog style.
  survey_item_id text unique
);

create table if not exists public.sku_variations (
  variation_id text primary key,
  style_id text not null references public.styles (style_id) on delete cascade,
  sku_code text not null unique,
  size text not null,
  -- Ordinal position of `size` within its style, so the fit rule can query
  -- size_order = current +/- 1 without parsing size labels.
  size_order smallint not null,
  color_id text not null references public.colors (color_id),
  unit_price numeric(10, 2) not null check (unit_price > 0),
  -- Path relative to the Vite base URL, e.g. 'items/nike-windbreaker.png'.
  image_path text not null,
  -- The variation a shopper is assumed to have tried on for this style.
  is_default boolean not null default false
);

create table if not exists public.store_inventory (
  store_id text not null references public.stores (store_id) on delete cascade,
  variation_id text not null references public.sku_variations (variation_id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  primary key (store_id, variation_id)
);

create table if not exists public.item_embeddings (
  variation_id text primary key references public.sku_variations (variation_id) on delete cascade,
  -- Gemini embedding output dimensionality (gemini-embedding-001 pinned to 768).
  embedding extensions.vector(768) not null,
  content text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index if not exists sku_variations_style_idx
  on public.sku_variations (style_id);

create index if not exists sku_variations_color_idx
  on public.sku_variations (color_id);

create index if not exists sku_variations_price_idx
  on public.sku_variations (unit_price);

create index if not exists store_inventory_in_stock_idx
  on public.store_inventory (store_id, variation_id)
  where quantity > 0;

-- HNSW gives approximate-nearest-neighbour lookup in single-digit ms inside
-- Postgres, per the spec's indexing approach.
create index if not exists item_embeddings_hnsw_idx
  on public.item_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- Denormalized read view (used by the RPCs and the insights dashboard)
-- ---------------------------------------------------------------------------

create or replace view public.catalog_variations
with (security_invoker = true) as
select
  v.variation_id,
  v.sku_code,
  v.size,
  v.size_order,
  v.unit_price,
  v.image_path,
  v.is_default,
  s.style_id,
  s.title,
  s.brand,
  s.apparel_type,
  s.design_type,
  s.category_group,
  s.fit_profile,
  s.description,
  s.survey_item_id,
  m.material_id,
  m.label as material_label,
  m.family as material_family,
  m.hand_feel,
  c.color_id,
  c.label as color_label,
  c.family as color_family
from public.sku_variations v
join public.styles s on s.style_id = v.style_id
join public.materials m on m.material_id = s.material_id
join public.colors c on c.color_id = v.color_id;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
-- The catalog is public storefront data: anon may read it so the tablet UI can
-- render product detail without a round trip through the API. Writes are
-- service-role only (no policy granting insert/update/delete to anon).

alter table public.stores enable row level security;
alter table public.materials enable row level security;
alter table public.colors enable row level security;
alter table public.styles enable row level security;
alter table public.sku_variations enable row level security;
alter table public.store_inventory enable row level security;
alter table public.item_embeddings enable row level security;

grant usage on schema public to anon;
grant select on table public.stores to anon;
grant select on table public.materials to anon;
grant select on table public.colors to anon;
grant select on table public.styles to anon;
grant select on table public.sku_variations to anon;
grant select on table public.store_inventory to anon;
grant select on table public.catalog_variations to anon;

drop policy if exists "anon_read_stores" on public.stores;
create policy "anon_read_stores" on public.stores
  as permissive for select to anon using (true);

drop policy if exists "anon_read_materials" on public.materials;
create policy "anon_read_materials" on public.materials
  as permissive for select to anon using (true);

drop policy if exists "anon_read_colors" on public.colors;
create policy "anon_read_colors" on public.colors
  as permissive for select to anon using (true);

drop policy if exists "anon_read_styles" on public.styles;
create policy "anon_read_styles" on public.styles
  as permissive for select to anon using (true);

drop policy if exists "anon_read_sku_variations" on public.sku_variations;
create policy "anon_read_sku_variations" on public.sku_variations
  as permissive for select to anon using (true);

drop policy if exists "anon_read_store_inventory" on public.store_inventory;
create policy "anon_read_store_inventory" on public.store_inventory
  as permissive for select to anon using (true);

-- item_embeddings stays service-role only: no anon grant, no anon policy.
