import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchActiveCart,
  finishCart,
  setCartItemStatus,
  subscribeToCarts,
  touchCartActivity,
  type CartItemStatus,
  type FittingRoomCart,
} from './carts';
import { setSessionToken } from './session';

export type FittingRoomCartStatus =
  | 'loading'
  | 'ready'
  | 'empty'
  | 'error'
  | 'unavailable';

export interface UseFittingRoomCartResult {
  cart: FittingRoomCart | null;
  status: FittingRoomCartStatus;
  error: string | null;
  reload: () => void;
  markItemStatus: (
    itemId: string,
    status: CartItemStatus,
  ) => Promise<void>;
  finish: () => Promise<boolean>;
  touchActivity: () => void;
}

const TOUCH_DEBOUNCE_MS = 2_000;

/**
 * Loads the active fitting-room cart for Survey C, keeps it live via realtime,
 * and adopts the cart's session token when one appears.
 */
export function useFittingRoomCart(
  fittingRoom: number,
): UseFittingRoomCartResult {
  const [cart, setCart] = useState<FittingRoomCart | null>(null);
  const [status, setStatus] = useState<FittingRoomCartStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const cartIdRef = useRef<string | null>(null);
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adoptedTokenRef = useRef<string | null>(null);

  const applyCart = useCallback((next: FittingRoomCart | null) => {
    cartIdRef.current = next?.id ?? null;
    setCart(next);
    if (next && next.items.length > 0) {
      if (adoptedTokenRef.current !== next.sessionToken) {
        setSessionToken(next.sessionToken);
        adoptedTokenRef.current = next.sessionToken;
      }
      setStatus('ready');
      setError(null);
      return;
    }
    setStatus('empty');
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    setStatus((prev) => (prev === 'ready' ? prev : 'loading'));

    void (async () => {
      const outcome = await fetchActiveCart(
        fittingRoom,
        'kw-flagship',
        controller.signal,
      );
      if (cancelled) return;

      if (outcome.status === 'unavailable') {
        setCart(null);
        cartIdRef.current = null;
        setStatus('unavailable');
        setError(null);
        return;
      }
      if (outcome.status === 'error') {
        setStatus('error');
        setError(outcome.message);
        return;
      }
      applyCart(outcome.cart);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fittingRoom, reloadToken, applyCart]);

  useEffect(() => {
    const handle = subscribeToCarts({
      onChange: () => setReloadToken((n) => n + 1),
      onConnectionChange: () => {
        /* live badge not needed on kiosk */
      },
    });
    return () => handle.unsubscribe();
  }, []);

  useEffect(
    () => () => {
      if (touchTimer.current) clearTimeout(touchTimer.current);
    },
    [],
  );

  const reload = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const markItemStatus = useCallback(
    async (itemId: string, nextStatus: CartItemStatus) => {
      setCart((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, status: nextStatus } : item,
          ),
        };
      });
      await setCartItemStatus(itemId, nextStatus);
    },
    [],
  );

  const finish = useCallback(async () => {
    const id = cartIdRef.current;
    if (!id) return false;
    const outcome = await finishCart(id);
    if (outcome.status === 'saved' || outcome.status === 'skipped') {
      setCart(null);
      cartIdRef.current = null;
      setStatus('empty');
      return true;
    }
    setError(outcome.message);
    return false;
  }, []);

  const touchActivity = useCallback(() => {
    const id = cartIdRef.current;
    if (!id) return;
    if (touchTimer.current) clearTimeout(touchTimer.current);
    touchTimer.current = setTimeout(() => {
      touchTimer.current = null;
      void touchCartActivity(id);
    }, TOUCH_DEBOUNCE_MS);
  }, []);

  return {
    cart,
    status,
    error,
    reload,
    markItemStatus,
    finish,
    touchActivity,
  };
}
