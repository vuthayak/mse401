-- Fitting-room carts — attendant check-in assigns catalog items to a room;
-- the kiosk loads them instead of the static survey item list.
-- Run after recommender-schema.sql (stores + sku_variations + catalog_variations).
-- Safe to re-run.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.fitting_room_carts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  finished_at timestamptz,
  cleared_at timestamptz,
  store_id text not null default 'kw-flagship' references public.stores (store_id),
  fitting_room smallint not null
    check (fitting_room between 1 and 5),
  session_token text not null
);

-- One active (uncleared) cart per room at a store.
create unique index if not exists fitting_room_carts_active_room_idx
  on public.fitting_room_carts (store_id, fitting_room)
  where cleared_at is null;

create index if not exists fitting_room_carts_activity_idx
  on public.fitting_room_carts (last_activity_at)
  where cleared_at is null;

create table if not exists public.fitting_room_cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null
    references public.fitting_room_carts (id) on delete cascade,
  variation_id text not null references public.sku_variations (variation_id),
  position smallint not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'rated', 'skipped')),
  unique (cart_id, variation_id)
);

create index if not exists fitting_room_cart_items_cart_idx
  on public.fitting_room_cart_items (cart_id, position);

alter table public.fitting_room_carts enable row level security;
alter table public.fitting_room_cart_items enable row level security;

grant usage on schema public to anon;
grant select on table public.fitting_room_carts to anon;
grant select on table public.fitting_room_cart_items to anon;

drop policy if exists "anon_select_fitting_room_carts" on public.fitting_room_carts;
create policy "anon_select_fitting_room_carts"
  on public.fitting_room_carts
  as permissive
  for select
  to anon
  using (true);

drop policy if exists "anon_select_fitting_room_cart_items" on public.fitting_room_cart_items;
create policy "anon_select_fitting_room_cart_items"
  on public.fitting_room_cart_items
  as permissive
  for select
  to anon
  using (true);

-- ---------------------------------------------------------------------------
-- Idle expiry helper (10 minutes since last shopper action)
-- ---------------------------------------------------------------------------

create or replace function public.expire_idle_fitting_room_carts(
  p_store_id text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.fitting_room_carts
  set cleared_at = now()
  where cleared_at is null
    and last_activity_at < now() - interval '10 minutes'
    and (p_store_id is null or store_id = p_store_id);
end;
$$;

revoke all on function public.expire_idle_fitting_room_carts(text) from public;
grant execute on function public.expire_idle_fitting_room_carts(text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Assign a cart (clears any existing active cart for the room first)
-- ---------------------------------------------------------------------------

create or replace function public.assign_cart(
  p_fitting_room smallint,
  p_store_id text,
  p_session_token text,
  p_variation_ids text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_cart_id uuid;
  i integer;
begin
  if p_fitting_room is null or p_fitting_room < 1 or p_fitting_room > 5 then
    raise exception 'invalid fitting room: %', p_fitting_room;
  end if;

  if p_session_token is null or length(trim(p_session_token)) = 0 then
    raise exception 'session_token is required';
  end if;

  if p_variation_ids is null or cardinality(p_variation_ids) = 0 then
    raise exception 'at least one variation_id is required';
  end if;

  -- Clear any active cart for this room (new assignment replaces it).
  update public.fitting_room_carts
  set cleared_at = now()
  where store_id = coalesce(p_store_id, 'kw-flagship')
    and fitting_room = p_fitting_room
    and cleared_at is null;

  insert into public.fitting_room_carts (
    store_id,
    fitting_room,
    session_token,
    last_activity_at
  )
  values (
    coalesce(p_store_id, 'kw-flagship'),
    p_fitting_room,
    p_session_token,
    now()
  )
  returning id into new_cart_id;

  for i in 1 .. cardinality(p_variation_ids) loop
    insert into public.fitting_room_cart_items (
      cart_id,
      variation_id,
      position,
      status
    )
    values (
      new_cart_id,
      p_variation_ids[i],
      (i - 1)::smallint,
      'pending'
    );
  end loop;

  return new_cart_id;
end;
$$;

grant execute on function public.assign_cart(smallint, text, text, text[])
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Clear / finish / touch / set item status
-- ---------------------------------------------------------------------------

create or replace function public.clear_room_cart(
  p_fitting_room smallint,
  p_store_id text default 'kw-flagship'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  cleared_count integer;
begin
  update public.fitting_room_carts
  set cleared_at = now()
  where store_id = coalesce(p_store_id, 'kw-flagship')
    and fitting_room = p_fitting_room
    and cleared_at is null;

  get diagnostics cleared_count = row_count;
  return cleared_count > 0;
end;
$$;

grant execute on function public.clear_room_cart(smallint, text)
  to anon, authenticated, service_role;

create or replace function public.finish_cart(p_cart_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.fitting_room_carts
  set
    finished_at = coalesce(finished_at, now()),
    last_activity_at = now()
  where id = p_cart_id
    and cleared_at is null;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.finish_cart(uuid)
  to anon, authenticated, service_role;

create or replace function public.touch_cart_activity(p_cart_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.fitting_room_carts
  set last_activity_at = now()
  where id = p_cart_id
    and cleared_at is null;

  get diagnostics updated_count = row_count;
  return updated_count > 0;
end;
$$;

grant execute on function public.touch_cart_activity(uuid)
  to anon, authenticated, service_role;

create or replace function public.set_cart_item_status(
  p_item_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  target_cart_id uuid;
  updated_count integer;
begin
  if p_status not in ('pending', 'rated', 'skipped') then
    raise exception 'invalid cart item status: %', p_status;
  end if;

  select cart_id into target_cart_id
  from public.fitting_room_cart_items
  where id = p_item_id;

  if target_cart_id is null then
    raise exception 'cart item not found: %', p_item_id;
  end if;

  update public.fitting_room_cart_items
  set status = p_status
  where id = p_item_id;

  get diagnostics updated_count = row_count;

  -- Shopper action: bump idle timer.
  update public.fitting_room_carts
  set last_activity_at = now()
  where id = target_cart_id
    and cleared_at is null;

  return updated_count > 0;
end;
$$;

grant execute on function public.set_cart_item_status(uuid, text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Reads (volatile: expire idle carts before selecting)
-- ---------------------------------------------------------------------------

create or replace function public.get_active_cart(
  p_fitting_room smallint,
  p_store_id text default 'kw-flagship'
)
returns table (
  cart_id uuid,
  created_at timestamptz,
  last_activity_at timestamptz,
  finished_at timestamptz,
  fitting_room smallint,
  session_token text,
  item_id uuid,
  variation_id text,
  "position" smallint,
  status text,
  size text,
  title text,
  brand text,
  color_label text,
  image_path text,
  unit_price numeric
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
begin
  perform public.expire_idle_fitting_room_carts(coalesce(p_store_id, 'kw-flagship'));

  return query
  select
    c.id as cart_id,
    c.created_at,
    c.last_activity_at,
    c.finished_at,
    c.fitting_room,
    c.session_token,
    i.id as item_id,
    i.variation_id,
    i.position,
    i.status,
    cv.size,
    cv.title,
    cv.brand,
    cv.color_label,
    cv.image_path,
    cv.unit_price
  from public.fitting_room_carts c
  join public.fitting_room_cart_items i on i.cart_id = c.id
  join public.catalog_variations cv on cv.variation_id = i.variation_id
  where c.store_id = coalesce(p_store_id, 'kw-flagship')
    and c.fitting_room = p_fitting_room
    and c.cleared_at is null
  order by i.position asc;
end;
$$;

grant execute on function public.get_active_cart(smallint, text)
  to anon, authenticated, service_role;

create or replace function public.get_room_carts(
  p_store_id text default 'kw-flagship'
)
returns table (
  cart_id uuid,
  created_at timestamptz,
  last_activity_at timestamptz,
  finished_at timestamptz,
  fitting_room smallint,
  session_token text,
  item_id uuid,
  variation_id text,
  "position" smallint,
  status text,
  size text,
  title text,
  brand text,
  color_label text,
  image_path text,
  unit_price numeric
)
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
begin
  perform public.expire_idle_fitting_room_carts(coalesce(p_store_id, 'kw-flagship'));

  return query
  select
    c.id as cart_id,
    c.created_at,
    c.last_activity_at,
    c.finished_at,
    c.fitting_room,
    c.session_token,
    i.id as item_id,
    i.variation_id,
    i.position,
    i.status,
    cv.size,
    cv.title,
    cv.brand,
    cv.color_label,
    cv.image_path,
    cv.unit_price
  from public.fitting_room_carts c
  join public.fitting_room_cart_items i on i.cart_id = c.id
  join public.catalog_variations cv on cv.variation_id = i.variation_id
  where c.store_id = coalesce(p_store_id, 'kw-flagship')
    and c.cleared_at is null
  order by c.fitting_room asc, i.position asc;
end;
$$;

grant execute on function public.get_room_carts(text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Catalog list for the attendant check-in (dev) menu
-- ---------------------------------------------------------------------------

create or replace function public.list_catalog_items(
  p_store_id text default 'kw-flagship'
)
returns table (
  variation_id text,
  style_id text,
  title text,
  brand text,
  apparel_type text,
  design_type text,
  color_id text,
  color_label text,
  size text,
  size_order smallint,
  is_default boolean,
  image_path text,
  unit_price numeric,
  quantity integer
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select
    cv.variation_id,
    cv.style_id,
    cv.title,
    cv.brand,
    cv.apparel_type,
    cv.design_type,
    cv.color_id,
    cv.color_label,
    cv.size,
    cv.size_order,
    cv.is_default,
    cv.image_path,
    cv.unit_price,
    coalesce(si.quantity, 0)::integer as quantity
  from public.catalog_variations cv
  left join public.store_inventory si
    on si.variation_id = cv.variation_id
   and si.store_id = coalesce(p_store_id, 'kw-flagship')
  order by cv.apparel_type, cv.design_type, cv.title, cv.color_label, cv.size_order;
$$;

grant execute on function public.list_catalog_items(text)
  to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fitting_room_carts'
  ) then
    alter publication supabase_realtime add table public.fitting_room_carts;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'fitting_room_cart_items'
  ) then
    alter publication supabase_realtime add table public.fitting_room_cart_items;
  end if;
end;
$$;
