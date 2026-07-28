import { useState, type CSSProperties } from 'react';

interface PrivacyNoticeProps {
  /** Called once the shopper acknowledges the notice. */
  onAcknowledge: () => void;
}

/**
 * Short PIPEDA-style notice shown before the survey starts.
 * Full detail lives in PRIVACY.md at the repo root.
 */
export function PrivacyNotice({ onAcknowledge }: PrivacyNoticeProps) {
  const [checked, setChecked] = useState(false);

  return (
    <section style={styles.card} aria-labelledby="privacy-notice-heading">
      <h2 id="privacy-notice-heading" style={styles.heading}>
        Before you start
      </h2>
      <p style={styles.body}>
        This fitting-room survey collects <strong>no personal information</strong>
        — no name, email, demographics, free text, or photos. We only record:
      </p>
      <ul style={styles.list}>
        <li>Which garment you tried on</li>
        <li>Four ratings (fabric, fit, colour, price)</li>
        <li>Whether you plan to purchase or want alternatives</li>
        <li>
          A temporary anonymous session ID (cleared from stored rows after 24
          hours)
        </li>
      </ul>
      <p style={styles.body}>
        Purpose: product feedback for retailers. If you ask for recommendations,
        your ratings (not your identity) may be processed by our recommender
        hosted on Render and, when enabled, Google Gemini in the United States.
      </p>
      <p style={styles.fine}>
        Because answers are anonymous, individual access or deletion requests
        cannot be fulfilled. Full detail for operators is in{' '}
        <code>PRIVACY.md</code>.
      </p>
      <label style={styles.checkLabel}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          style={styles.checkbox}
        />
        I understand this survey collects anonymous product feedback only.
      </label>
      <button
        type="button"
        className="choice-btn"
        disabled={!checked}
        onClick={onAcknowledge}
        style={styles.button}
      >
        Continue to survey
      </button>
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  card: {
    width: '100%',
    maxWidth: 520,
    background: '#fff',
    border: '1px solid #d0d0d0',
    borderRadius: 12,
    padding: '24px 22px',
    textAlign: 'left',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: 22,
    fontWeight: 650,
  },
  body: {
    margin: '0 0 12px',
    fontSize: 15,
    lineHeight: 1.55,
    color: '#333',
  },
  list: {
    margin: '0 0 12px',
    paddingLeft: 22,
    fontSize: 15,
    lineHeight: 1.55,
    color: '#333',
  },
  fine: {
    margin: '0 0 16px',
    fontSize: 13,
    lineHeight: 1.5,
    color: '#555',
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    fontSize: 15,
    lineHeight: 1.4,
    color: '#222',
    marginBottom: 16,
    cursor: 'pointer',
  },
  checkbox: {
    marginTop: 3,
    width: 18,
    height: 18,
    flexShrink: 0,
  },
  button: {
    width: '100%',
    fontSize: 17,
  },
};
