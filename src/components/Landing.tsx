import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="app-shell" style={styles.page}>
      <main style={styles.main}>
        <h1 style={styles.title}>Fitting Room Surveys</h1>
        <p style={styles.subtitle}>
          Sample micro-surveys for iPad kiosk prototypes. Pick a variant to try.
        </p>
        <nav style={styles.nav}>
          <Link to="/survey-a" style={styles.card}>
            <span style={styles.cardLabel}>Sample Survey A</span>
            <span style={styles.cardDesc}>Wizard — one question per screen</span>
          </Link>
          <Link to="/survey-b" style={styles.card}>
            <span style={styles.cardLabel}>Sample Survey B</span>
            <span style={styles.cardDesc}>Grid — all axes on one screen</span>
          </Link>
        </nav>
      </main>
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: '#f5f5f5',
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  title: {
    margin: '0 0 8px',
    fontSize: 28,
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 32px',
    color: '#666',
    textAlign: 'center',
    maxWidth: 400,
  },
  nav: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    width: '100%',
    maxWidth: 420,
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    padding: '20px 24px',
    background: '#fff',
    border: '2px solid #ccc',
    borderRadius: 8,
    textDecoration: 'none',
    minHeight: 72,
  },
  cardLabel: {
    fontSize: 20,
    fontWeight: 600,
  },
  cardDesc: {
    fontSize: 15,
    color: '#666',
  },
};
