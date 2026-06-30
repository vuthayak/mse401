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
  PRODUCT_DRESS,
  type ConversionDecision,
  type PartialSentimentMatrix,
  type SurveyPayload,
  isMatrixComplete,
} from '../types/survey';

export function SurveyB() {
  const [matrix, setMatrix] = useState<PartialSentimentMatrix>({});
  const [showIntent, setShowIntent] = useState(false);
  const [payload, setPayload] = useState<SurveyPayload | null>(null);

  const matrixComplete = isMatrixComplete(matrix);

  const handleSelect = (
    key: keyof PartialSentimentMatrix,
    signal: string,
  ) => {
    setMatrix((prev) => ({ ...prev, [key]: signal }));
  };

  const handleIntent = (decision: ConversionDecision) => {
    if (!isMatrixComplete(matrix)) return;
    const result = buildSurveyPayload(
      PRODUCT_DRESS,
      'STALL_07',
      matrix,
      decision,
    );
    console.log('survey_payload', result);
    setPayload(result);
    setShowIntent(false);
  };

  const handleTryAgain = () => {
    resetSession();
    setMatrix({});
    setPayload(null);
    setShowIntent(false);
  };

  if (payload) {
    return (
      <div className="app-shell" style={styles.page}>
        <main style={styles.main}>
          <ProductHeader product={PRODUCT_DRESS} variant="warm" />
          <JsonPreview payload={payload} />
          <button type="button" className="choice-btn" style={styles.tryAgainBtn} onClick={handleTryAgain}>
            Try Again
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
        <ProductHeader product={PRODUCT_DRESS} variant="warm" />

        <p style={styles.instruction}>Tap one option per category</p>

        <div style={styles.grid}>
          {AXIS_CONFIGS.map((axis) => {
            const selected = matrix[axis.key];
            const isFit = axis.key === 'size_fit';

            return (
              <div key={axis.key} style={styles.gridCell}>
                <h3 style={styles.cellLabel}>{axis.label}</h3>
                <div style={isFit ? styles.fitOptions : styles.binaryOptions}>
                  {axis.options.map((opt) => {
                    const isSelected = selected === opt.signal;
                    const isNegative =
                      opt.signal === 'TOO_SMALL' ||
                      opt.signal === 'TOO_LARGE' ||
                      opt.signal === 'DISLIKE_SHADE' ||
                      opt.signal === 'UNCOMFORTABLE_PROPORTIONS' ||
                      opt.signal === 'HARSH_FABRIC';

                    return (
                      <button
                        key={opt.signal}
                        type="button"
                        className={`choice-btn${isSelected ? ' selected' : ''}`}
                        style={{
                          ...styles.gridBtn,
                          ...(isFit ? styles.fitBtn : {}),
                        }}
                        aria-pressed={isSelected}
                        onClick={() => handleSelect(axis.key, opt.signal)}
                      >
                        <span style={styles.icon} aria-hidden="true">
                          {isFit
                            ? opt.signal === 'TOO_SMALL'
                              ? '−'
                              : opt.signal === 'PERFECT'
                                ? '✓'
                                : '+'
                            : isNegative
                              ? '👎'
                              : '👍'}
                        </span>
                        <span>{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {matrixComplete && !showIntent && (
          <div style={styles.stickyBar}>
            <button
              type="button"
              className="choice-btn selected"
              style={styles.continueBtn}
              onClick={() => setShowIntent(true)}
            >
              Continue
            </button>
          </div>
        )}

        {showIntent && (
          <div style={styles.overlay} role="dialog" aria-modal="true" aria-label="Your decision">
            <div style={styles.sheet}>
              <h2 style={styles.sheetTitle}>Your Decision</h2>
              <p style={styles.intentStem}>{INTENT_STEM}</p>
              <div style={styles.intentTiles}>
                <button
                  type="button"
                  className="choice-btn"
                  style={styles.intentTile}
                  onClick={() => handleIntent('KEEP_AND_WEAR')}
                >
                  <span style={styles.tileIcon}>✓</span>
                  <span>{INTENT_LABEL_PURCHASE}</span>
                </button>
                <button
                  type="button"
                  className="choice-btn"
                  style={styles.intentTile}
                  onClick={() => handleIntent('LEAVE_AND_SWAP')}
                >
                  <span style={styles.tileIcon}>↻</span>
                  <span>{INTENT_LABEL_LEAVE}</span>
                </button>
              </div>
              <button
                type="button"
                style={styles.cancelBtn}
                onClick={() => setShowIntent(false)}
              >
                Back to ratings
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
    background: '#f5efe6',
  },
  main: {
    flex: 1,
    padding: 24,
    maxWidth: 720,
    margin: '0 auto',
    width: '100%',
    paddingBottom: 100,
  },
  instruction: {
    margin: '0 0 16px',
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
  },
  gridCell: {
    background: '#faf6f0',
    border: '1px solid #e0d5c5',
    borderRadius: 8,
    padding: 16,
  },
  cellLabel: {
    margin: '0 0 12px',
    fontSize: 16,
    fontWeight: 600,
    textAlign: 'center',
  },
  binaryOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  fitOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  gridBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
    fontSize: 15,
    padding: '12px 10px',
    borderColor: '#d4c9b8',
  },
  fitBtn: {
    fontSize: 14,
  },
  icon: {
    fontSize: 18,
    lineHeight: 1,
  },
  stickyBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px 24px',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
    background: 'rgba(245, 239, 230, 0.95)',
    borderTop: '1px solid #e0d5c5',
    display: 'flex',
    justifyContent: 'center',
  },
  continueBtn: {
    width: '100%',
    maxWidth: 400,
    fontSize: 18,
    fontWeight: 600,
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100,
  },
  sheet: {
    background: '#faf6f0',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: '24px 24px calc(24px + env(safe-area-inset-bottom))',
    width: '100%',
    maxWidth: 720,
  },
  sheetTitle: {
    margin: '0 0 8px',
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
  intentTiles: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 12,
  },
  intentTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    padding: '20px 12px',
    fontSize: 17,
    fontWeight: 600,
    borderColor: '#d4c9b8',
    minHeight: 100,
  },
  tileIcon: {
    fontSize: 28,
    lineHeight: 1,
  },
  cancelBtn: {
    marginTop: 16,
    width: '100%',
    padding: 12,
    background: 'none',
    border: 'none',
    color: '#666',
    fontSize: 16,
  },
  tryAgainBtn: {
    marginTop: 20,
    width: '100%',
    fontSize: 18,
    borderColor: '#d4c9b8',
  },
  backLink: {
    display: 'inline-block',
    marginTop: 20,
    fontSize: 15,
    color: '#666',
  },
};
