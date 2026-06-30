import type { SurveyPayload } from '../types/survey';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type SurveyVariant = 'A' | 'B';

export type PersistOutcome =
  | { status: 'saved'; recordId: string }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'error'; message: string };

export async function persistSurveyResponse(
  variant: SurveyVariant,
  payload: SurveyPayload,
): Promise<PersistOutcome> {
  console.log('survey_payload', payload);

  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const { data, error } = await supabase
    .from('survey_responses')
    .insert({
      survey_variant: variant,
      session_token: payload.session_metadata.session_token,
      fitting_room_id: payload.session_metadata.fitting_room_id,
      scanned_sku: payload.active_product_context.scanned_sku,
      user_decision: payload.step_2_universal_conversion_intent.user_decision,
      payload,
    })
    .select('id')
    .single();

  if (error) {
    console.error('supabase_insert_error', error);
    return { status: 'error', message: error.message };
  }

  return { status: 'saved', recordId: data.id };
}
