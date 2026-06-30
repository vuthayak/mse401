import type { CSSProperties } from 'react';
import type { PersistOutcome } from '../lib/persistSurvey';

interface SaveStatusProps {
  outcome: PersistOutcome | null;
  saving?: boolean;
}

export function SaveStatus({ outcome, saving }: SaveStatusProps) {
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
        Database not configured — response logged to console only.
      </p>
    );
  }

  return (
    <p style={styles.error} role="alert">
      Could not save to database: {outcome.message}
    </p>
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
  error: {
    margin: '0 0 16px',
    padding: '12px 16px',
    background: '#fdecea',
    border: '1px solid #f5c2c0',
    borderRadius: 8,
    fontSize: 16,
    color: '#611a15',
  },
};
