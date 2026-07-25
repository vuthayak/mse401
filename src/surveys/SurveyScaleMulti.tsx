import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ItemSelection } from '../components/ItemSelection';
import { ProductHeader } from '../components/ProductHeader';
import { RecommenderScreen } from '../components/RecommenderScreen';
import { ResponsePreview } from '../components/ResponsePreview';
import { SaveStatus } from '../components/SaveStatus';
import { ScaleAxisPanel } from '../components/ScaleAxisPanel';
import { persistSurveyCResponse, type PersistOutcome } from '../lib/persistSurvey';
import { getUnhappyAttributesFromScale, recommendItem } from '../lib/recommendItem';
import { getSessionToken, resetSession } from '../lib/session';
import {
  SURVEY_A_AXES,
  INTENT_STEM,
  INTENT_LABEL_PURCHASE,
  INTENT_LABEL_LEAVE,
  isScaleRatingsComplete,
  type AttributeKey,
  type IntentDecision,
  type PartialScaleRatings,
  type ScaleRating,
  type SurveyCResponse,
  type SurveyItem,
} from '../types/survey';

type SurveyStep = 'items' | 'ratings' | 'intent' | 'result';

interface SurveyScaleMultiProps {
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  stickyBarClass: string;
  itemSelectionVariant: 'clinical' | 'warm';
  productHeaderVariant: 'clinical' | 'warm';
  recommenderVariant: 'clinical' | 'warm';
}

export function SurveyScaleMulti({
  pageBackground,
  cardBackground,
  cardBorder,
  stickyBarClass,
  itemSelectionVariant,
  productHeaderVariant,
  recommenderVariant,
}: SurveyScaleMultiProps) {
  const [step, setStep] = useState<SurveyStep>('items');
  const [selectedItem, setSelectedItem] = useState<SurveyItem | null>(null);
  const [ratings, setRatings] = useState<PartialScaleRatings>({});
  const [response, setResponse] = useState<SurveyCResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<PersistOutcome | null>(null);

  const ratingsComplete = isScaleRatingsComplete(ratings);

  const handleItemSelect = (item: SurveyItem) => {
    setSelectedItem(item);
    setRatings({});
    setStep('ratings');
  };

  const handleRating = (key: AttributeKey, value: ScaleRating) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleIntent = async (decision: IntentDecision) => {
    if (!selectedItem || !isScaleRatingsComplete(ratings)) return;

    const record: SurveyCResponse = {
      session_token: getSessionToken(),
      selected_item: selectedItem.id,
      fabric: ratings.fabric,
      fit: ratings.fit,
      colour: ratings.colour,
      price: ratings.price,
      intent: decision,
    };

    setSaving(true);
    setSaveOutcome(null);
    const outcome = await persistSurveyCResponse(record);
    setSaveOutcome(outcome);
    setSaving(false);
    setResponse(record);
    setStep('result');
  };

  const handleStartOver = () => {
    resetSession();
    setSelectedItem(null);
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setStep('items');
  };

  if (step === 'result' && response && selectedItem) {
    if (response.intent === 'NO') {
      const recommendation = recommendItem(
        selectedItem.id,
        getUnhappyAttributesFromScale({
          fabric: response.fabric,
          fit: response.fit,
          colour: response.colour,
          price: response.price,
        }),
      );

      if (recommendation) {
        return (
          <RecommenderScreen
            variant={recommenderVariant}
            originalItem={selectedItem}
            recommendation={recommendation}
            saveOutcome={saveOutcome}
            onStartOver={handleStartOver}
          />
        );
      }
    }

    return (
      <Shell background={pageBackground}>
        <main className="survey-main">
          <ProductHeader item={selectedItem} variant={productHeaderVariant} />
          <SaveStatus outcome={saveOutcome} />
          <ResponsePreview record={response} />
          <button
            type="button"
            className="choice-btn"
            style={{ marginTop: 20, width: '100%', fontSize: 18, borderColor: cardBorder }}
            onClick={handleStartOver}
          >
            Start Over
          </button>
          <Link to="/" className="survey-back-link">
            ← Back to start
          </Link>
        </main>
      </Shell>
    );
  }

  if (step === 'items') {
    return (
      <Shell background={pageBackground}>
        <main className="survey-main survey-main--fill">
          <ItemSelection variant={itemSelectionVariant} onSelect={handleItemSelect} />
        </main>
      </Shell>
    );
  }

  if (!selectedItem) return null;

  return (
    <Shell background={pageBackground}>
      <main
        className={`survey-main survey-main--fill${
          step === 'ratings' && ratingsComplete ? ' survey-main--with-sticky' : ''
        }`}
      >
        <ProductHeader item={selectedItem} variant={productHeaderVariant} />

        {step === 'ratings' && (
          <div className="survey-scale-body">
            <p className="survey-b-prompt">Rate each attribute for this product</p>
            <div className="scale-grid-2x2">
              {SURVEY_A_AXES.map((axis) => (
                <ScaleAxisPanel
                  key={axis.key}
                  axisKey={axis.key}
                  value={ratings[axis.key]}
                  onSelect={(value) => handleRating(axis.key, value)}
                />
              ))}
            </div>
          </div>
        )}

        {step === 'ratings' && ratingsComplete && (
          <div className={`sticky-bar ${stickyBarClass}`}>
            <button
              type="button"
              className="choice-btn selected sticky-bar-btn"
              onClick={() => setStep('intent')}
            >
              Continue
            </button>
          </div>
        )}

        {step === 'intent' && (
          <div
            className="survey-card"
            style={{
              background: cardBackground,
              border: `1px solid ${cardBorder}`,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: '#666' }}>
              Your Decision
            </h2>
            <p style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 500, lineHeight: 1.4 }}>
              {INTENT_STEM}
            </p>
            <div className="intent-choices">
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                disabled={saving}
                onClick={() => handleIntent('YES')}
              >
                {saving ? 'Saving…' : INTENT_LABEL_PURCHASE}
              </button>
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                disabled={saving}
                onClick={() => handleIntent('NO')}
              >
                {saving ? 'Saving…' : INTENT_LABEL_LEAVE}
              </button>
            </div>
            <button
              type="button"
              style={{
                marginTop: 16,
                width: '100%',
                padding: 12,
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: 16,
              }}
              onClick={() => setStep('ratings')}
            >
              Back to ratings
            </button>
          </div>
        )}

        <Link to="/" className="survey-back-link">
          ← Back to start
        </Link>
      </main>
    </Shell>
  );
}

function Shell({
  background,
  children,
}: {
  background: string;
  children: ReactNode;
}) {
  return (
    <div className="app-shell" style={{ background }}>
      {children}
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}
