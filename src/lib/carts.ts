import type { PersistOutcome } from './persistSurvey';
import {
  subscribeToTables,
  type ConnectionMode,
  type SubscribeHandle,
} from './realtimeSubscription';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, isOnline, OfflineError, withRetry } from './withRetry';

export type { ConnectionMode, SubscribeHandle };

export const CART_IDLE_MS = 10 * 60_000;

export type CartItemStatus = 'pending' | 'rated' | 'skipped';

export interface CartItem {
  id: string;
  variationId: string;
  position: number;
  status: CartItemStatus;
  size: string;
  title: string;
  brand: string;
  colorLabel: string;
  imagePath: string;
  unitPrice: number;
}

export interface FittingRoomCart {
  id: string;
  createdAt: string;
  lastActivityAt: string;
  finishedAt: string | null;
  fittingRoom: number;
  sessionToken: string;
  items: CartItem[];
}

export type CartOutcome =
  | { status: 'ok'; cart: FittingRoomCart | null }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

export type RoomCartsOutcome =
  | { status: 'ok'; carts: FittingRoomCart[] }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiCartRow {
  cart_id: string;
  created_at: string;
  last_activity_at: string;
  finished_at: string | null;
  fitting_room: number;
  session_token: string;
  item_id: string;
  variation_id: string;
  position: number;
  status: CartItemStatus;
  size: string;
  title: string;
  brand: string;
  color_label: string;
  image_path: string;
  unit_price: number;
}

function rowsToCarts(rows: ApiCartRow[]): FittingRoomCart[] {
  const byId = new Map<string, FittingRoomCart>();

  for (const raw of rows) {
    let cart = byId.get(raw.cart_id);
    if (!cart) {
      cart = {
        id: raw.cart_id,
        createdAt: raw.created_at,
        lastActivityAt: raw.last_activity_at,
        finishedAt: raw.finished_at,
        fittingRoom: Number(raw.fitting_room),
        sessionToken: raw.session_token,
        items: [],
      };
      byId.set(raw.cart_id, cart);
    }
    cart.items.push({
      id: raw.item_id,
      variationId: raw.variation_id,
      position: Number(raw.position),
      status: raw.status,
      size: raw.size,
      title: raw.title,
      brand: raw.brand,
      colorLabel: raw.color_label,
      imagePath: raw.image_path,
      unitPrice: Number(raw.unit_price),
    });
  }

  for (const cart of byId.values()) {
    cart.items.sort((a, b) => a.position - b.position);
  }

  return [...byId.values()].sort((a, b) => a.fittingRoom - b.fittingRoom);
}

/** Milliseconds until a cart auto-clears from idle (clamped ≥ 0). */
export function cartExpiresInMs(
  lastActivityAt: string,
  nowMs = Date.now(),
): number {
  const last = Date.parse(lastActivityAt);
  if (!Number.isFinite(last)) return 0;
  return Math.max(0, last + CART_IDLE_MS - nowMs);
}

export function formatExpiresIn(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return 'expiring';
  const totalSeconds = Math.ceil(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.ceil(totalSeconds / 60);
  return `${minutes} min`;
}

export async function fetchActiveCart(
  fittingRoom: number,
  storeId = 'kw-flagship',
  signal?: AbortSignal,
): Promise<CartOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  if (signal?.aborted) {
    return { status: 'error', message: 'Request cancelled.' };
  }

  try {
    const data = await withRetry(
      async (attemptSignal) => {
        const { data: rows, error } = await supabase
          .rpc('get_active_cart', {
            p_fitting_room: fittingRoom,
            p_store_id: storeId,
          })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const carts = rowsToCarts((data ?? []) as ApiCartRow[]);
    return { status: 'ok', cart: carts[0] ?? null };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('get_active_cart_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load cart'),
    };
  }
}

export async function fetchRoomCarts(
  storeId = 'kw-flagship',
  signal?: AbortSignal,
): Promise<RoomCartsOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  if (signal?.aborted) {
    return { status: 'error', message: 'Request cancelled.' };
  }

  try {
    const data = await withRetry(
      async (attemptSignal) => {
        const { data: rows, error } = await supabase
          .rpc('get_room_carts', { p_store_id: storeId })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    return {
      status: 'ok',
      carts: rowsToCarts((data ?? []) as ApiCartRow[]),
    };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('get_room_carts_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load room carts'),
    };
  }
}

export async function assignCart(params: {
  fittingRoom: number;
  variationIds: string[];
  sessionToken: string;
  storeId?: string;
}): Promise<PersistOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    const cartId = await withRetry(async (signal) => {
      const { data, error } = await supabase
        .rpc('assign_cart', {
          p_fitting_room: params.fittingRoom,
          p_store_id: params.storeId ?? 'kw-flagship',
          p_session_token: params.sessionToken,
          p_variation_ids: params.variationIds,
        })
        .abortSignal(signal);

      if (error) throw error;
      return data as string;
    });

    return { status: 'saved', recordId: cartId };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('assign_cart_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not assign cart'),
    };
  }
}

export async function clearRoomCart(
  fittingRoom: number,
  storeId = 'kw-flagship',
): Promise<PersistOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    await withRetry(async (signal) => {
      const { error } = await supabase
        .rpc('clear_room_cart', {
          p_fitting_room: fittingRoom,
          p_store_id: storeId,
        })
        .abortSignal(signal);

      if (error) throw error;
    });

    return { status: 'saved', recordId: String(fittingRoom) };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('clear_room_cart_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not clear room'),
    };
  }
}

export async function finishCart(cartId: string): Promise<PersistOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    await withRetry(async (signal) => {
      const { error } = await supabase
        .rpc('finish_cart', { p_cart_id: cartId })
        .abortSignal(signal);

      if (error) throw error;
    });

    return { status: 'saved', recordId: cartId };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('finish_cart_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not finish cart'),
    };
  }
}

export async function touchCartActivity(
  cartId: string,
): Promise<PersistOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    await withRetry(async (signal) => {
      const { error } = await supabase
        .rpc('touch_cart_activity', { p_cart_id: cartId })
        .abortSignal(signal);

      if (error) throw error;
    });

    return { status: 'saved', recordId: cartId };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('touch_cart_activity_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not update cart activity'),
    };
  }
}

export async function setCartItemStatus(
  itemId: string,
  status: CartItemStatus,
): Promise<PersistOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    await withRetry(async (signal) => {
      const { error } = await supabase
        .rpc('set_cart_item_status', {
          p_item_id: itemId,
          p_status: status,
        })
        .abortSignal(signal);

      if (error) throw error;
    });

    return { status: 'saved', recordId: itemId };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('set_cart_item_status_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not update item status'),
    };
  }
}

export function subscribeToCarts(options: {
  onChange: () => void;
  onConnectionChange: (mode: ConnectionMode) => void;
}): SubscribeHandle {
  return subscribeToTables({
    channel: 'fitting-room-carts',
    tables: ['fitting_room_carts', 'fitting_room_cart_items'],
    onChange: options.onChange,
    onConnectionChange: options.onConnectionChange,
  });
}
