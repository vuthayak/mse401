import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div className="app-shell" style={{ background: '#f5f5f5' }}>
      <main className="landing-main">
        <h1 className="landing-title">Fitting Room Surveys</h1>
        <p className="landing-subtitle">
          Sample micro-surveys for iPad kiosk prototypes. Pick a variant to try.
        </p>
        <nav className="landing-nav">
          <Link to="/survey-a" className="landing-card">
            <span className="landing-card-label">Sample Survey A</span>
            <span className="landing-card-desc">Pick an item, then rate one question at a time</span>
          </Link>
          <Link to="/survey-b" className="landing-card">
            <span className="landing-card-label">Sample Survey B</span>
            <span className="landing-card-desc">Pick an item, then rate all attributes at once</span>
          </Link>
        </nav>
      </main>
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}
