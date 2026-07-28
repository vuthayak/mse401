import { getSupabase, isSupabaseConfigured } from './supabase';
import type { AttributeKey, IntentDecision } from '../types/survey';
import { errorMessage, withRetry } from './withRetry';

/**
 * One aggregated fact from get_survey_c_insights_rows().
 * Grain: (UTC day, selected_item, intent). Not an individual survey response.
 */
export interface SurveyCInsightRow {
  created_at: string;
  selected_item: string;
  intent: IntentDecision;
  response_count: number;
  sum_fabric: number;
  sum_fit: number;
  sum_colour: number;
  sum_price: number;
  unhappy_fabric: number;
  unhappy_fit: number;
  unhappy_colour: number;
  unhappy_price: number;
  happy_fabric: number;
  happy_fit: number;
  happy_colour: number;
  happy_price: number;
}

export type FetchSurveyCInsightsOutcome =
  | { status: 'ok'; rows: SurveyCInsightRow[] }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'error'; message: string };

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeRow(raw: Record<string, unknown>): SurveyCInsightRow {
  return {
    created_at: String(raw.created_at),
    selected_item: String(raw.selected_item),
    intent: raw.intent === 'YES' ? 'YES' : 'NO',
    response_count: toNumber(raw.response_count),
    sum_fabric: toNumber(raw.sum_fabric),
    sum_fit: toNumber(raw.sum_fit),
    sum_colour: toNumber(raw.sum_colour),
    sum_price: toNumber(raw.sum_price),
    unhappy_fabric: toNumber(raw.unhappy_fabric),
    unhappy_fit: toNumber(raw.unhappy_fit),
    unhappy_colour: toNumber(raw.unhappy_colour),
    unhappy_price: toNumber(raw.unhappy_price),
    happy_fabric: toNumber(raw.happy_fabric),
    happy_fit: toNumber(raw.happy_fit),
    happy_colour: toNumber(raw.happy_colour),
    happy_price: toNumber(raw.happy_price),
  };
}

export async function fetchSurveyCInsights(
  signal?: AbortSignal,
): Promise<FetchSurveyCInsightsOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'skipped', reason: 'not_configured' };
  }

  try {
    const data = await withRetry(
      async (attemptSignal) => {
        const { data: rows, error } = await supabase
          .rpc('get_survey_c_insights_rows')
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const rows = ((data ?? []) as Record<string, unknown>[]).map(normalizeRow);
    return { status: 'ok', rows };
  } catch (error) {
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load insights'),
    };
  }
}

export const INSIGHT_ATTRIBUTES: AttributeKey[] = [
  'fabric',
  'fit',
  'colour',
  'price',
];

/** Total underlying survey responses represented by aggregate facts. */
export function totalResponses(rows: SurveyCInsightRow[]): number {
  return rows.reduce((sum, row) => sum + row.response_count, 0);
}

export function sumForAttribute(
  rows: SurveyCInsightRow[],
  key: AttributeKey,
): number {
  return rows.reduce((sum, row) => sum + row[`sum_${key}`], 0);
}

export function unhappyForAttribute(
  rows: SurveyCInsightRow[],
  key: AttributeKey,
): number {
  return rows.reduce((sum, row) => sum + row[`unhappy_${key}`], 0);
}

export function happyForAttribute(
  rows: SurveyCInsightRow[],
  key: AttributeKey,
): number {
  return rows.reduce((sum, row) => sum + row[`happy_${key}`], 0);
}
