import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'motion/react';
import {
  fetchRoomRequests,
  setRequestStatus,
  subscribeToRequests,
  type AttendantRequest,
  type ConnectionMode,
  type RequestStatus,
} from '../../lib/attendantQueue';
import {
  clearRoomCart,
  fetchRoomCarts,
  subscribeToCarts,
  type FittingRoomCart,
} from '../../lib/carts';
import { FITTING_ROOM_MAX, FITTING_ROOM_MIN } from '../../lib/fittingRoom';
import { usePrefersReducedMotion } from '../../lib/motion';
import { CheckInPanel } from './CheckInPanel';
import { RequestCard, type ExitDirection } from './RequestCard';
import { RoomCartCard } from './RoomCartCard';
import { RoomStrip, type RoomFilter } from './RoomStrip';

const RECENT_LIMIT = 8;
const TICK_MS = 1000;

function exitForStatus(status: RequestStatus): ExitDirection {
  if (status === 'fulfilled') return 'right';
  if (status === 'cancelled') return 'left';
  return null;
}

function connectionLabel(mode: ConnectionMode): string {
  if (mode === 'live') return 'Live';
  if (mode === 'polling') return 'Polling';
  if (mode === 'offline') return 'Offline';
  return 'Connecting';
}

function haptic(reducedMotion: boolean) {
  if (reducedMotion) return;
  try {
    navigator.vibrate?.(10);
  } catch {
    // Vibration API is best-effort.
  }
}

export function AttendantScreen() {
  const reducedMotion = usePrefersReducedMotion();
  const [requests, setRequests] = useState<AttendantRequest[]>([]);
  const [carts, setCarts] = useState<FittingRoomCart[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cartLoadError, setCartLoadError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [connection, setConnection] = useState<ConnectionMode>('connecting');
  const [roomFilter, setRoomFilter] = useState<RoomFilter>('all');
  const [now, setNow] = useState(() => Date.now());
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [clearingRooms, setClearingRooms] = useState<Record<number, boolean>>(
    {},
  );
  const [clearErrors, setClearErrors] = useState<Record<number, string>>({});
  const [exitDirs, setExitDirs] = useState<Record<string, ExitDirection>>({});
  const [enterDirs, setEnterDirs] = useState<Record<string, ExitDirection>>({});
  const [announce, setAnnounce] = useState('');
  const knownIds = useRef<Set<string>>(new Set());
  const initialLoad = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const cartsAbortRef = useRef<AbortController | null>(null);

  const loadCarts = useCallback(async () => {
    cartsAbortRef.current?.abort();
    const controller = new AbortController();
    cartsAbortRef.current = controller;

    const outcome = await fetchRoomCarts('kw-flagship', controller.signal);
    if (controller.signal.aborted) return;

    if (outcome.status === 'unavailable') {
      setCarts([]);
      setCartLoadError(null);
      return;
    }
    if (outcome.status === 'error') {
      setCartLoadError(outcome.message);
      return;
    }

    setCartLoadError(null);
    setCarts(outcome.carts);
  }, []);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const outcome = await fetchRoomRequests('kw-flagship', controller.signal);
    if (controller.signal.aborted) return;

    if (outcome.status === 'unavailable') {
      setUnavailable(true);
      setLoadError(null);
      return;
    }
    if (outcome.status === 'error') {
      setLoadError(outcome.message);
      return;
    }

    setUnavailable(false);
    setLoadError(null);

    const next = outcome.requests;
    if (!initialLoad.current) {
      const arrivals = next.filter(
        (r) => r.status === 'pending' && !knownIds.current.has(r.id),
      );
      if (arrivals.length > 0) {
        const first = arrivals[0];
        setAnnounce(
          arrivals.length === 1
            ? `New request in fitting room ${first.fittingRoom}: ${first.title}, size ${first.size}`
            : `${arrivals.length} new requests`,
        );
        for (const a of arrivals) {
          setEnterDirs((prev) => ({ ...prev, [a.id]: null }));
        }
      }
    }

    knownIds.current = new Set(next.map((r) => r.id));
    initialLoad.current = false;
    setRequests(next);
  }, []);

  useEffect(() => {
    document.title = 'Fitting Room Attendant';
  }, []);

  useEffect(() => {
    void refresh();
    void loadCarts();
    const requestsHandle = subscribeToRequests({
      onChange: () => {
        void refresh();
      },
      onConnectionChange: setConnection,
    });
    const cartsHandle = subscribeToCarts({
      onChange: () => {
        void loadCarts();
      },
      onConnectionChange: () => {
        // Connection badge stays on the requests subscription.
      },
    });
    return () => {
      requestsHandle.unsubscribe();
      cartsHandle.unsubscribe();
      abortRef.current?.abort();
      cartsAbortRef.current?.abort();
    };
  }, [refresh, loadCarts]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);

  const pending = useMemo(
    () => requests.filter((r) => r.status === 'pending'),
    [requests],
  );

  const handled = useMemo(() => {
    return requests
      .filter((r) => r.status !== 'pending')
      .slice()
      .sort((a, b) => {
        const aAt = Date.parse(a.fulfilledAt ?? a.createdAt);
        const bAt = Date.parse(b.fulfilledAt ?? b.createdAt);
        return bAt - aAt;
      })
      .slice(0, RECENT_LIMIT);
  }, [requests]);

  const roomCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (let r = FITTING_ROOM_MIN; r <= FITTING_ROOM_MAX; r += 1) {
      counts[r] = 0;
    }
    for (const req of pending) {
      counts[req.fittingRoom] = (counts[req.fittingRoom] ?? 0) + 1;
    }
    return counts;
  }, [pending]);

  const cartCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const cart of carts) {
      counts[cart.fittingRoom] = cart.items.length;
    }
    return counts;
  }, [carts]);

  const occupiedRooms = useMemo(() => {
    return new Set(carts.map((c) => c.fittingRoom));
  }, [carts]);

  const visiblePending = useMemo(() => {
    if (roomFilter === 'all') return pending;
    return pending.filter((r) => r.fittingRoom === roomFilter);
  }, [pending, roomFilter]);

  const visibleCarts = useMemo(() => {
    if (roomFilter === 'all') return carts;
    return carts.filter((c) => c.fittingRoom === roomFilter);
  }, [carts, roomFilter]);

  const checkInDefaultRoom = roomFilter === 'all' ? 2 : roomFilter;

  const applyOptimistic = useCallback(
    (id: string, nextStatus: RequestStatus) => {
      setRequests((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: nextStatus,
                fulfilledAt:
                  nextStatus === 'pending' ? null : new Date().toISOString(),
              }
            : r,
        ),
      );
    },
    [],
  );

  const commitStatus = useCallback(
    async (request: AttendantRequest, nextStatus: RequestStatus) => {
      const id = request.id;
      const previous = request.status;
      const exit = exitForStatus(
        nextStatus === 'pending' ? previous : nextStatus,
      );

      setBusyIds((prev) => ({ ...prev, [id]: true }));
      setErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (nextStatus === 'pending') {
        setEnterDirs((prev) => ({ ...prev, [id]: exit }));
      } else {
        setExitDirs((prev) => ({ ...prev, [id]: exit }));
      }

      applyOptimistic(id, nextStatus);
      haptic(reducedMotion);

      const outcome = await setRequestStatus(id, nextStatus);
      setBusyIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      if (outcome.status === 'error') {
        applyOptimistic(id, previous);
        setErrors((prev) => ({ ...prev, [id]: outcome.message }));
        setAnnounce(`Could not update ${request.title}. Try again.`);
        haptic(reducedMotion);
        return;
      }

      if (nextStatus === 'fulfilled') {
        setAnnounce(
          `Delivered ${request.title} to fitting room ${request.fittingRoom}.`,
        );
      } else if (nextStatus === 'cancelled') {
        setAnnounce(
          `Marked ${request.title} out of stock for fitting room ${request.fittingRoom}.`,
        );
      } else {
        setAnnounce(
          `Restored ${request.title} to fitting room ${request.fittingRoom}.`,
        );
      }
    },
    [applyOptimistic, reducedMotion],
  );

  const handleClearRoom = useCallback(
    async (room: number) => {
      const previous = carts;
      setClearingRooms((prev) => ({ ...prev, [room]: true }));
      setClearErrors((prev) => {
        const next = { ...prev };
        delete next[room];
        return next;
      });
      setCarts((prev) => prev.filter((c) => c.fittingRoom !== room));
      haptic(reducedMotion);

      const outcome = await clearRoomCart(room);
      setClearingRooms((prev) => {
        const next = { ...prev };
        delete next[room];
        return next;
      });

      if (outcome.status === 'error') {
        setCarts(previous);
        setClearErrors((prev) => ({ ...prev, [room]: outcome.message }));
        setAnnounce(`Could not clear room ${room}. Try again.`);
        haptic(reducedMotion);
        return;
      }
      if (outcome.status === 'skipped') {
        setCarts(previous);
        setClearErrors((prev) => ({
          ...prev,
          [room]: 'Could not clear room — Supabase is not configured.',
        }));
        return;
      }

      setAnnounce(`Cleared cart for fitting room ${room}.`);
      void loadCarts();
    },
    [carts, loadCarts, reducedMotion],
  );

  const pendingCount = pending.length;

  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'user'}>
      <div className="app-shell attendant-shell">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div
          className="visually-hidden"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {announce}
        </div>

        <header className="attendant-header">
          <div className="attendant-header-inner">
            <div>
              <p className="attendant-eyebrow">KW Flagship</p>
              <h1 className="attendant-title">Fitting Room Attendant</h1>
              <p className="attendant-subtitle">
                {pendingCount === 0
                  ? 'No open requests'
                  : `${pendingCount} open request${pendingCount === 1 ? '' : 's'}`}
              </p>
            </div>
            <div className="attendant-header-actions">
              <span
                className={`attendant-connection attendant-connection--${connection}`}
                title={connectionLabel(connection)}
              >
                <span className="attendant-connection-dot" aria-hidden="true" />
                {connectionLabel(connection)}
              </span>
              <Link to="/" className="attendant-back">
                ← Home
              </Link>
            </div>
          </div>
        </header>

        <main id="main-content" className="attendant-main" tabIndex={-1}>
          <RoomStrip
            counts={roomCounts}
            cartCounts={cartCounts}
            occupiedRooms={occupiedRooms}
            selected={roomFilter}
            onSelect={setRoomFilter}
            reducedMotion={reducedMotion}
          />

          <CheckInPanel
            defaultRoom={checkInDefaultRoom}
            onAssigned={() => {
              setAnnounce('Cart assigned to fitting room.');
              void loadCarts();
            }}
            disabled={unavailable}
          />

          {unavailable && (
            <p className="attendant-banner" role="status">
              Supabase is not configured. Requests will not appear until
              credentials are set.
            </p>
          )}

          {loadError && (
            <p className="attendant-banner attendant-banner--error" role="alert">
              {loadError}{' '}
              <button
                type="button"
                className="attendant-retry"
                onClick={() => void refresh()}
              >
                Retry
              </button>
            </p>
          )}

          {cartLoadError && (
            <p className="attendant-banner attendant-banner--error" role="alert">
              {cartLoadError}{' '}
              <button
                type="button"
                className="attendant-retry"
                onClick={() => void loadCarts()}
              >
                Retry
              </button>
            </p>
          )}

          <section className="attendant-carts" aria-label="Room carts">
            <h2 className="attendant-section-title">Room carts</h2>
            {visibleCarts.length === 0 ? (
              <p className="attendant-empty">
                No active carts
                {roomFilter === 'all'
                  ? ' — all rooms are empty.'
                  : ` in room ${roomFilter}.`}
              </p>
            ) : (
              <ul className="attendant-carts-list">
                {visibleCarts.map((cart) => (
                  <li key={cart.id}>
                    <RoomCartCard
                      cart={cart}
                      now={now}
                      clearing={Boolean(clearingRooms[cart.fittingRoom])}
                      error={clearErrors[cart.fittingRoom] ?? null}
                      onClear={(room) => void handleClearRoom(room)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            className="attendant-queue"
            aria-label="Open fitting-room requests"
          >
            {visiblePending.length === 0 ? (
              <p className="attendant-empty">
                No open requests
                {roomFilter === 'all'
                  ? ' — all rooms are clear.'
                  : ` in room ${roomFilter}.`}
              </p>
            ) : (
              <ul className="attendant-list">
                <AnimatePresence initial={false} mode="popLayout">
                  {visiblePending.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      now={now}
                      busy={Boolean(busyIds[request.id])}
                      error={errors[request.id] ?? null}
                      exitDirection={exitDirs[request.id] ?? null}
                      enterDirection={enterDirs[request.id] ?? null}
                      reducedMotion={reducedMotion}
                      onDelivered={() =>
                        void commitStatus(request, 'fulfilled')
                      }
                      onOutOfStock={() =>
                        void commitStatus(request, 'cancelled')
                      }
                    />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>

          {handled.length > 0 && (
            <section
              className="attendant-recent"
              aria-label="Recently handled requests"
            >
              <h2 className="attendant-section-title">Recently handled</h2>
              <ul className="attendant-list">
                <AnimatePresence initial={false} mode="popLayout">
                  {handled.map((request) => (
                    <RequestCard
                      key={request.id}
                      request={request}
                      now={now}
                      busy={Boolean(busyIds[request.id])}
                      error={errors[request.id] ?? null}
                      exitDirection={exitDirs[request.id] ?? null}
                      enterDirection={enterDirs[request.id] ?? null}
                      reducedMotion={reducedMotion}
                      mode="handled"
                      onDelivered={() => undefined}
                      onOutOfStock={() => undefined}
                      onUndo={() => void commitStatus(request, 'pending')}
                    />
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          )}
        </main>
      </div>
    </MotionConfig>
  );
}
