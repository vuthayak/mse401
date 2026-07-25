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
}

export function RecommenderScreen({
  variant,
  originalItem,
  recommendation,
  saveOutcome,
  onStartOver,
}: RecommenderScreenProps) {
  const isClinical = variant === 'clinical';

  return (
    <div className="app-shell" style={{ background: isClinical ? '#f0f0f0' : '#f5efe6' }}>
      <main className="survey-main survey-main--fill">
        <div className="recommender-header">
          <span className="recommender-badge">Recommendation</span>
          <h2 className="recommender-title">We found something you might like</h2>
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
            border: `1px solid ${isClinical ? '#ddd' : '#e0d5c5'}`,
          }}
        >
          <ProductHeader item={recommendation.item} variant={variant} />
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
            borderColor: isClinical ? '#ccc' : '#d4c9b8',
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
