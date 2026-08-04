-- Demo reset: wipe all item_requests for a store (open + handled).
-- Run after add-item-requests-table.sql / add-attendant-queue.sql.
-- Anon cannot DELETE via RLS; this security-definer RPC is for the
-- attendant "Reset demo" button.

create or replace function public.clear_room_requests(
  p_store_id text default 'kw-flagship'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.item_requests
  where store_id = p_store_id;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

grant execute on function public.clear_room_requests(text)
  to anon, authenticated, service_role;
