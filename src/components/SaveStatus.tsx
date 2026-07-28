import type { CSSProperties } from 'react';
import type { PersistOutcome } from '../lib/persistSurvey';

interface SaveStatusProps {
  outcome: PersistOutcome | null;
  saving?: boolean;
  /** When save failed, offer an in-memory retry of the same record. */
  onRetry?: () => void;
  retryDisabled?: boolean;
}

export function SaveStatus({
  outcome,
  saving,
  onRetry,
  retryDisabled,
}: SaveStatusProps) {
  if (saving) {
    return (
      <p style={styles.saving} role="status">
        Saving response…
      </p>
    );
  }

  if (!outcome) return null;

  if (outcome.status === 'saved') {
    return (
      <p style={styles.success} role="status">
        Response saved to database.
      </p>
    );
  }

  if (outcome.status === 'skipped') {
    return (
      <p style={styles.skipped} role="status">
        Database not configured — response not persisted.
      </p>
    );
  }

  return (
    <div style={styles.errorBox} role="alert">
      <p style={styles.errorText}>Could not save to database: {outcome.message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={retryDisabled}
          style={styles.retry}
        >
          {retryDisabled ? 'Waiting for network…' : 'Retry save'}
        </button>
      ) : null}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  saving: {
    margin: '0 0 16px',
    padding: '12px 16px',
    background: '#f0f4ff',
    border: '1px solid #c5d4f5',
    borderRadius: 8,
    fontSize: 16,
    color: '#334',
  },
  success: {
    margin: '0 0 16px',
    padding: '12px 16px',
    background: '#edf7ed',
    border: '1px solid #b7dfb9',
    borderRadius: 8,
    fontSize: 16,
    color: '#1e4620',
  },
  skipped: {
    margin: '0 0 16px',
    padding: '12px 16px',
    background: '#fff8e6',
    border: '1px solid #e6d9a8',
    borderRadius: 8,
    fontSize: 16,
    color: '#5c4a00',
  },
  errorBox: {
    margin: '0 0 16px',
    padding: '12px 16px',
    background: '#fdecea',
    border: '1px solid #f5c2c0',
    borderRadius: 8,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  errorText: {
    margin: 0,
    fontSize: 16,
    color: '#611a15',
  },
  retry: {
    alignSelf: 'flex-start',
    fontSize: 15,
    fontWeight: 600,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #611a15',
    background: '#fff',
    color: '#611a15',
    cursor: 'pointer',
  },
};
