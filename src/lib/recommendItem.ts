import type { AttributeKey, ScaleRating } from '../types/survey';

/**
 * Client for the two-stage recommender API (see backend/README.md).
 *
 * GitHub Pages is static, so the service runs on its own host and the base URL
 * arrives at build time via VITE_RECOMMENDER_API_URL. When it is absent the
 * survey still works end to end — the result screen just reports that
 * recommendations are unavailable instead of inventing one.
 */

/** Free-tier hosting sleeps when idle, so the first request can be slow. */
const REQUEST_TIMEOUT_MS = 25_000;

export interface RecommendedItem {
  itemId: string;
  styleId: string;
  title: string;
  brand: string;
  size: string;
  colorLabel: string;
  materialLabel: string;
  apparelType: string;
  price: number;
  /** Relative to the Vite base URL, e.g. "items/black-zip-hoodie.png". */
  imagePath: string;
  reasons: string[];
  matchedRules: string[];
  inStock: number;
}

export interface CurrentItem {
  itemId: string;
  title: string;
  brand: string;
  size: string;
  price: number;
  imagePath: string;
}

export interface RecommendationResult {
  currentItem: CurrentItem;
  items: RecommendedItem[];
  strategy: 'llm' | 'vector' | 'heuristic';
  latencyMs: number;
}

export type RecommendationOutcome =
  | { status: 'ok'; result: RecommendationResult }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiItem {
  item_id: string;
  style_id: string;
  title: string;
  brand: string;
  size: string;
  color_label: string;
  material_label: string;
  apparel_type: string;
  price: number;
  image_path: string;
  reasons?: string[];
  matched_rules?: string[];
  in_stock?: number;
}

interface ApiResponse {
  current_item: ApiItem;
  recommendations: ApiItem[];
  strategy: RecommendationResult['strategy'];
  latency_ms: number;
}

/** Resolve a catalog image path against the deployed base URL. */
export function catalogImageUrl(imagePath: string): string {
  return `${import.meta.env.BASE_URL}${imagePath}`;
}

function toItem(raw: ApiItem): RecommendedItem {
  return {
    itemId: raw.item_id,
    styleId: raw.style_id,
    title: raw.title,
    brand: raw.brand,
    size: raw.size,
    colorLabel: raw.color_label,
    materialLabel: raw.material_label,
    apparelType: raw.apparel_type,
    price: raw.price,
    imagePath: raw.image_path,
    reasons: raw.reasons ?? [],
    matchedRules: raw.matched_rules ?? [],
    inStock: raw.in_stock ?? 0,
  };
}

export interface RecommendParams {
  sessionToken: string;
  selectedItemId: string;
  ratings: Record<AttributeKey, ScaleRating>;
  limit?: number;
  signal?: AbortSignal;
}

export async function fetchRecommendations({
  sessionToken,
  selectedItemId,
  ratings,
  limit = 3,
  signal,
}: RecommendParams): Promise<RecommendationOutcome> {
  const baseUrl = import.meta.env.VITE_RECOMMENDER_API_URL;
  if (!baseUrl) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  // Abort on either the caller unmounting or the timeout elapsing.
  const onCallerAbort = () => timeout.abort();
  signal?.addEventListener('abort', onCallerAbort);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_token: sessionToken,
        selected_item_id: selectedItemId,
        fabric: ratings.fabric,
        fit: ratings.fit,
        colour: ratings.colour,
        price: ratings.price,
        limit,
      }),
      signal: timeout.signal,
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('recommender_error', response.status, detail);
      return {
        status: 'error',
        message:
          response.status === 404
            ? 'No in-stock alternatives were found for this item.'
            : 'The recommendation service is unavailable right now.',
      };
    }

    const payload: ApiResponse = await response.json();
    return {
      status: 'ok',
      result: {
        currentItem: {
          itemId: payload.current_item.item_id,
          title: payload.current_item.title,
          brand: payload.current_item.brand,
          size: payload.current_item.size,
          price: payload.current_item.price,
          imagePath: payload.current_item.image_path,
        },
        items: payload.recommendations.map(toItem),
        strategy: payload.strategy,
        latencyMs: payload.latency_ms,
      },
    };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    const timedOut = error instanceof DOMException && error.name === 'AbortError';
    console.error('recommender_request_failed', error);
    return {
      status: 'error',
      message: timedOut
        ? 'The recommendation service took too long to respond.'
        : 'Could not reach the recommendation service.',
    };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onCallerAbort);
  }
}
