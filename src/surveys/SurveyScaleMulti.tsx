import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ItemSelection } from '../components/ItemSelection';
import { ProductHeader } from '../components/ProductHeader';
import {
  RecommenderScreen,
  sizeOptionsFromOutcome,
  type RecommenderState,
  type SizeOptionsState,
} from '../components/RecommenderScreen';
import { ResponsePreview } from '../components/ResponsePreview';
import { SaveStatus } from '../components/SaveStatus';
import { ScaleAxisPanel } from '../components/ScaleAxisPanel';
import { fetchSizeOptions } from '../lib/fetchSizeOptions';
import { getFittingRoom } from '../lib/fittingRoom';
import { persistSurveyCResponse, type PersistOutcome } from '../lib/persistSurvey';
import { fetchRecommendations } from '../lib/recommendItem';
import { getSessionToken, resetSession } from '../lib/session';
import { isOnline } from '../lib/withRetry';
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

const TOTAL_PROGRESS_STEPS = 3;

interface SurveyScaleMultiProps {
  pageBackground: string;
  cardBackground: string;
  cardBorder: string;
  stickyBarClass: string;
  itemSelectionVariant: 'clinical' | 'warm';
  productHeaderVariant: 'clinical' | 'warm';
  recommenderVariant: 'clinical' | 'warm';
}

function progressValue(step: SurveyStep): number {
  if (step === 'ratings') return 1;
  if (step === 'intent') return 2;
  if (step === 'result') return 3;
  return 0;
}

function stepTitle(step: SurveyStep, showingRecommender: boolean): string {
  if (step === 'items') return 'Choose item — Survey';
  if (step === 'ratings') return 'Rate attributes — Survey';
  if (step === 'intent') return 'Your decision — Survey';
  if (showingRecommender) return 'Recommendation — Survey';
  return 'Survey complete — Survey';
}

function stepAnnouncement(step: SurveyStep, showingRecommender: boolean): string {
  if (step === 'items') return 'Choose an item';
  if (step === 'ratings') return 'Step 1 of 3: Rate each attribute for this product';
  if (step === 'intent') return 'Step 2 of 3: Your purchase decision';
  if (showingRecommender) return 'Step 3 of 3: Recommendation';
  return 'Step 3 of 3: Survey complete';
}

function formatMissingHelp(missingLabels: string[]): string {
  if (missingLabels.length === 0) {
    return 'All attributes rated. Continue to your purchase decision.';
  }
  if (missingLabels.length === 1) {
    return `Rate ${missingLabels[0]} to continue.`;
  }
  const head = missingLabels.slice(0, -1).join(', ');
  const last = missingLabels[missingLabels.length - 1];
  return `Rate ${head} and ${last} to continue.`;
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
  const [searchParams] = useSearchParams();
  const fittingRoom = getFittingRoom(searchParams);
  const [step, setStep] = useState<SurveyStep>('items');
  const [selectedItem, setSelectedItem] = useState<SurveyItem | null>(null);
  const [ratings, setRatings] = useState<PartialScaleRatings>({});
  const [response, setResponse] = useState<SurveyCResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<PersistOutcome | null>(null);
  const [online, setOnline] = useState(isOnline);
  const [statusMessage, setStatusMessage] = useState('');
  const [recommender, setRecommender] = useState<RecommenderState | null>(null);
  const [sizeOptions, setSizeOptions] = useState<SizeOptionsState>({
    status: 'loading',
  });
  const stepHeadingRef = useRef<HTMLElement | null>(null);
  const prevRatingsComplete = useRef(false);
  // Abandoned when the shopper starts over mid-request.
  const recommenderRequest = useRef<AbortController | null>(null);
  const sizeOptionsRequest = useRef<AbortController | null>(null);

  const ratingsComplete = isScaleRatingsComplete(ratings);
  const missingLabels = SURVEY_A_AXES.filter(
    (axis) => ratings[axis.key] === undefined,
  ).map((axis) => axis.label);
  const continueHelpId = 'continue-ratings-help';
  const progressNow = progressValue(step);

  const showingRecommender = recommender !== null;

  useEffect(() => {
    document.title = stepTitle(step, showingRecommender);
  }, [step, showingRecommender]);

  useEffect(() => {
    setStatusMessage(stepAnnouncement(step, showingRecommender));
    // Defer focus until after the new step heading mounts.
    requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
  }, [step, showingRecommender]);

  useEffect(() => {
    if (step === 'ratings' && ratingsComplete && !prevRatingsComplete.current) {
      setStatusMessage('All ratings complete. Continue is available.');
    }
    prevRatingsComplete.current = ratingsComplete;
  }, [ratingsComplete, step]);

  useEffect(() => {
    const sync = () => setOnline(isOnline());
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

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
      id: crypto.randomUUID(),
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
    setResponse(record);
    const outcome = await persistSurveyCResponse(record);
    setSaveOutcome(outcome);
    setSaving(false);

    if (decision === 'NO') {
      // Show the result screen immediately and stream the alternatives in, so a
      // cold API host does not leave the shopper on a blank step. Size options
      // come from Supabase in parallel and usually land first.
      setRecommender({ status: 'loading' });
      setSizeOptions({ status: 'loading' });
      setStep('result');
      void loadRecommendations(record);
      void loadSizeOptions(record);
      return;
    }

    setRecommender(null);
    setSizeOptions({ status: 'loading' });
    setStep('result');
  };

  const handleRetrySave = async () => {
    if (!response || saving) return;
    setSaving(true);
    setSaveOutcome(null);
    const outcome = await persistSurveyCResponse(response);
    setSaveOutcome(outcome);
    setSaving(false);
  };

  const loadRecommendations = async (record: SurveyCResponse) => {
    recommenderRequest.current?.abort();
    const controller = new AbortController();
    recommenderRequest.current = controller;

    const outcome = await fetchRecommendations({
      sessionToken: record.session_token,
      selectedItemId: record.selected_item,
      ratings: {
        fabric: record.fabric,
        fit: record.fit,
        colour: record.colour,
        price: record.price,
      },
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;

    if (outcome.status === 'ok' && outcome.result.items.length > 0) {
      setRecommender({ status: 'ready', result: outcome.result });
      setStatusMessage(
        `Step 3 of 3: ${outcome.result.items.length} alternative${
          outcome.result.items.length === 1 ? '' : 's'
        } found`,
      );
      return;
    }

    setRecommender({
      status: 'empty',
      message:
        outcome.status === 'error'
          ? outcome.message
          : outcome.status === 'unavailable'
            ? 'Recommendations are not configured for this deployment.'
            : 'Nothing comparable is in stock at this store right now.',
    });
  };

  const loadSizeOptions = async (record: SurveyCResponse) => {
    sizeOptionsRequest.current?.abort();
    const controller = new AbortController();
    sizeOptionsRequest.current = controller;

    const outcome = await fetchSizeOptions({
      surveyItemId: record.selected_item,
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;
    setSizeOptions(sizeOptionsFromOutcome(outcome));
  };

  const handleStartOver = () => {
    recommenderRequest.current?.abort();
    recommenderRequest.current = null;
    sizeOptionsRequest.current?.abort();
    sizeOptionsRequest.current = null;
    resetSession();
    setSelectedItem(null);
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setRecommender(null);
    setSizeOptions({ status: 'loading' });
    setStep('items');
  };

  useEffect(
    () => () => {
      recommenderRequest.current?.abort();
      sizeOptionsRequest.current?.abort();
    },
    [],
  );

  if (step === 'result' && response && selectedItem && recommender) {
    return (
      <RecommenderScreen
        variant={recommenderVariant}
        originalItem={selectedItem}
        state={recommender}
        sizeOptions={sizeOptions}
        sessionToken={response.session_token}
        fittingRoom={fittingRoom}
        saveOutcome={saveOutcome}
        saving={saving}
        onRetrySave={handleRetrySave}
        retryDisabled={!online}
        onStartOver={handleStartOver}
        stepHeadingRef={stepHeadingRef}
        statusMessage={statusMessage}
        progressNow={progressNow}
      />
    );
  }

  if (step === 'result' && response && selectedItem) {

    return (
      <Shell background={pageBackground} statusMessage={statusMessage}>
        <main id="main-content" className="survey-main" tabIndex={-1}>
          <SurveyProgress value={progressNow} />
          <ProductHeader item={selectedItem} variant={productHeaderVariant} />
          <h2
            ref={(el) => {
              stepHeadingRef.current = el;
            }}
            className="visually-hidden"
            tabIndex={-1}
          >
            Survey complete
          </h2>
          <SaveStatus
            outcome={saveOutcome}
            saving={saving}
            onRetry={
              saveOutcome?.status === 'error' ? handleRetrySave : undefined
            }
            retryDisabled={!online}
          />
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
      <Shell background={pageBackground} statusMessage={statusMessage}>
        <main id="main-content" className="survey-main survey-main--fill" tabIndex={-1}>
          <ItemSelection
            variant={itemSelectionVariant}
            onSelect={handleItemSelect}
            headingRef={(el) => {
              stepHeadingRef.current = el;
            }}
          />
        </main>
      </Shell>
    );
  }

  if (!selectedItem) return null;

  return (
    <Shell background={pageBackground} statusMessage={statusMessage}>
      <main
        id="main-content"
        className={`survey-main survey-main--fill${
          step === 'ratings' ? ' survey-main--with-sticky' : ''
        }`}
        tabIndex={-1}
      >
        <ProductHeader item={selectedItem} variant={productHeaderVariant} />

        {(step === 'ratings' || step === 'intent') && (
          <SurveyProgress value={progressNow} />
        )}

        {step === 'ratings' && (
          <div className="survey-scale-body">
            <p
              ref={(el) => {
                stepHeadingRef.current = el;
              }}
              className="survey-b-prompt"
              tabIndex={-1}
            >
              Rate each attribute for this product
            </p>
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

        {step === 'ratings' && (
          <div className={`sticky-bar ${stickyBarClass}`}>
            <p id={continueHelpId} className="sticky-bar-help">
              {formatMissingHelp(missingLabels)}
            </p>
            <button
              type="button"
              className={`choice-btn sticky-bar-btn${ratingsComplete ? ' selected' : ''}`}
              disabled={!ratingsComplete}
              aria-describedby={continueHelpId}
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
            <h2
              ref={(el) => {
                stepHeadingRef.current = el;
              }}
              id="intent-heading"
              tabIndex={-1}
              style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 600, color: '#595959' }}
            >
              Your Decision
            </h2>
            <p id="intent-stem" style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 500, lineHeight: 1.4 }}>
              {INTENT_STEM}
            </p>
            {saving && <SaveStatus outcome={null} saving />}
            <div
              className="intent-choices"
              role="group"
              aria-labelledby="intent-heading intent-stem"
            >
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
              className="text-btn"
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

function SurveyProgress({ value }: { value: number }) {
  return (
    <div className="survey-progress-wrap">
      <p className="survey-step-label" aria-hidden="true">
        Step {value} of {TOTAL_PROGRESS_STEPS}
      </p>
      <div
        className="survey-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={TOTAL_PROGRESS_STEPS}
        aria-valuenow={value}
        aria-label="Survey progress"
      >
        {Array.from({ length: TOTAL_PROGRESS_STEPS }, (_, i) => (
          <span
            key={i}
            className="survey-progress-dot"
            style={{ background: i < value ? '#333' : '#767676' }}
          />
        ))}
      </div>
    </div>
  );
}

function Shell({
  background,
  children,
  statusMessage,
}: {
  background: string;
  children: ReactNode;
  statusMessage: string;
}) {
  return (
    <div className="app-shell" style={{ background }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
      {children}
      <footer className="privacy-footer">
        Anonymous session — no personal data collected
      </footer>
    </div>
  );
}
