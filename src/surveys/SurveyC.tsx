import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNotice } from '../components/PrivacyNotice';
import { SurveyScaleMulti } from './SurveyScaleMulti';

export function SurveyC() {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (!acknowledged) {
      document.title = 'Before you start — Survey';
    }
  }, [acknowledged]);

  if (!acknowledged) {
    return (
      <div className="app-shell" style={{ background: '#eef2f6' }}>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <main id="main-content" className="landing-main" tabIndex={-1}>
          <h1 className="landing-title">Fitting Room Survey</h1>
          <p className="landing-subtitle">
            Acknowledge the privacy notice to begin.
          </p>
          <PrivacyNotice onAcknowledge={() => setAcknowledged(true)} />
          <Link to="/" className="survey-back-link">
            ← Back to start
          </Link>
        </main>
        <footer className="privacy-footer">
          Anonymous session — no personal data collected
        </footer>
      </div>
    );
  }

  return (
    <SurveyScaleMulti
      pageBackground="#eef2f6"
      cardBackground="#fff"
      cardBorder="#767676"
      stickyBarClass="sticky-bar--clinical"
      itemSelectionVariant="clinical"
      productHeaderVariant="clinical"
      recommenderVariant="clinical"
    />
  );
}
