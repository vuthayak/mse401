import { useCallback, useEffect, useState, type Ref } from 'react';
import { Link } from 'react-router-dom';
import { ProductHeader } from './ProductHeader';
import {
  RequestItemButton,
  type RequestButtonStatus,
} from './RequestItemButton';
import { SaveStatus } from './SaveStatus';
import { SizeRequestPanel } from './SizeRequestPanel';
import type { PersistOutcome } from '../lib/persistSurvey';
import {
  catalogImageUrl,
  type RecommendationResult,
  type RecommendedItem,
} from '../lib/recommendItem';
import { persistItemRequest, type ItemRequestKind } from '../lib/itemRequests';
import { DEFAULT_FITTING_ROOM } from '../lib/fittingRoom';
import type { SizeOption, SizeOptionsOutcome } from '../lib/fetchSizeOptions';
import type { SurveyItem } from '../types/survey';

export type RecommenderState =
  | { status: 'loading' }
  | { status: 'ready'; result: RecommendationResult }
  | { status: 'empty'; message: string };

export type SizeOptionsState =
  | { status: 'loading' }
  | { status: 'ready'; options: SizeOption[] }
  | { status: 'empty' }
  | { status: 'unavailable' }
  | { status: 'error'; message: string };

interface CompletedRequest {
  title: string;
  size: string;
  requestKind: ItemRequestKind;
  imagePath: string;
  tagline: string;
}

interface RecommenderScreenProps {
  variant: 'clinical' | 'warm';
  originalItem: SurveyItem;
  state: RecommenderState;
  sizeOptions: SizeOptionsState;
  sessionToken: string;
  /** Fitting room this kiosk is assigned to (1–5). */
  fittingRoom?: number;
  saveOutcome: PersistOutcome | null;
  saving?: boolean;
  onRetrySave?: () => void;
  retryDisabled?: boolean;
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

function useItemRequests(
  sessionToken: string,
  sourceSurveyItemId: string,
  fittingRoom: number,
) {
  const [statuses, setStatuses] = useState<Record<string, RequestButtonStatus>>({});
  const [announce, setAnnounce] = useState('');
  const [completedRequest, setCompletedRequest] = useState<CompletedRequest | null>(
    null,
  );

  const requestItem = useCallback(
    async (params: {
      variationId: string;
      size: string;
      requestKind: ItemRequestKind;
      title: string;
      imagePath: string;
      tagline: string;
    }) => {
      const { variationId, size, requestKind, title, imagePath, tagline } = params;
      setStatuses((prev) => ({ ...prev, [variationId]: 'saving' }));
      const outcome = await persistItemRequest({
        sessionToken,
        sourceSurveyItemId,
        variationId,
        size,
        requestKind,
        fittingRoom,
      });

      if (outcome.status === 'saved' || outcome.status === 'skipped') {
        setStatuses((prev) => ({ ...prev, [variationId]: 'done' }));
        setCompletedRequest({ title, size, requestKind, imagePath, tagline });
        setAnnounce(
          outcome.status === 'skipped'
            ? `Request recorded locally for ${title} in size ${size}.`
            : `Request confirmed: ${title} in size ${size}.`,
        );
        return;
      }

      setStatuses((prev) => ({ ...prev, [variationId]: 'error' }));
      setAnnounce(`Could not request ${title}. Try again.`);
    },
    [sessionToken, sourceSurveyItemId, fittingRoom],
  );

  return { statuses, announce, completedRequest, requestItem };
}

export function sizeOptionsFromOutcome(
  outcome: SizeOptionsOutcome,
): SizeOptionsState {
  if (outcome.status === 'ok') {
    return outcome.options.length > 0
      ? { status: 'ready', options: outcome.options }
      : { status: 'empty' };
  }
  if (outcome.status === 'unavailable') {
    return { status: 'unavailable' };
  }
  return { status: 'error', message: outcome.message };
}

export function RecommenderScreen({
  variant,
  originalItem,
  state,
  sizeOptions,
  sessionToken,
  fittingRoom = DEFAULT_FITTING_ROOM,
  saveOutcome,
  saving = false,
  onRetrySave,
  retryDisabled,
  onStartOver,
  stepHeadingRef,
  statusMessage = '',
  progressNow = 3,
}: RecommenderScreenProps) {
  const isClinical = variant === 'clinical';
  const borderColor = isClinical ? '#767676' : '#8a7f6e';
  const { statuses, announce, completedRequest, requestItem } = useItemRequests(
    sessionToken,
    originalItem.id,
    fittingRoom,
  );
  const isConfirmed = completedRequest !== null;

  useEffect(() => {
    document.title = isConfirmed ? 'Request confirmed — Survey' : 'Recommendation — Survey';
  }, [isConfirmed]);

  useEffect(() => {
    if (!isConfirmed) return;
    requestAnimationFrame(() => {
      const heading =
        typeof stepHeadingRef === 'function'
          ? null
          : stepHeadingRef?.current;
      heading?.focus();
    });
  }, [isConfirmed, stepHeadingRef]);

  const subtitle = isConfirmed
    ? `Staff will bring it to fitting room ${fittingRoom}. You are all set — no need to rate again.`
    : state.status === 'loading'
      ? `Checking what else is in stock after your notes on ${originalItem.title}…`
      : state.status === 'ready'
        ? `Based on your feedback about ${originalItem.title}, here is what the fitting room has in stock. Request a size or an alternative to this room.`
        : `We could not pull alternatives for ${originalItem.title} right now. You can still request a different size below if one is available.`;

  const liveMessage = isConfirmed
    ? announce || 'Request confirmed'
    : `${statusMessage}${announce ? ` ${announce}` : ''}`;

  return (
    <div className="app-shell" style={{ background: isClinical ? '#eef2f6' : '#f5efe6' }}>
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {liveMessage}
      </div>
      <main id="main-content" className="survey-main survey-main--fill survey-main--wide" tabIndex={-1}>
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
            {isConfirmed
              ? 'Requested'
              : state.status === 'ready' && state.result.items.length > 1
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
            {isConfirmed
              ? 'Requested to your room'
              : state.status === 'loading'
                ? 'Finding your alternatives'
                : state.status === 'ready'
                  ? 'We found something you might like'
                  : 'No alternatives available'}
          </h1>
          <p className="recommender-subtitle">{subtitle}</p>
        </div>

        <SaveStatus
          outcome={saveOutcome}
          saving={saving}
          onRetry={
            saveOutcome?.status === 'error' ? onRetrySave : undefined
          }
          retryDisabled={retryDisabled}
        />

        {isConfirmed && completedRequest ? (
          <RequestConfirmation
            request={completedRequest}
            fittingRoom={fittingRoom}
            isClinical={isClinical}
            borderColor={borderColor}
          />
        ) : (
          <>
            {sizeOptions.status === 'ready' && (
              <SizeRequestPanel
                options={sizeOptions.options}
                statuses={statuses}
                onRequest={(option) =>
                  void requestItem({
                    variationId: option.variationId,
                    size: option.size,
                    requestKind: 'size_swap',
                    title: option.title,
                    imagePath: option.imagePath,
                    tagline: `${option.brand} · ${option.colorLabel}`,
                  })
                }
                isClinical={isClinical}
                borderColor={borderColor}
              />
            )}

            {sizeOptions.status === 'error' && (
              <p className="recommender-note">
                Size options are unavailable right now ({sizeOptions.message}).
              </p>
            )}

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
                      requestStatus={statuses[item.itemId] ?? 'idle'}
                      onRequest={() =>
                        void requestItem({
                          variationId: item.itemId,
                          size: item.size,
                          requestKind: 'recommendation',
                          title: item.title,
                          imagePath: item.imagePath,
                          tagline: `${item.brand} · ${item.colorLabel} · ${item.materialLabel}`,
                        })
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
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

function RequestConfirmation({
  request,
  fittingRoom,
  isClinical,
  borderColor,
}: {
  request: CompletedRequest;
  fittingRoom: number;
  isClinical: boolean;
  borderColor: string;
}) {
  const productItem: SurveyItem = {
    id: 'requested',
    title: request.title,
    tagline: request.tagline,
    imageUrl: catalogImageUrl(request.imagePath),
  };

  const kindLabel =
    request.requestKind === 'size_swap'
      ? 'Different size of the item you tried on'
      : 'Recommended alternative';

  return (
    <section
      className="request-confirmation survey-card"
      style={{
        background: isClinical ? '#fff' : '#faf6f0',
        border: `1px solid ${borderColor}`,
      }}
      aria-labelledby="request-confirmation-detail"
    >
      <p className="request-confirmation-kind">{kindLabel}</p>
      <ProductHeader
        item={productItem}
        variant={isClinical ? 'clinical' : 'warm'}
        headingLevel={2}
      />
      <p id="request-confirmation-detail" className="request-confirmation-detail">
        {request.title} · Size {request.size}
      </p>
      <p className="request-confirmation-note">
        A staff member will bring this to fitting room {fittingRoom} shortly.
      </p>
    </section>
  );
}

function RecommendationCard({
  item,
  rank,
  showRank,
  isClinical,
  borderColor,
  requestStatus,
  onRequest,
}: {
  item: RecommendedItem;
  rank: number;
  showRank: boolean;
  isClinical: boolean;
  borderColor: string;
  requestStatus: RequestButtonStatus;
  onRequest: () => void;
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
      <RequestItemButton
        status={requestStatus}
        onClick={onRequest}
        label={`Request the ${item.title} in size ${item.size}`}
      />
    </div>
  );
}

function RecommenderSkeleton({ borderColor }: { borderColor: string }) {
  return (
    <div className="recommender-skeleton-grid" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="recommender-card survey-card recommender-skeleton"
          style={{ border: `1px dashed ${borderColor}` }}
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
      ))}
    </div>
  );
}
