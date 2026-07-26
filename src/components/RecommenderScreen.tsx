import { useEffect, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { ProductHeader } from './ProductHeader';
import { SaveStatus } from './SaveStatus';
import type { PersistOutcome } from '../lib/persistSurvey';
import {
  catalogImageUrl,
  type RecommendationResult,
  type RecommendedItem,
} from '../lib/recommendItem';
import type { SurveyItem } from '../types/survey';

export type RecommenderState =
  | { status: 'loading' }
  | { status: 'ready'; result: RecommendationResult }
  | { status: 'empty'; message: string };

interface RecommenderScreenProps {
  variant: 'clinical' | 'warm';
  originalItem: SurveyItem;
  state: RecommenderState;
  saveOutcome: PersistOutcome | null;
  onStartOver: () => void;
  stepHeadingRef?: Ref<HTMLElement | null>;
  statusMessage?: string;
  progressNow?: number;
}

const priceFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 2,
});

export function RecommenderScreen({
  variant,
  originalItem,
  state,
  saveOutcome,
  onStartOver,
  stepHeadingRef,
  statusMessage = '',
  progressNow = 3,
}: RecommenderScreenProps) {
  const isClinical = variant === 'clinical';
  const borderColor = isClinical ? '#767676' : '#8a7f6e';

  useEffect(() => {
    document.title = 'Recommendation — Survey';
  }, []);

  const subtitle =
    state.status === 'loading'
      ? `Checking what else is in stock after your notes on ${originalItem.title}…`
      : state.status === 'ready'
        ? `Based on your feedback about ${originalItem.title}, here is what the fitting room has in stock.`
        : `We could not pull alternatives for ${originalItem.title} right now.`;

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
          <span className="recommender-badge">
            {state.status === 'ready' && state.result.items.length > 1
              ? 'Alternatives'
              : 'Recommendation'}
          </span>
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
            {state.status === 'loading'
              ? 'Finding your alternatives'
              : state.status === 'ready'
                ? 'We found something you might like'
                : 'No alternatives available'}
          </h1>
          <p className="recommender-subtitle">{subtitle}</p>
        </div>

        <SaveStatus outcome={saveOutcome} />

        {state.status === 'loading' && <RecommenderSkeleton borderColor={borderColor} />}

        {state.status === 'empty' && (
          <div
            className="recommender-card survey-card"
            style={{
              background: isClinical ? '#fff' : '#faf6f0',
              border: `1px solid ${borderColor}`,
            }}
          >
            <p className="recommender-note">{state.message}</p>
          </div>
        )}

        {state.status === 'ready' && (
          <ul className="recommender-list">
            {state.result.items.map((item, index) => (
              <li key={item.itemId}>
                <RecommendationCard
                  item={item}
                  rank={index + 1}
                  showRank={state.result.items.length > 1}
                  isClinical={isClinical}
                  borderColor={borderColor}
                />
              </li>
            ))}
          </ul>
        )}

        <button
          type="button"
          className="choice-btn"
          style={{ marginTop: 20, width: '100%', fontSize: 18, borderColor }}
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

function RecommendationCard({
  item,
  rank,
  showRank,
  isClinical,
  borderColor,
}: {
  item: RecommendedItem;
  rank: number;
  showRank: boolean;
  isClinical: boolean;
  borderColor: string;
}) {
  const productItem: SurveyItem = {
    id: item.itemId,
    title: item.title,
    tagline: `${item.brand} · ${item.colorLabel} · ${item.materialLabel}`,
    imageUrl: catalogImageUrl(item.imagePath),
  };

  return (
    <div
      className="recommender-card survey-card"
      style={{
        background: isClinical ? '#fff' : '#faf6f0',
        border: `1px solid ${borderColor}`,
      }}
    >
      {showRank && (
        <p className="recommender-rank">
          Option {rank}
          <span className="recommender-price">{priceFormatter.format(item.price)}</span>
        </p>
      )}
      <ProductHeader item={productItem} variant={isClinical ? 'clinical' : 'warm'} headingLevel={2} />
      <p className="recommender-meta">
        Size {item.size} · {showRank ? '' : `${priceFormatter.format(item.price)} · `}
        {item.inStock} in stock now
      </p>
      <ul className="recommender-reasons">
        {item.reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
    </div>
  );
}

function RecommenderSkeleton({ borderColor }: { borderColor: string }) {
  return (
    <div
      className="recommender-card survey-card recommender-skeleton"
      style={{ border: `1px dashed ${borderColor}` }}
      aria-hidden="true"
    >
      <div className="recommender-skeleton-row">
        <span className="recommender-skeleton-thumb" />
        <span className="recommender-skeleton-lines">
          <span className="recommender-skeleton-line" />
          <span className="recommender-skeleton-line recommender-skeleton-line--short" />
        </span>
      </div>
      <span className="recommender-skeleton-line" />
      <span className="recommender-skeleton-line recommender-skeleton-line--short" />
    </div>
  );
}
