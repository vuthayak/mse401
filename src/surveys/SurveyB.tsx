import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemSelection } from '../components/ItemSelection';
import { ProductHeader } from '../components/ProductHeader';
import { ResponsePreview } from '../components/ResponsePreview';
import { SaveStatus } from '../components/SaveStatus';
import { persistSurveyBResponse, type PersistOutcome } from '../lib/persistSurvey';
import { getSessionToken, resetSession } from '../lib/session';
import {
  SURVEY_B_AXES,
  INTENT_STEM,
  INTENT_LABEL_PURCHASE,
  INTENT_LABEL_LEAVE,
  isBinaryRatingsComplete,
  type AttributeKey,
  type ConversionDecision,
  type PartialBinaryRatings,
  type SurveyBResponse,
  type SurveyItem,
} from '../types/survey';

type SurveyStep = 'items' | 'intent' | 'ratings' | 'result';

export function SurveyB() {
  const [step, setStep] = useState<SurveyStep>('items');
  const [selectedItem, setSelectedItem] = useState<SurveyItem | null>(null);
  const [purchaseIntent, setPurchaseIntent] = useState<ConversionDecision | null>(null);
  const [ratings, setRatings] = useState<PartialBinaryRatings>({});
  const [response, setResponse] = useState<SurveyBResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<PersistOutcome | null>(null);

  const ratingsComplete = isBinaryRatingsComplete(ratings);

  const handleItemSelect = (item: SurveyItem) => {
    setSelectedItem(item);
    setPurchaseIntent(null);
    setRatings({});
    setStep('intent');
  };

  const handleIntent = (decision: ConversionDecision) => {
    setPurchaseIntent(decision);
    setRatings({});
    setStep('ratings');
  };

  const handleRating = (key: AttributeKey, value: boolean) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!selectedItem || !purchaseIntent || !isBinaryRatingsComplete(ratings)) return;

    const record: SurveyBResponse = {
      session_token: getSessionToken(),
      selected_item: selectedItem.id,
      purchase_intent: purchaseIntent,
      fabric: ratings.fabric,
      fit: ratings.fit,
      colour: ratings.colour,
      price: ratings.price,
    };

    setSaving(true);
    setSaveOutcome(null);
    const outcome = await persistSurveyBResponse(record);
    setSaveOutcome(outcome);
    setSaving(false);
    setResponse(record);
    setStep('result');
  };

  const handleTryAgain = () => {
    resetSession();
    setSelectedItem(null);
    setPurchaseIntent(null);
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setStep('items');
  };

  if (step === 'result' && response && selectedItem) {
    return (
      <div className="app-shell" style={{ background: '#f5efe6' }}>
        <main className="survey-main">
          <ProductHeader item={selectedItem} variant="warm" />
          <SaveStatus outcome={saveOutcome} />
          <ResponsePreview record={response} />
          <button
            type="button"
            className="choice-btn"
            style={{ marginTop: 20, width: '100%', fontSize: 18, borderColor: '#d4c9b8' }}
            onClick={handleTryAgain}
          >
            Try Again
          </button>
          <Link to="/" className="survey-back-link">
            ← Back to samples
          </Link>
        </main>
        <footer className="privacy-footer">
          Anonymous session — no personal data collected
        </footer>
      </div>
    );
  }

  if (step === 'items') {
    return (
      <div className="app-shell" style={{ background: '#f5efe6' }}>
        <main className="survey-main survey-main--fill">
          <ItemSelection variant="warm" onSelect={handleItemSelect} />
        </main>
        <footer className="privacy-footer">
          Anonymous session — no personal data collected
        </footer>
      </div>
    );
  }

  if (!selectedItem) return null;

  return (
    <div className="app-shell" style={{ background: '#f5efe6' }}>
      <main className={`survey-main survey-main--fill${ratingsComplete ? ' survey-main--with-sticky' : ''}`}>
        <ProductHeader item={selectedItem} variant="warm" />

        {step === 'intent' && (
          <div
            className="survey-card"
            style={{
              background: '#faf6f0',
              border: '1px solid #e0d5c5',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600, color: '#666' }}>Your Decision</h2>
            <p style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 500, lineHeight: 1.4 }}>{INTENT_STEM}</p>
            <div className="intent-tiles">
              <button
                type="button"
                className="choice-btn intent-tile"
                style={{ borderColor: '#d4c9b8' }}
                onClick={() => handleIntent('KEEP_AND_WEAR')}
              >
                <span className="intent-tile-icon">✓</span>
                <span>{INTENT_LABEL_PURCHASE}</span>
              </button>
              <button
                type="button"
                className="choice-btn intent-tile"
                style={{ borderColor: '#d4c9b8' }}
                onClick={() => handleIntent('LEAVE_AND_SWAP')}
              >
                <span className="intent-tile-icon">↻</span>
                <span>{INTENT_LABEL_LEAVE}</span>
              </button>
            </div>
            <button
              type="button"
              style={{ marginTop: 16, width: '100%', padding: 12, background: 'none', border: 'none', color: '#666', fontSize: 16 }}
              onClick={() => setStep('items')}
            >
              Back to items
            </button>
          </div>
        )}

        {step === 'ratings' && (
          <div className="survey-b-body">
            <p className="survey-b-prompt">What do you think about this product?</p>
            <div className="attribute-row">
              {SURVEY_B_AXES.map((axis) => {
                const selected = ratings[axis.key];
                const thumbsUpSelected = selected === true;
                const thumbsDownSelected = selected === false;

                return (
                  <div key={axis.key} className="attribute-col">
                    <button
                      type="button"
                      className={`choice-btn thumb-btn${thumbsUpSelected ? ' selected' : ''}`}
                      style={{ borderColor: '#d4c9b8' }}
                      aria-pressed={thumbsUpSelected}
                      aria-label={`${axis.label}: thumbs up`}
                      onClick={() => handleRating(axis.key, true)}
                    >
                      <span className="thumb-icon" aria-hidden="true">👍</span>
                    </button>
                    <span className="attribute-label">{axis.label}</span>
                    <button
                      type="button"
                      className={`choice-btn thumb-btn${thumbsDownSelected ? ' selected' : ''}`}
                      style={{ borderColor: '#d4c9b8' }}
                      aria-pressed={thumbsDownSelected}
                      aria-label={`${axis.label}: thumbs down`}
                      onClick={() => handleRating(axis.key, false)}
                    >
                      <span className="thumb-icon" aria-hidden="true">👎</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 'ratings' && ratingsComplete && (
          <div className="sticky-bar sticky-bar--warm">
            <button
              type="button"
              className="choice-btn selected sticky-bar-btn"
              disabled={saving}
              onClick={handleSubmit}
            >
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </div>
        )}

        <Link to="/" className="survey-back-link">
          ← Back to samples
        </Link>
      </main>
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}
