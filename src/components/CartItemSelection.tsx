import { Link } from 'react-router-dom';
import type { CartItem, CartItemStatus } from '../lib/carts';
import { catalogImageUrl } from '../lib/recommendItem';

interface CartItemSelectionProps {
  variant: 'clinical' | 'warm';
  items: CartItem[];
  onSelect: (item: CartItem) => void;
  onSkip: (item: CartItem) => void;
  onDone: () => void;
  headingRef?: (el: HTMLHeadingElement | null) => void;
  finishing?: boolean;
}

function statusLabel(status: CartItemStatus): string {
  if (status === 'rated') return 'Rated';
  if (status === 'skipped') return 'Skipped';
  return 'Rate';
}

function statusClass(status: CartItemStatus): string {
  if (status === 'rated') return 'cart-item-status--rated';
  if (status === 'skipped') return 'cart-item-status--skipped';
  return 'cart-item-status--pending';
}

export function CartItemSelection({
  variant,
  items,
  onSelect,
  onSkip,
  onDone,
  headingRef,
  finishing = false,
}: CartItemSelectionProps) {
  const isClinical = variant === 'clinical';
  const borderColor = isClinical ? '#767676' : '#8a7f6e';
  const pendingCount = items.filter((item) => item.status === 'pending').length;

  return (
    <div className="item-selection cart-item-selection">
      <div className="item-selection-header">
        <h1
          ref={headingRef}
          className="item-selection-heading"
          tabIndex={-1}
        >
          Your items
        </h1>
        <p className="item-selection-subheading">
          {pendingCount > 0
            ? 'Select an item to rate, or skip ones you are done with.'
            : 'All items are done. Finish when you are ready.'}
        </p>
      </div>

      <div className="item-selection-list">
        {items.map((item) => {
          const pending = item.status === 'pending';
          const imageUrl = catalogImageUrl(item.imagePath);

          return (
            <div
              key={item.id}
              className={`cart-item-row${pending ? '' : ' cart-item-row--done'}`}
              style={{
                background: isClinical ? '#fff' : '#faf6f0',
                borderColor,
              }}
            >
              {pending ? (
                <button
                  type="button"
                  className="cart-item-select choice-btn"
                  style={{
                    background: 'transparent',
                    borderColor: 'transparent',
                  }}
                  onClick={() => onSelect(item)}
                >
                  <CartItemContent
                    item={item}
                    imageUrl={imageUrl}
                    isClinical={isClinical}
                  />
                </button>
              ) : (
                <div className="cart-item-select cart-item-select--static">
                  <CartItemContent
                    item={item}
                    imageUrl={imageUrl}
                    isClinical={isClinical}
                  />
                </div>
              )}

              <div className="cart-item-actions">
                <span
                  className={`cart-item-status ${statusClass(item.status)}`}
                >
                  {statusLabel(item.status)}
                </span>
                {pending && (
                  <button
                    type="button"
                    className="text-btn cart-item-skip"
                    onClick={() => onSkip(item)}
                  >
                    Skip
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="choice-btn"
        style={{
          marginTop: 16,
          width: '100%',
          fontSize: 18,
          borderColor,
        }}
        disabled={finishing}
        onClick={onDone}
      >
        {finishing ? 'Finishing…' : "I'm done"}
      </button>

      <Link to="/" className="survey-back-link">
        ← Back to start
      </Link>
    </div>
  );
}

function CartItemContent({
  item,
  imageUrl,
  isClinical,
}: {
  item: CartItem;
  imageUrl: string;
  isClinical: boolean;
}) {
  return (
    <>
      <div
        className="item-selection-thumb"
        style={{ background: isClinical ? '#e8e8e8' : '#e8dfd0' }}
        aria-hidden="true"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="item-selection-thumb-img" />
        ) : (
          <span className="item-selection-thumb-text">IMG</span>
        )}
      </div>
      <div className="item-selection-text">
        <span className="item-selection-title">{item.title}</span>
        <span className="item-selection-tagline">
          {item.brand} · {item.colorLabel} · Size {item.size}
        </span>
      </div>
    </>
  );
}
