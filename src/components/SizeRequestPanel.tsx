import {
  RequestItemButton,
  type RequestButtonStatus,
} from './RequestItemButton';
import type { SizeOption } from '../lib/fetchSizeOptions';

interface SizeRequestPanelProps {
  options: SizeOption[];
  /** Per-variation request status from the parent hook. */
  statuses: Record<string, RequestButtonStatus>;
  onRequest: (option: SizeOption) => void;
  isClinical: boolean;
  borderColor: string;
  /** Optional live-region announcement for confirmations. */
  statusMessage?: string;
}

export function SizeRequestPanel({
  options,
  statuses,
  onRequest,
  isClinical,
  borderColor,
  statusMessage = '',
}: SizeRequestPanelProps) {
  if (options.length === 0) return null;

  const garmentTitle = options[0]?.title ?? 'this item';

  return (
    <section
      className="size-request-panel survey-card"
      style={{
        background: isClinical ? '#fff' : '#faf6f0',
        border: `1px solid ${borderColor}`,
      }}
      aria-labelledby="size-request-heading"
    >
      <h2 id="size-request-heading" className="size-request-heading">
        Need a different size?
      </h2>
      <p className="size-request-subtitle">
        Request another size of {garmentTitle} to this room.
      </p>

      <div className="size-request-chips" role="group" aria-label="Available sizes">
        {options.map((option) => {
          const status = statuses[option.variationId] ?? 'idle';
          const outOfStock = option.quantity <= 0;
          const isTriedOn = option.isTriedOn;

          if (isTriedOn) {
            return (
              <span
                key={option.variationId}
                className="size-chip size-chip--tried-on"
                aria-label={`Size ${option.size}, currently trying on`}
              >
                {option.size}
                <span className="size-chip-hint">Trying on</span>
              </span>
            );
          }

          if (outOfStock) {
            return (
              <span
                key={option.variationId}
                className="size-chip size-chip--oos"
                aria-label={`Size ${option.size}, out of stock`}
              >
                {option.size}
                <span className="size-chip-hint">Out of stock</span>
              </span>
            );
          }

          return (
            <RequestItemButton
              key={option.variationId}
              status={status}
              className="size-chip size-chip--btn"
              idleLabel={option.size}
              label={
                status === 'done'
                  ? `Size ${option.size} requested`
                  : `Request size ${option.size} of ${option.title}`
              }
              onClick={() => onRequest(option)}
            />
          );
        })}
      </div>

      {statusMessage ? (
        <p className="size-request-status" role="status" aria-live="polite">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
