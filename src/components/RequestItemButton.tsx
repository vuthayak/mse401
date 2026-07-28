export type RequestButtonStatus = 'idle' | 'saving' | 'done' | 'error';

interface RequestItemButtonProps {
  status: RequestButtonStatus;
  onClick: () => void;
  /** Accessible name, e.g. "Request the Nike Windrunner in size L". */
  label: string;
  /** Visible label when idle; defaults to "Request this item". */
  idleLabel?: string;
  className?: string;
  disabled?: boolean;
}

function visibleLabel(status: RequestButtonStatus, idleLabel: string): string {
  if (status === 'saving') return 'Requesting…';
  if (status === 'done') return 'Requested';
  if (status === 'error') return 'Try again';
  return idleLabel;
}

export function RequestItemButton({
  status,
  onClick,
  label,
  idleLabel = 'Request this item',
  className = '',
  disabled = false,
}: RequestItemButtonProps) {
  const isBusy = status === 'saving';
  const isDone = status === 'done';
  const classes = [
    'choice-btn',
    'request-btn',
    isDone ? 'selected' : '',
    status === 'error' ? 'request-btn--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      className={classes}
      aria-label={label}
      aria-busy={isBusy || undefined}
      disabled={disabled || isBusy || isDone}
      onClick={onClick}
    >
      {visibleLabel(status, idleLabel)}
    </button>
  );
}
