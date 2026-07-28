import type { PersistOutcome } from './persistSurvey';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, isOnline, OfflineError, withRetry } from './withRetry';

export type ItemRequestKind = 'size_swap' | 'recommendation';

export interface ItemRequestRecord {
  sessionToken: string;
  sourceSurveyItemId: string;
  variationId: string;
  size: string;
  requestKind: ItemRequestKind;
  storeId?: string;
}

/**
 * Persists a fitting-room item request. Unique (session_token, variation_id)
 * violations are treated as success so double-taps stay idempotent.
 */
export async function persistItemRequest(
  record: ItemRequestRecord,
): Promise<PersistOutcome> {
  if (import.meta.env.DEV) {
    console.log('item_request', record);
  }

  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  if (!isOnline()) {
    return { status: 'error', message: new OfflineError().message };
  }

  try {
    await withRetry(async (signal) => {
      const { error } = await supabase
        .from('item_requests')
        .insert({
          session_token: record.sessionToken,
          source_survey_item_id: record.sourceSurveyItemId,
          variation_id: record.variationId,
          size: record.size,
          request_kind: record.requestKind,
          store_id: record.storeId ?? 'kw-flagship',
        })
        .abortSignal(signal);

      if (error) {
        // 23505 = unique_violation — already requested this variation this session.
        if (error.code === '23505') {
          return;
        }
        throw error;
      }
    });

    return { status: 'saved', recordId: record.sessionToken };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('item_request_insert_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not save item request'),
    };
  }
}
