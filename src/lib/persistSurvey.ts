import type { SurveyAResponse, SurveyBResponse } from '../types/survey';
import { getSupabase, isSupabaseConfigured } from './supabase';

export type PersistOutcome =
  | { status: 'saved'; recordId: string }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'error'; message: string };

export async function persistSurveyAResponse(
  record: SurveyAResponse,
): Promise<PersistOutcome> {
  console.log('survey_a_response', record);

  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const { error } = await supabase.from('survey_a_responses').insert(record);

  if (error) {
    console.error('supabase_insert_error', error);
    return { status: 'error', message: error.message };
  }

  return { status: 'saved', recordId: record.session_token };
}

export async function persistSurveyBResponse(
  record: SurveyBResponse,
): Promise<PersistOutcome> {
  console.log('survey_b_response', record);

  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const { error } = await supabase.from('survey_b_responses').insert(record);

  if (error) {
    console.error('supabase_insert_error', error);
    return { status: 'error', message: error.message };
  }

  return { status: 'saved', recordId: record.session_token };
}
