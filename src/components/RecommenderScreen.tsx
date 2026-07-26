import { useEffect, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { ProductHeader } from './ProductHeader';
import { SaveStatus } from './SaveStatus';
import type { PersistOutcome } from '../lib/persistSurvey';
import type { Recommendation } from '../lib/recommendItem';
import type { SurveyItem } from '../types/survey';

interface RecommenderScreenProps {
  variant: 'clinical' | 'warm';
  originalItem: SurveyItem;
  recommendation: Recommendation;
  saveOutcome: PersistOutcome | null;
  onStartOver: () => void;
  stepHeadingRef?: Ref<HTMLElement | null>;
  statusMessage?: string;
  progressNow?: number;
}

export function RecommenderScreen({
  variant,
  originalItem,
  recommendation,
  saveOutcome,
  onStartOver,
  stepHeadingRef,
  statusMessage = '',
  progressNow = 3,
}: RecommenderScreenProps) {
  const isClinical = variant === 'clinical';

  useEffect(() => {
    document.title = 'Recommendation — Survey';
  }, []);

  return (
    <div className="app-shell" style={{ background: isClinical ? '#eef2f6' : '#f5efe6' }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      <main id="main-content" className="survey-main survey-main--fill" tabIndex={-1}>
        <div className="survey-progress-wrap">
          <p className="survey-step-label" aria-hidden="true">
            Step {progressNow} of 3
          </p>
          <div
            className="survey-progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={3}
            aria-valuenow={progressNow}
            aria-label="Survey progress"
          >
            {Array.from({ length: 3 }, (_, i) => (
              <span
                key={i}
                className="survey-progress-dot"
                style={{ background: i < progressNow ? '#333' : '#767676' }}
              />
            ))}
          </div>
        </div>

        <div className="recommender-header">
          <span className="recommender-badge">Recommendation</span>
          <h1
            ref={(el) => {
              if (typeof stepHeadingRef === 'function') {
                stepHeadingRef(el);
              } else if (stepHeadingRef) {
                stepHeadingRef.current = el;
              }
            }}
            className="recommender-title"
            tabIndex={-1}
          >
            We found something you might like
          </h1>
          <p className="recommender-subtitle">
            Based on your feedback about <strong>{originalItem.title}</strong>, try this
            alternative from our collection.
          </p>
        </div>

        <SaveStatus outcome={saveOutcome} />

        <div
          className="recommender-card survey-card"
          style={{
            background: isClinical ? '#fff' : '#faf6f0',
            border: `1px solid ${isClinical ? '#767676' : '#8a7f6e'}`,
          }}
        >
          <ProductHeader item={recommendation.item} variant={variant} headingLevel={2} />
          <ul className="recommender-reasons">
            {recommendation.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
          <p className="recommender-note">
            In a live system, recommendations would weigh your product choice and attribute
            ratings to surface the best match from inventory.
          </p>
        </div>

        <button
          type="button"
          className="choice-btn"
          style={{
            marginTop: 20,
            width: '100%',
            fontSize: 18,
            borderColor: isClinical ? '#767676' : '#8a7f6e',
          }}
          onClick={onStartOver}
        >
          Start Over
        </button>
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
