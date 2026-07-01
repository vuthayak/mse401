import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ItemSelection } from '../components/ItemSelection';
import { ProductHeader } from '../components/ProductHeader';
import { ResponsePreview } from '../components/ResponsePreview';
import { SaveStatus } from '../components/SaveStatus';
import { persistSurveyAResponse, type PersistOutcome } from '../lib/persistSurvey';
import { getSessionToken, resetSession } from '../lib/session';
import {
  SURVEY_A_AXES,
  INTENT_STEM,
  INTENT_LABEL_PURCHASE,
  INTENT_LABEL_LEAVE,
  isScaleRatingsComplete,
  type ConversionDecision,
  type PartialScaleRatings,
  type ScaleRating,
  type SurveyAResponse,
  type SurveyItem,
} from '../types/survey';

type WizardStep = 'items' | 'axis' | 'intent' | 'result';

const TOTAL_STEPS = 5;

export function SurveyA() {
  const [step, setStep] = useState<WizardStep>('items');
  const [selectedItem, setSelectedItem] = useState<SurveyItem | null>(null);
  const [axisIndex, setAxisIndex] = useState(0);
  const [ratings, setRatings] = useState<PartialScaleRatings>({});
  const [response, setResponse] = useState<SurveyAResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<PersistOutcome | null>(null);

  const progressStep =
    step === 'items' ? 0 : step === 'axis' ? axisIndex + 1 : step === 'intent' ? 5 : 5;

  const handleItemSelect = (item: SurveyItem) => {
    setSelectedItem(item);
    setAxisIndex(0);
    setRatings({});
    setStep('axis');
  };

  const handleAxisSelect = (value: ScaleRating) => {
    const config = SURVEY_A_AXES[axisIndex];
    setRatings((prev) => ({ ...prev, [config.key]: value }));
    if (axisIndex < SURVEY_A_AXES.length - 1) {
      setAxisIndex(axisIndex + 1);
    } else {
      setStep('intent');
    }
  };

  const handleIntent = async (decision: ConversionDecision) => {
    if (!selectedItem || !isScaleRatingsComplete(ratings)) return;

    const record: SurveyAResponse = {
      session_token: getSessionToken(),
      selected_item: selectedItem.id,
      fabric: ratings.fabric,
      fit: ratings.fit,
      colour: ratings.colour,
      price: ratings.price,
      purchase_intent: decision,
    };

    setSaving(true);
    setSaveOutcome(null);
    const outcome = await persistSurveyAResponse(record);
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
    setAxisIndex(0);
    setStep('items');
  };

  if (step === 'result' && response && selectedItem) {
    return (
      <div className="app-shell" style={{ background: '#f0f0f0' }}>
        <main className="survey-main">
          <ProductHeader item={selectedItem} variant="clinical" />
          <SaveStatus outcome={saveOutcome} />
          <ResponsePreview record={response} />
          <button type="button" className="choice-btn" style={{ marginTop: 20, width: '100%', fontSize: 18 }} onClick={handleStartOver}>
            Start Over
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
      <div className="app-shell" style={{ background: '#f0f0f0' }}>
        <main className="survey-main survey-main--fill">
          <ItemSelection variant="clinical" onSelect={handleItemSelect} />
        </main>
        <footer className="privacy-footer">
          Anonymous session — no personal data collected
        </footer>
      </div>
    );
  }

  if (!selectedItem) return null;

  return (
    <div className="app-shell" style={{ background: '#f0f0f0' }}>
      <main className="survey-main survey-main--fill">
        <ProductHeader item={selectedItem} variant="clinical" />

        {(step === 'axis' || step === 'intent') && (
          <div className="survey-progress">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <span
                key={i}
                className="survey-progress-dot"
                style={{ background: i < progressStep ? '#333' : '#ccc' }}
              />
            ))}
          </div>
        )}

        {step === 'axis' && (
          <div className="survey-card" style={{ background: '#fff', border: '1px solid #ddd', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p className="survey-step-label">Step {axisIndex + 1} of {SURVEY_A_AXES.length}</p>
            <h2 className="survey-axis-label">{SURVEY_A_AXES[axisIndex].label}</h2>
            <div className="scale-row">
              {SURVEY_A_AXES[axisIndex].options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="choice-btn scale-btn"
                  onClick={() => handleAxisSelect(opt.value)}
                >
                  <span className="scale-btn-label">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'intent' && (
          <div className="survey-card" style={{ background: '#fff', border: '1px solid #ddd', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p className="survey-step-label">Step 5 of 5</p>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: '#666' }}>Your Decision</h2>
            <p style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 500, lineHeight: 1.4 }}>{INTENT_STEM}</p>
            <div className="intent-choices">
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                disabled={saving}
                onClick={() => handleIntent('KEEP_AND_WEAR')}
              >
                {saving ? 'Saving…' : INTENT_LABEL_PURCHASE}
              </button>
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                disabled={saving}
                onClick={() => handleIntent('LEAVE_AND_SWAP')}
              >
                {saving ? 'Saving…' : INTENT_LABEL_LEAVE}
              </button>
            </div>
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
