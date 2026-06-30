import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { JsonPreview } from '../components/JsonPreview';
import { ProductHeader } from '../components/ProductHeader';
import { buildSurveyPayload } from '../lib/buildPayload';
import { resetSession } from '../lib/session';
import {
  AXIS_CONFIGS,
  INTENT_STEM,
  INTENT_LABEL_PURCHASE,
  INTENT_LABEL_LEAVE,
  PRODUCT_BLAZER,
  type ConversionDecision,
  type PartialSentimentMatrix,
  type SurveyPayload,
} from '../types/survey';

type WizardStep = 'axis' | 'intent' | 'result';

export function SurveyA() {
  const [axisIndex, setAxisIndex] = useState(0);
  const [step, setStep] = useState<WizardStep>('axis');
  const [matrix, setMatrix] = useState<PartialSentimentMatrix>({});
  const [payload, setPayload] = useState<SurveyPayload | null>(null);

  const handleAxisSelect = (index: number, signal: string) => {
    const config = AXIS_CONFIGS[index];
    setMatrix((prev) => ({ ...prev, [config.key]: signal }));
    if (index < 3) {
      setAxisIndex(index + 1);
    } else {
      setStep('intent');
    }
  };

  const handleIntent = (decision: ConversionDecision) => {
    if (
      !matrix.size_fit ||
      !matrix.colorway ||
      !matrix.cut_silhouette ||
      !matrix.material_property
    ) {
      return;
    }
    const result = buildSurveyPayload(
      PRODUCT_BLAZER,
      'STALL_03',
      {
        size_fit: matrix.size_fit,
        colorway: matrix.colorway,
        cut_silhouette: matrix.cut_silhouette,
        material_property: matrix.material_property,
      },
      decision,
    );
    console.log('survey_payload', result);
    setPayload(result);
    setStep('result');
  };

  const handleStartOver = () => {
    resetSession();
    setMatrix({});
    setPayload(null);
    setAxisIndex(0);
    setStep('axis');
  };

  if (step === 'result' && payload) {
    return (
      <div className="app-shell" style={styles.page}>
        <main style={styles.main}>
          <ProductHeader product={PRODUCT_BLAZER} variant="clinical" />
          <JsonPreview payload={payload} />
          <button type="button" className="choice-btn" style={styles.resetBtn} onClick={handleStartOver}>
            Start Over
          </button>
          <Link to="/" style={styles.backLink}>
            ← Back to samples
          </Link>
        </main>
        <footer className="privacy-footer">
          Anonymous session — no personal data collected
        </footer>
      </div>
    );
  }

  return (
    <div className="app-shell" style={styles.page}>
      <main style={styles.main}>
        <ProductHeader product={PRODUCT_BLAZER} variant="clinical" />

        {step === 'axis' && (
          <>
            <div style={styles.progress}>
              {AXIS_CONFIGS.map((_, i) => (
                <span
                  key={i}
                  style={{
                    ...styles.dot,
                    background: i <= axisIndex ? '#333' : '#ccc',
                  }}
                />
              ))}
            </div>
            <div style={styles.card}>
              <h2 style={styles.axisLabel}>{AXIS_CONFIGS[axisIndex].label}</h2>
              <div style={styles.choices}>
                {AXIS_CONFIGS[axisIndex].options.map((opt) => (
                  <button
                    key={opt.signal}
                    type="button"
                    className="choice-btn"
                    style={styles.choiceBtn}
                    onClick={() => handleAxisSelect(axisIndex, opt.signal)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 'intent' && (
          <div style={styles.card}>
            <h2 style={styles.intentHeading}>Your Decision</h2>
            <p style={styles.intentStem}>{INTENT_STEM}</p>
            <div style={styles.choices}>
              <button
                type="button"
                className="choice-btn"
                style={styles.choiceBtn}
                onClick={() => handleIntent('KEEP_AND_WEAR')}
              >
                {INTENT_LABEL_PURCHASE}
              </button>
              <button
                type="button"
                className="choice-btn"
                style={styles.choiceBtn}
                onClick={() => handleIntent('LEAVE_AND_SWAP')}
              >
                {INTENT_LABEL_LEAVE}
              </button>
            </div>
          </div>
        )}

        <Link to="/" style={styles.backLink}>
          ← Back to samples
        </Link>
      </main>
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    background: '#f0f0f0',
  },
  main: {
    flex: 1,
    padding: 24,
    maxWidth: 560,
    margin: '0 auto',
    width: '100%',
  },
  progress: {
    display: 'flex',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  card: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 24,
  },
  axisLabel: {
    margin: '0 0 20px',
    fontSize: 22,
    fontWeight: 600,
    textAlign: 'center',
  },
  choices: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  choiceBtn: {
    width: '100%',
    fontSize: 18,
  },
  intentHeading: {
    margin: '0 0 12px',
    fontSize: 18,
    fontWeight: 600,
    color: '#666',
  },
  intentStem: {
    margin: '0 0 20px',
    fontSize: 20,
    fontWeight: 500,
    lineHeight: 1.4,
  },
  resetBtn: {
    marginTop: 20,
    width: '100%',
    fontSize: 18,
  },
  backLink: {
    display: 'inline-block',
    marginTop: 20,
    fontSize: 15,
    color: '#666',
  },
};
