interface CartWaitingProps {
  fittingRoom: number;
  status: 'loading' | 'empty' | 'error' | 'unavailable';
  error?: string | null;
  onRetry?: () => void;
  headingRef?: (el: HTMLHeadingElement | null) => void;
}

export function CartWaiting({
  fittingRoom,
  status,
  error = null,
  onRetry,
  headingRef,
}: CartWaitingProps) {
  const isLoading = status === 'loading';
  const isError = status === 'error';
  const isUnavailable = status === 'unavailable';

  return (
    <div className="cart-waiting item-selection">
      <div className="item-selection-header">
        <h1
          ref={headingRef}
          className="item-selection-heading"
          tabIndex={-1}
        >
          {isLoading
            ? 'Loading your items…'
            : isUnavailable
              ? 'Cart unavailable'
              : isError
                ? 'Could not load cart'
                : 'Waiting for your items'}
        </h1>
        <p className="item-selection-subheading">Fitting room {fittingRoom}</p>
      </div>

      <div className="cart-waiting-body">
        {isLoading && (
          <p className="cart-waiting-message">Checking for assigned items…</p>
        )}
        {status === 'empty' && (
          <p className="cart-waiting-message">
            An attendant will assign items when you&apos;re ready.
          </p>
        )}
        {isUnavailable && (
          <p className="cart-waiting-message">
            Fitting-room carts are not configured for this deployment.
          </p>
        )}
        {isError && (
          <>
            <p className="cart-waiting-message" role="alert">
              {error ?? 'Something went wrong loading your cart.'}
            </p>
            {onRetry && (
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                onClick={onRetry}
              >
                Try again
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
