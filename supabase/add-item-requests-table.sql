-- Fitting-room item requests — size swaps and recommended alternatives.
-- Run in Supabase → SQL Editor after recommender-schema.sql (stores + sku_variations
-- must exist for the foreign keys). Safe to re-run.

create table if not exists public.item_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_token text not null,
  store_id text not null default 'kw-flagship' references public.stores (store_id),
  -- The garment the shopper gave feedback on, for staff context.
  source_survey_item_id text not null,
  variation_id text not null references public.sku_variations (variation_id),
  -- size_swap = another size of the tried-on garment
  -- recommendation = one of the alternatives the recommender surfaced
  request_kind text not null check (request_kind in ('size_swap', 'recommendation')),
  size text not null,
  status text not null default 'pending'
    check (status in ('pending', 'fulfilled', 'cancelled')),
  unique (session_token, variation_id)
);

create index if not exists item_requests_created_at_idx
  on public.item_requests (created_at desc);

create index if not exists item_requests_session_token_idx
  on public.item_requests (session_token);

-- Staff queue: pending requests at a store, newest first via created_at index.
create index if not exists item_requests_pending_store_idx
  on public.item_requests (store_id)
  where status = 'pending';

alter table public.item_requests enable row level security;

grant usage on schema public to anon;
grant insert on table public.item_requests to anon;

drop policy if exists "anon_insert_item_requests" on public.item_requests;
create policy "anon_insert_item_requests"
  on public.item_requests
  as permissive
  for insert
  to anon
  with check (true);

-- Reads stay service-role only (no anon select policy), matching survey tables.
-- A future get_pending_requests RPC can expose a staff-safe view.
