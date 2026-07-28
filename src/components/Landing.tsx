import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyNotice } from './PrivacyNotice';

export function Landing() {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    document.title = 'Fitting Room Surveys';
  }, []);

  return (
    <div className="app-shell" style={{ background: '#f5f5f5' }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <main id="main-content" className="landing-main" tabIndex={-1}>
        <h1 className="landing-title">Fitting Room Surveys</h1>
        <p className="landing-subtitle">
          Micro-survey for iPad kiosk prototypes. Acknowledge the privacy notice
          to continue.
        </p>
        {!acknowledged ? (
          <PrivacyNotice onAcknowledge={() => setAcknowledged(true)} />
        ) : (
          <nav
            className="landing-nav landing-nav--split"
            aria-label="Survey and insights"
          >
            <Link to="/survey-c" className="landing-card">
              <span className="landing-card-label">Start Survey</span>
              <span className="landing-card-desc">
                Pick an item, rate four attributes, then confirm purchase intent
              </span>
            </Link>
            <Link to="/insights" className="landing-card landing-card--secondary">
              <span className="landing-card-label">Product Insights</span>
              <span className="landing-card-desc">
                Retailer view of Survey C ratings, purchase intent, and friction
              </span>
            </Link>
          </nav>
        )}
      </main>
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}
