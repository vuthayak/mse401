import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, withRetry } from './withRetry';

export interface SizeOption {
  variationId: string;
  size: string;
  sizeOrder: number;
  unitPrice: number;
  imagePath: string;
  title: string;
  brand: string;
  colorLabel: string;
  isTriedOn: boolean;
  quantity: number;
}

export type SizeOptionsOutcome =
  | { status: 'ok'; options: SizeOption[] }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiSizeOption {
  variation_id: string;
  size: string;
  size_order: number;
  unit_price: number;
  image_path: string;
  title: string;
  brand: string;
  color_label: string;
  is_tried_on: boolean;
  quantity: number;
}

function toSizeOption(raw: ApiSizeOption): SizeOption {
  return {
    variationId: raw.variation_id,
    size: raw.size,
    sizeOrder: raw.size_order,
    unitPrice: Number(raw.unit_price),
    imagePath: raw.image_path,
    title: raw.title,
    brand: raw.brand,
    colorLabel: raw.color_label,
    isTriedOn: Boolean(raw.is_tried_on),
    quantity: Number(raw.quantity ?? 0),
  };
}

export interface FetchSizeOptionsParams {
  surveyItemId: string;
  storeId?: string;
  signal?: AbortSignal;
}

/**
 * Loads other sizes of the tried-on colourway for the size-request panel.
 * Hits Supabase directly (anon-callable RPC), so it stays fast even when the
 * Render recommender host is cold.
 */
export async function fetchSizeOptions({
  surveyItemId,
  storeId = 'kw-flagship',
  signal,
}: FetchSizeOptionsParams): Promise<SizeOptionsOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  if (signal?.aborted) {
    return { status: 'error', message: 'Request cancelled.' };
  }

  try {
    const data = await withRetry(
      async (attemptSignal) => {
        const { data: rows, error } = await supabase
          .rpc('get_size_options', {
            p_survey_item_id: surveyItemId,
            p_store_id: storeId,
          })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const rows = (data ?? []) as ApiSizeOption[];
    return { status: 'ok', options: rows.map(toSizeOption) };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('get_size_options_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load size options'),
    };
  }
}
