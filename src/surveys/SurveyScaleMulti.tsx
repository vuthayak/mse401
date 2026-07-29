import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CartItemSelection } from '../components/CartItemSelection';
import { CartWaiting } from '../components/CartWaiting';
import { ProductHeader } from '../components/ProductHeader';
import {
  RecommenderScreen,
  sizeOptionsFromOutcome,
  type RecommenderState,
  type SizeOptionsState,
} from '../components/RecommenderScreen';
import { SaveStatus } from '../components/SaveStatus';
import { ScaleAxisPanel } from '../components/ScaleAxisPanel';
import type { CartItem } from '../lib/carts';
import { fetchSizeOptions } from '../lib/fetchSizeOptions';
import { getFittingRoom } from '../lib/fittingRoom';
import { persistSurveyCResponse, type PersistOutcome } from '../lib/persistSurvey';
import { fetchRecommendations } from '../lib/recommendItem';
import { getSessionToken, resetSession } from '../lib/session';
import { useFittingRoomCart } from '../lib/useFittingRoomCart';
import { isOnline } from '../lib/withRetry';
import {
  SURVEY_A_AXES,
  INTENT_STEM,
  INTENT_LABEL_PURCHASE,
  INTENT_LABEL_LEAVE,
  cartItemToTryOnItem,
  isScaleRatingsComplete,
  type AttributeKey,
  type IntentDecision,
  type PartialScaleRatings,
  type ScaleRating,
  type SurveyCResponse,
  type TryOnItem,
} from '../types/survey';

type SurveyStep =
  | 'waiting'
  | 'items'
  | 'ratings'
  | 'intent'
  | 'result'
  | 'visit-complete';

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
  if (step === 'waiting') return 'Waiting for items — Survey';
  if (step === 'items') return 'Your items — Survey';
  if (step === 'ratings') return 'Rate attributes — Survey';
  if (step === 'intent') return 'Your decision — Survey';
  if (step === 'visit-complete') return 'Visit complete — Survey';
  if (showingRecommender) return 'Recommendation — Survey';
  return 'Survey complete — Survey';
}

function stepAnnouncement(step: SurveyStep, showingRecommender: boolean): string {
  if (step === 'waiting') return 'Waiting for your items';
  if (step === 'items') return 'Select an item from your cart';
  if (step === 'ratings') return 'Step 1 of 3: Rate each attribute for this product';
  if (step === 'intent') return 'Step 2 of 3: Your purchase decision';
  if (step === 'visit-complete') return 'Visit complete. Thank you.';
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
  const {
    cart,
    status: cartStatus,
    error: cartError,
    reload: reloadCart,
    markItemStatus,
    finish,
    touchActivity,
  } = useFittingRoomCart(fittingRoom);

  const [step, setStep] = useState<SurveyStep>('waiting');
  const [selectedItem, setSelectedItem] = useState<TryOnItem | null>(null);
  const [selectedCartItemId, setSelectedCartItemId] = useState<string | null>(
    null,
  );
  const [ratings, setRatings] = useState<PartialScaleRatings>({});
  const [response, setResponse] = useState<SurveyCResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [saveOutcome, setSaveOutcome] = useState<PersistOutcome | null>(null);
  const [online, setOnline] = useState(isOnline);
  const [statusMessage, setStatusMessage] = useState('');
  const [recommender, setRecommender] = useState<RecommenderState | null>(null);
  const [sizeOptions, setSizeOptions] = useState<SizeOptionsState>({
    status: 'loading',
  });
  const stepHeadingRef = useRef<HTMLElement | null>(null);
  const prevRatingsComplete = useRef(false);
  /** Suppress cart→waiting sync while finishing the visit. */
  const finishingVisitRef = useRef(false);
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
  const cartActive = cartStatus === 'ready' && cart !== null;
  const pendingItems =
    cart?.items.filter((item) => item.status === 'pending') ?? [];

  const clearItemFlow = () => {
    recommenderRequest.current?.abort();
    recommenderRequest.current = null;
    sizeOptionsRequest.current?.abort();
    sizeOptionsRequest.current = null;
    setSelectedItem(null);
    setSelectedCartItemId(null);
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setRecommender(null);
    setSizeOptions({ status: 'loading' });
    setSaving(false);
  };

  // Sync survey step with cart presence.
  useEffect(() => {
    if (step === 'visit-complete' || finishingVisitRef.current) return;

    if (cartStatus === 'ready' && cart && cart.items.length > 0) {
      if (step === 'waiting') {
        setStep('items');
      }
      return;
    }

    // Cart cleared or not yet assigned — return to waiting.
    if (
      cartStatus === 'empty' ||
      cartStatus === 'loading' ||
      cartStatus === 'error' ||
      cartStatus === 'unavailable'
    ) {
      if (step !== 'waiting') {
        clearItemFlow();
        setStep('waiting');
      }
    }
    // clearItemFlow is stable enough for this sync; omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartStatus, cart, step]);

  useEffect(() => {
    document.title = stepTitle(step, showingRecommender);
  }, [step, showingRecommender]);

  useEffect(() => {
    setStatusMessage(stepAnnouncement(step, showingRecommender));
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

  useEffect(
    () => () => {
      recommenderRequest.current?.abort();
      sizeOptionsRequest.current?.abort();
    },
    [],
  );

  const handleItemSelect = (item: CartItem) => {
    touchActivity();
    setSelectedCartItemId(item.id);
    setSelectedItem(cartItemToTryOnItem(item));
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setRecommender(null);
    setStep('ratings');
  };

  const handleSkip = (item: CartItem) => {
    touchActivity();
    void markItemStatus(item.id, 'skipped');
  };

  const handleRating = (key: AttributeKey, value: ScaleRating) => {
    touchActivity();
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  const returnToItems = async (markRated: boolean) => {
    recommenderRequest.current?.abort();
    recommenderRequest.current = null;
    sizeOptionsRequest.current?.abort();
    sizeOptionsRequest.current = null;

    if (markRated && selectedCartItemId) {
      await markItemStatus(selectedCartItemId, 'rated');
    }

    setSelectedItem(null);
    setSelectedCartItemId(null);
    setRatings({});
    setResponse(null);
    setSaveOutcome(null);
    setRecommender(null);
    setSizeOptions({ status: 'loading' });
    setSaving(false);
    setStep(cartActive ? 'items' : 'waiting');
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

    touchActivity();
    setSaving(true);
    setSaveOutcome(null);
    setResponse(record);
    const outcome = await persistSurveyCResponse(record);
    setSaveOutcome(outcome);
    setSaving(false);

    if (decision === 'NO') {
      setRecommender({ status: 'loading' });
      setSizeOptions({ status: 'loading' });
      setStep('result');
      void loadRecommendations(record);
      void loadSizeOptions(record);
      return;
    }

    // YES — mark rated and return to cart item list.
    setStatusMessage('Saved. Back to your items.');
    await returnToItems(true);
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
      variationId: record.selected_item,
      signal: controller.signal,
    });

    if (controller.signal.aborted) return;
    setSizeOptions(sizeOptionsFromOutcome(outcome));
  };

  const handleReturnFromRecommender = () => {
    void returnToItems(true);
  };

  const handleFinishVisit = async () => {
    if (finishing) return;
    touchActivity();
    finishingVisitRef.current = true;
    setFinishing(true);
    const ok = await finish();
    setFinishing(false);
    if (!ok) {
      finishingVisitRef.current = false;
      setStatusMessage('Could not finish visit. Try again.');
      return;
    }
    clearItemFlow();
    resetSession();
    setStep('visit-complete');
  };

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
        onStartOver={handleReturnFromRecommender}
        onActivity={touchActivity}
        startOverLabel={
          pendingItems.length > 1 ||
          (pendingItems.length === 1 &&
            pendingItems[0]?.id !== selectedCartItemId)
            ? 'Back to your items'
            : 'Done with this item'
        }
        stepHeadingRef={stepHeadingRef}
        statusMessage={statusMessage}
        progressNow={progressNow}
      />
    );
  }

  if (step === 'visit-complete') {
    return (
      <Shell background={pageBackground} statusMessage={statusMessage}>
        <main id="main-content" className="survey-main" tabIndex={-1}>
          <h1
            ref={(el) => {
              stepHeadingRef.current = el;
            }}
            className="item-selection-heading"
            tabIndex={-1}
          >
            Thanks for visiting
          </h1>
          <p className="item-selection-subheading" style={{ marginBottom: 24 }}>
            Fitting room {fittingRoom} is clear. An attendant can assign new
            items anytime.
          </p>
          <Link to="/" className="choice-btn" style={{ display: 'block', textAlign: 'center', fontSize: 18, textDecoration: 'none' }}>
            Back to start
          </Link>
        </main>
      </Shell>
    );
  }

  if (step === 'waiting') {
    return (
      <Shell background={pageBackground} statusMessage={statusMessage}>
        <main id="main-content" className="survey-main survey-main--fill" tabIndex={-1}>
          <CartWaiting
            fittingRoom={fittingRoom}
            status={
              cartStatus === 'ready' || cartStatus === 'empty'
                ? 'empty'
                : cartStatus
            }
            error={cartError}
            onRetry={reloadCart}
            headingRef={(el) => {
              stepHeadingRef.current = el;
            }}
          />
          <Link to="/" className="survey-back-link">
            ← Back to start
          </Link>
        </main>
      </Shell>
    );
  }

  if (step === 'items' && cart) {
    return (
      <Shell background={pageBackground} statusMessage={statusMessage}>
        <main id="main-content" className="survey-main survey-main--fill" tabIndex={-1}>
          <CartItemSelection
            variant={itemSelectionVariant}
            items={cart.items}
            onSelect={handleItemSelect}
            onSkip={handleSkip}
            onDone={() => void handleFinishVisit()}
            finishing={finishing}
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
            {!saving && saveOutcome && (
              <SaveStatus
                outcome={saveOutcome}
                saving={false}
                onRetry={
                  saveOutcome.status === 'error' ? handleRetrySave : undefined
                }
                retryDisabled={!online}
              />
            )}
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
                onClick={() => void handleIntent('YES')}
              >
                {saving ? 'Saving…' : INTENT_LABEL_PURCHASE}
              </button>
              <button
                type="button"
                className="choice-btn"
                style={{ width: '100%', fontSize: 18 }}
                disabled={saving}
                onClick={() => void handleIntent('NO')}
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

        <button
          type="button"
          className="text-btn"
          onClick={() => void returnToItems(false)}
        >
          Back to your items
        </button>

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
