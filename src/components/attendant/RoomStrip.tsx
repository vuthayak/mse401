import { motion } from 'motion/react';
import { FITTING_ROOM_MAX, FITTING_ROOM_MIN } from '../../lib/fittingRoom';
import { SPRING_BOUNCE } from '../../lib/motion';

export type RoomFilter = number | 'all';

interface RoomStripProps {
  counts: Record<number, number>;
  selected: RoomFilter;
  onSelect: (room: RoomFilter) => void;
  reducedMotion: boolean;
  /** Rooms with an active cart (shows a subtle occupied indicator). */
  occupiedRooms?: ReadonlySet<number>;
  /** Optional per-room cart item counts; falls back to a dot when occupied. */
  cartCounts?: Record<number, number>;
}

const ROOMS = Array.from(
  { length: FITTING_ROOM_MAX - FITTING_ROOM_MIN + 1 },
  (_, i) => FITTING_ROOM_MIN + i,
);

export function RoomStrip({
  counts,
  selected,
  onSelect,
  reducedMotion,
  occupiedRooms,
  cartCounts,
}: RoomStripProps) {
  const cartOccupiedTotal = ROOMS.reduce((sum, r) => {
    if (cartCounts) return sum + (cartCounts[r] ?? 0);
    return sum + (occupiedRooms?.has(r) ? 1 : 0);
  }, 0);

  return (
    <div className="attendant-room-strip" role="tablist" aria-label="Fitting rooms">
      <button
        type="button"
        role="tab"
        aria-selected={selected === 'all'}
        className={`attendant-room-tile${selected === 'all' ? ' attendant-room-tile--selected' : ''}`}
        onClick={() => onSelect('all')}
      >
        {selected === 'all' && !reducedMotion && (
          <motion.span
            layoutId="attendant-room-pill"
            className="attendant-room-pill"
            transition={SPRING_BOUNCE}
          />
        )}
        {selected === 'all' && reducedMotion && (
          <span className="attendant-room-pill" />
        )}
        <span className="attendant-room-tile-label">All</span>
        <span className="attendant-room-tile-count">
          {ROOMS.reduce((sum, r) => sum + (counts[r] ?? 0), 0)}
        </span>
        {cartOccupiedTotal > 0 && (
          <span
            className="attendant-room-cart-badge"
            aria-label={`${cartOccupiedTotal} cart item${cartOccupiedTotal === 1 ? '' : 's'} across rooms`}
          >
            {cartCounts ? cartOccupiedTotal : '●'}
          </span>
        )}
      </button>

      {ROOMS.map((room) => {
        const count = counts[room] ?? 0;
        const isSelected = selected === room;
        const cartCount = cartCounts?.[room] ?? 0;
        const occupied =
          cartCount > 0 || (occupiedRooms?.has(room) ?? false);
        return (
          <button
            key={room}
            type="button"
            role="tab"
            aria-selected={isSelected}
            className={[
              'attendant-room-tile',
              isSelected ? 'attendant-room-tile--selected' : '',
              count === 0 ? 'attendant-room-tile--clear' : '',
              occupied ? 'attendant-room-tile--occupied' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelect(room)}
          >
            {isSelected && !reducedMotion && (
              <motion.span
                layoutId="attendant-room-pill"
                className="attendant-room-pill"
                transition={SPRING_BOUNCE}
              />
            )}
            {isSelected && reducedMotion && (
              <span className="attendant-room-pill" />
            )}
            <span className="attendant-room-tile-num">{room}</span>
            <span className="attendant-room-tile-count">
              {count === 0 ? 'Clear' : count}
            </span>
            {occupied && (
              <span
                className="attendant-room-cart-badge"
                aria-label={
                  cartCount > 0
                    ? `${cartCount} cart item${cartCount === 1 ? '' : 's'}`
                    : 'Cart occupied'
                }
              >
                {cartCount > 0 ? cartCount : '●'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
