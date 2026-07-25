import { getSupabase, isSupabaseConfigured } from './supabase';
import type { AttributeKey, IntentDecision, ScaleRating } from '../types/survey';

/** Row returned by get_survey_c_insights_rows() — no session_token. */
export interface SurveyCInsightRow {
  id: string;
  created_at: string;
  selected_item: string;
  fabric: ScaleRating;
  fit: ScaleRating;
  colour: ScaleRating;
  price: ScaleRating;
  intent: IntentDecision;
}

export type FetchSurveyCInsightsOutcome =
  | { status: 'ok'; rows: SurveyCInsightRow[] }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'error'; message: string };

export async function fetchSurveyCInsights(): Promise<FetchSurveyCInsightsOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const { data, error } = await supabase.rpc('get_survey_c_insights_rows');

  if (error) {
    return { status: 'error', message: error.message };
  }

  return { status: 'ok', rows: (data ?? []) as SurveyCInsightRow[] };
}

export const INSIGHT_ATTRIBUTES: AttributeKey[] = [
  'fabric',
  'fit',
  'colour',
  'price',
];
