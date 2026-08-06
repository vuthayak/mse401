import {
  cartExpiresInMs,
  formatExpiresIn,
  type CartItem,
  type CartItemStatus,
  type FittingRoomCart,
} from '../../lib/carts';
import {
  formatDwell,
  type DwellAverage,
  type DwellFlag,
} from '../../lib/dwellTime';
import { catalogImageUrl } from '../../lib/recommendItem';

interface RoomCartCardProps {
  cart: FittingRoomCart;
  now: number;
  onClear: (room: number) => void;
  clearing?: boolean;
  error?: string | null;
  roomDwell?: DwellAverage | null;
  itemDwellByVariation?: Map<string, DwellAverage>;
}

function statusLabel(status: CartItemStatus): string {
  if (status === 'rated') return 'Rated';
  if (status === 'skipped') return 'Skipped';
  return 'Not started';
}

function statusClass(status: CartItemStatus): string {
  if (status === 'rated') return 'attendant-cart-status--rated';
  if (status === 'skipped') return 'attendant-cart-status--skipped';
  return 'attendant-cart-status--pending';
}

function dwellFlagLabel(flag: DwellFlag): string {
  if (flag === 'quick') return 'Quick';
  if (flag === 'long') return 'Long';
  return 'On pace';
}

function DwellChip({
  average,
  ariaPrefix,
}: {
  average: DwellAverage | null | undefined;
  ariaPrefix: string;
}) {
  const label = formatDwell(average?.averageMs);
  const flag = average?.flag ?? null;
  return (
    <span
      className={`attendant-dwell-chip${flag ? ` attendant-dwell-chip--${flag}` : ''}`}
      aria-label={`${ariaPrefix} ${label}${flag ? `, ${dwellFlagLabel(flag).toLowerCase()}` : ''}`}
    >
      avg {label}
      {flag && (
        <span className="attendant-dwell-flag" aria-hidden="true">
          {dwellFlagLabel(flag)}
        </span>
      )}
    </span>
  );
}

function CartItemRow({
  item,
  itemDwell,
}: {
  item: CartItem;
  itemDwell?: DwellAverage | null;
}) {
  return (
    <li className="attendant-cart-item">
      <img
        className="attendant-cart-thumb"
        src={catalogImageUrl(item.imagePath)}
        alt=""
        width={48}
        height={48}
        loading="lazy"
      />
      <div className="attendant-cart-item-body">
        <p className="attendant-cart-item-title">{item.title}</p>
        <p className="attendant-cart-item-meta">
          {item.brand} · {item.colorLabel}
        </p>
        <div className="attendant-cart-item-chips">
          <span className="attendant-size-badge">{item.size}</span>
          <span
            className={`attendant-cart-status ${statusClass(item.status)}`}
          >
            {statusLabel(item.status)}
          </span>
          <DwellChip
            average={itemDwell}
            ariaPrefix={`Average dwell for ${item.title}`}
          />
        </div>
      </div>
    </li>
  );
}

export function RoomCartCard({
  cart,
  now,
  onClear,
  clearing = false,
  error = null,
  roomDwell = null,
  itemDwellByVariation,
}: RoomCartCardProps) {
  const expiresMs = cartExpiresInMs(cart.lastActivityAt, now);
  const expiresLabel = formatExpiresIn(expiresMs);
  const count = cart.items.length;
  const roomAvgLabel = formatDwell(roomDwell?.averageMs);

  return (
    <article
      className="attendant-cart-card"
      aria-label={`Room ${cart.fittingRoom} cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <div className="attendant-cart-card-header">
        <div>
          <p className="attendant-cart-room">Room {cart.fittingRoom}</p>
          <p className="attendant-cart-summary">
            {count} item{count === 1 ? '' : 's'} · expires in {expiresLabel} ·
            avg {roomAvgLabel}
            {roomDwell?.flag && (
              <span
                className={`attendant-dwell-flag attendant-dwell-flag--inline attendant-dwell-chip--${roomDwell.flag}`}
                aria-label={dwellFlagLabel(roomDwell.flag)}
              >
                {dwellFlagLabel(roomDwell.flag)}
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          className="attendant-action attendant-action--stock attendant-cart-clear"
          disabled={clearing}
          aria-busy={clearing || undefined}
          onClick={() => onClear(cart.fittingRoom)}
        >
          {clearing ? 'Clearing…' : 'Clear room'}
        </button>
      </div>

      {error && (
        <p className="attendant-card-error" role="alert">
          {error}
        </p>
      )}

      {count === 0 ? (
        <p className="attendant-cart-empty">No items in this cart.</p>
      ) : (
        <ul className="attendant-cart-items">
          {cart.items.map((item) => (
            <CartItemRow
              key={item.id}
              item={item}
              itemDwell={itemDwellByVariation?.get(item.variationId) ?? null}
            />
          ))}
        </ul>
      )}
    </article>
  );
}
