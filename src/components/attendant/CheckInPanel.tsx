import { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { assignCart } from '../../lib/carts';
import {
  fetchCatalogItems,
  type CatalogColourway,
} from '../../lib/catalogItems';
import {
  FITTING_ROOM_MAX,
  FITTING_ROOM_MIN,
} from '../../lib/fittingRoom';
import { SPRING, SPRING_BOUNCE, usePrefersReducedMotion } from '../../lib/motion';
import { catalogImageUrl } from '../../lib/recommendItem';

interface StagingItem {
  colourwayKey: string;
  variationId: string;
  title: string;
  brand: string;
  colorLabel: string;
  size: string;
  imagePath: string;
}

interface CheckInPanelProps {
  defaultRoom: number;
  onAssigned: () => void;
  disabled?: boolean;
}

const ROOMS = Array.from(
  { length: FITTING_ROOM_MAX - FITTING_ROOM_MIN + 1 },
  (_, i) => FITTING_ROOM_MIN + i,
);

function clampRoom(room: number): number {
  return Math.min(FITTING_ROOM_MAX, Math.max(FITTING_ROOM_MIN, room));
}

export function CheckInPanel({
  defaultRoom,
  onAssigned,
  disabled = false,
}: CheckInPanelProps) {
  const reducedMotion = usePrefersReducedMotion();
  const roomGroupId = useId();
  const roomLayoutId = `attendant-checkin-room-pill-${roomGroupId}`;
  const [open, setOpen] = useState(false);
  const [targetRoom, setTargetRoom] = useState(() => clampRoom(defaultRoom));
  const [query, setQuery] = useState('');
  const [colourways, setColourways] = useState<CatalogColourway[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>(
    {},
  );
  const [staging, setStaging] = useState<StagingItem[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTargetRoom(clampRoom(defaultRoom));
  }, [defaultRoom]);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingCatalog(true);
    setError(null);

    void (async () => {
      const outcome = await fetchCatalogItems('kw-flagship', controller.signal);
      if (controller.signal.aborted) return;

      if (outcome.status === 'unavailable') {
        setColourways([]);
        setError('Catalog unavailable — Supabase is not configured.');
        setLoadingCatalog(false);
        return;
      }
      if (outcome.status === 'error') {
        setColourways([]);
        setError(outcome.message);
        setLoadingCatalog(false);
        return;
      }

      setColourways(outcome.colourways);
      setSelectedSizes((prev) => {
        const next = { ...prev };
        for (const cw of outcome.colourways) {
          if (!next[cw.key] && cw.sizes[0]) {
            next[cw.key] = cw.sizes[0].variationId;
          }
        }
        return next;
      });
      setLoadingCatalog(false);
    })();

    return () => controller.abort();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return colourways;
    return colourways.filter((cw) => {
      const hay = `${cw.title} ${cw.brand} ${cw.colorLabel}`.toLowerCase();
      return hay.includes(q);
    });
  }, [colourways, query]);

  const addToStaging = (cw: CatalogColourway) => {
    const variationId = selectedSizes[cw.key] ?? cw.sizes[0]?.variationId;
    const variation = cw.sizes.find((s) => s.variationId === variationId);
    if (!variation) return;

    setStaging((prev) => {
      if (prev.some((item) => item.variationId === variation.variationId)) {
        return prev;
      }
      return [
        ...prev,
        {
          colourwayKey: cw.key,
          variationId: variation.variationId,
          title: cw.title,
          brand: cw.brand,
          colorLabel: cw.colorLabel,
          size: variation.size,
          imagePath: cw.imagePath || variation.imagePath,
        },
      ];
    });
    setError(null);
  };

  const removeFromStaging = (variationId: string) => {
    setStaging((prev) => prev.filter((item) => item.variationId !== variationId));
  };

  const assign = async () => {
    if (staging.length === 0 || assigning || disabled) return;

    setAssigning(true);
    setError(null);

    const outcome = await assignCart({
      fittingRoom: targetRoom,
      variationIds: staging.map((item) => item.variationId),
      sessionToken: crypto.randomUUID(),
    });

    setAssigning(false);

    if (outcome.status === 'error') {
      setError(outcome.message);
      return;
    }
    if (outcome.status === 'skipped') {
      setError('Could not assign cart — Supabase is not configured.');
      return;
    }

    setStaging([]);
    onAssigned();
  };

  return (
    <section className="attendant-checkin" aria-label="Check in items">
      <button
        type="button"
        className="attendant-checkin-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span>Check in (dev)</span>
        <span className="attendant-checkin-chevron" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="attendant-checkin-body"
            initial={
              reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
            }
            animate={
              reducedMotion
                ? { opacity: 1 }
                : { opacity: 1, height: 'auto' }
            }
            exit={
              reducedMotion ? { opacity: 0 } : { opacity: 0, height: 0 }
            }
            transition={SPRING}
          >
            <div className="attendant-checkin-inner">
              <div
                className="attendant-checkin-rooms"
                role="radiogroup"
                aria-label="Target fitting room"
              >
                {ROOMS.map((room) => {
                  const active = targetRoom === room;
                  return (
                    <button
                      key={room}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`attendant-checkin-room${active ? ' attendant-checkin-room--active' : ''}`}
                      disabled={disabled || assigning}
                      onClick={() => setTargetRoom(room)}
                    >
                      {active && !reducedMotion && (
                        <motion.span
                          className="attendant-checkin-room-pill"
                          layoutId={roomLayoutId}
                          transition={SPRING_BOUNCE}
                        />
                      )}
                      {active && reducedMotion && (
                        <span className="attendant-checkin-room-pill" />
                      )}
                      <span className="attendant-checkin-room-label">
                        {room}
                      </span>
                    </button>
                  );
                })}
              </div>

              <label className="attendant-checkin-search-label">
                <span className="visually-hidden">Search catalog</span>
                <input
                  type="search"
                  className="attendant-checkin-search"
                  placeholder="Search title, brand, color…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  disabled={disabled || loadingCatalog}
                />
              </label>

              {loadingCatalog ? (
                <p className="attendant-checkin-hint">Loading catalog…</p>
              ) : filtered.length === 0 ? (
                <p className="attendant-checkin-hint">No colourways match.</p>
              ) : (
                <ul className="attendant-checkin-catalog">
                  {filtered.map((cw) => {
                    const selectedId =
                      selectedSizes[cw.key] ?? cw.sizes[0]?.variationId;
                    const imageUrl = catalogImageUrl(cw.imagePath);
                    return (
                      <li key={cw.key} className="attendant-checkin-row">
                        <img
                          className="attendant-checkin-thumb"
                          src={imageUrl}
                          alt=""
                          width={48}
                          height={48}
                          loading="lazy"
                        />
                        <div className="attendant-checkin-row-body">
                          <p className="attendant-checkin-row-title">
                            {cw.title}
                          </p>
                          <p className="attendant-checkin-row-meta">
                            {cw.brand} · {cw.colorLabel}
                          </p>
                          <div
                            className="attendant-checkin-sizes"
                            role="radiogroup"
                            aria-label={`Sizes for ${cw.title}`}
                          >
                            {cw.sizes.map((size) => {
                              const active = size.variationId === selectedId;
                              return (
                                <button
                                  key={size.variationId}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  className={`attendant-checkin-size${active ? ' attendant-checkin-size--active' : ''}`}
                                  disabled={disabled || assigning}
                                  onClick={() =>
                                    setSelectedSizes((prev) => ({
                                      ...prev,
                                      [cw.key]: size.variationId,
                                    }))
                                  }
                                >
                                  {size.size}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="attendant-checkin-add"
                          disabled={disabled || assigning || !selectedId}
                          onClick={() => addToStaging(cw)}
                        >
                          Add
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {staging.length > 0 && (
                <div className="attendant-checkin-staging">
                  <h3 className="attendant-checkin-staging-title">
                    Staging ({staging.length})
                  </h3>
                  <ul className="attendant-checkin-staging-list">
                    <AnimatePresence initial={false}>
                      {staging.map((item) => (
                        <motion.li
                          key={item.variationId}
                          className="attendant-checkin-staging-item"
                          layout={!reducedMotion}
                          initial={
                            reducedMotion
                              ? { opacity: 0 }
                              : { opacity: 0, y: 6 }
                          }
                          animate={{ opacity: 1, y: 0 }}
                          exit={
                            reducedMotion
                              ? { opacity: 0 }
                              : { opacity: 0, y: -4 }
                          }
                          transition={SPRING}
                        >
                          <img
                            className="attendant-checkin-thumb attendant-checkin-thumb--sm"
                            src={catalogImageUrl(item.imagePath)}
                            alt=""
                            width={36}
                            height={36}
                            loading="lazy"
                          />
                          <div className="attendant-checkin-staging-body">
                            <p className="attendant-checkin-row-title">
                              {item.title}
                            </p>
                            <p className="attendant-checkin-row-meta">
                              {item.brand} · {item.colorLabel} · {item.size}
                            </p>
                          </div>
                          <button
                            type="button"
                            className="attendant-checkin-remove"
                            disabled={assigning}
                            aria-label={`Remove ${item.title} size ${item.size}`}
                            onClick={() => removeFromStaging(item.variationId)}
                          >
                            Remove
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </div>
              )}

              {error && (
                <p className="attendant-checkin-error" role="alert">
                  {error}
                </p>
              )}

              <button
                type="button"
                className="attendant-action attendant-action--deliver attendant-checkin-assign"
                disabled={
                  disabled || assigning || staging.length === 0 || loadingCatalog
                }
                aria-busy={assigning || undefined}
                onClick={() => void assign()}
              >
                {assigning
                  ? 'Assigning…'
                  : `Assign to room ${targetRoom}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
