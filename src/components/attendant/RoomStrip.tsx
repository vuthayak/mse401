import { motion } from 'motion/react';
import { FITTING_ROOM_MAX, FITTING_ROOM_MIN } from '../../lib/fittingRoom';
import { SPRING_BOUNCE } from '../../lib/motion';

export type RoomFilter = number | 'all';

interface RoomStripProps {
  counts: Record<number, number>;
  selected: RoomFilter;
  onSelect: (room: RoomFilter) => void;
  reducedMotion: boolean;
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
}: RoomStripProps) {
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
      </button>

      {ROOMS.map((room) => {
        const count = counts[room] ?? 0;
        const isSelected = selected === room;
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
          </button>
        );
      })}
    </div>
  );
}
