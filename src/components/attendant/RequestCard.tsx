import { motion } from 'motion/react';
import {
  formatWaiting,
  type AttendantRequest,
  type RequestStatus,
} from '../../lib/attendantQueue';
import { catalogImageUrl } from '../../lib/recommendItem';
import { SPRING } from '../../lib/motion';

export type ExitDirection = 'left' | 'right' | null;

interface RequestCardProps {
  request: AttendantRequest;
  now: number;
  busy: boolean;
  error: string | null;
  exitDirection: ExitDirection;
  enterDirection: ExitDirection;
  reducedMotion: boolean;
  onDelivered: () => void;
  onOutOfStock: () => void;
  mode?: 'pending' | 'handled';
  onUndo?: () => void;
}

function kindLabel(kind: AttendantRequest['requestKind']): string {
  return kind === 'size_swap' ? 'Size swap' : 'Alternative';
}

function statusLabel(status: RequestStatus): string {
  if (status === 'fulfilled') return 'Delivered';
  if (status === 'cancelled') return 'Out of stock';
  return 'Pending';
}

export function RequestCard({
  request,
  now,
  busy,
  error,
  exitDirection,
  enterDirection,
  reducedMotion,
  onDelivered,
  onOutOfStock,
  mode = 'pending',
  onUndo,
}: RequestCardProps) {
  const waiting = formatWaiting(now - Date.parse(request.createdAt));
  const imageUrl = catalogImageUrl(request.imagePath);

  const exitX =
    exitDirection === 'right' ? 48 : exitDirection === 'left' ? -48 : 0;
  const enterX =
    enterDirection === 'right' ? 48 : enterDirection === 'left' ? -48 : 0;

  const initial = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x: enterX, y: enterDirection ? 0 : 8 };
  const animate = { opacity: 1, x: 0, y: 0 };
  const exit = reducedMotion
    ? { opacity: 0 }
    : { opacity: 0, x: exitX, y: 0 };

  return (
    <motion.li
      layout={!reducedMotion}
      className={`attendant-card${mode === 'handled' ? ' attendant-card--handled' : ''}`}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={SPRING}
      aria-label={`${request.title}, size ${request.size}, fitting room ${request.fittingRoom}`}
    >
      <div className="attendant-card-main">
        <img
          className="attendant-card-thumb"
          src={imageUrl}
          alt=""
          width={72}
          height={72}
          loading="lazy"
        />
        <div className="attendant-card-body">
          <div className="attendant-card-top">
            <p className="attendant-card-room">Room {request.fittingRoom}</p>
            <p className="attendant-card-wait" aria-label={`Waiting ${waiting}`}>
              {waiting}
            </p>
          </div>
          <h3 className="attendant-card-title">{request.title}</h3>
          <p className="attendant-card-meta">
            {request.brand} · {request.colorLabel}
          </p>
          <div className="attendant-card-chips">
            <span className="attendant-size-badge">{request.size}</span>
            <span className="attendant-kind-chip">{kindLabel(request.requestKind)}</span>
            {mode === 'handled' && (
              <span className="attendant-status-chip">
                {statusLabel(request.status)}
              </span>
            )}
          </div>
          {request.sourceTitle && (
            <p className="attendant-card-source">
              Tried on {request.sourceTitle}
            </p>
          )}
          {error && (
            <p className="attendant-card-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      {mode === 'pending' ? (
        <div className="attendant-card-actions">
          <button
            type="button"
            className="attendant-action attendant-action--deliver"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={onDelivered}
          >
            Delivered
          </button>
          <button
            type="button"
            className="attendant-action attendant-action--stock"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={onOutOfStock}
          >
            Out of stock
          </button>
        </div>
      ) : (
        <div className="attendant-card-actions">
          <button
            type="button"
            className="attendant-action attendant-action--undo"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={onUndo}
          >
            Undo
          </button>
        </div>
      )}
    </motion.li>
  );
}
