import type { PersistOutcome } from './persistSurvey';
import { getSupabase, isSupabaseConfigured } from './supabase';

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
  console.log('item_request', record);

  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const { error } = await supabase.from('item_requests').insert({
    session_token: record.sessionToken,
    source_survey_item_id: record.sourceSurveyItemId,
    variation_id: record.variationId,
    size: record.size,
    request_kind: record.requestKind,
    store_id: record.storeId ?? 'kw-flagship',
  });

  if (error) {
    // 23505 = unique_violation — already requested this variation this session.
    if (error.code === '23505') {
      return { status: 'saved', recordId: record.sessionToken };
    }
    console.error('item_request_insert_error', error);
    return { status: 'error', message: error.message };
  }

  return { status: 'saved', recordId: record.sessionToken };
}
