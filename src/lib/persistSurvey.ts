import type {
  SurveyAResponse,
  SurveyBResponse,
  SurveyCResponse,
} from '../types/survey';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, isOnline, OfflineError, withRetry } from './withRetry';

export type PersistOutcome =
  | { status: 'saved'; recordId: string }
  | { status: 'skipped'; reason: 'not_configured' }
  | { status: 'error'; message: string };

type SurveyTable =
  | 'survey_a_responses'
  | 'survey_b_responses'
  | 'survey_c_responses';

function logDev(label: string, record: unknown): void {
  if (import.meta.env.DEV) {
    console.log(label, record);
  }
}

async function persistSurveyRow(
  table: SurveyTable,
  record: SurveyAResponse | SurveyBResponse | SurveyCResponse,
  logLabel: string,
): Promise<PersistOutcome> {
  logDev(logLabel, record);

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
      // Tables differ by rating types (scale vs boolean); cast keeps one helper.
      const { error } = await supabase
        .from(table)
        .insert(record as never)
        .abortSignal(signal);

      if (error) {
        // 23505 = unique_violation — same client-generated id already saved.
        if (error.code === '23505') {
          return;
        }
        throw error;
      }
    });

    return { status: 'saved', recordId: record.id };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('supabase_insert_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not save response'),
    };
  }
}

export async function persistSurveyAResponse(
  record: SurveyAResponse,
): Promise<PersistOutcome> {
  return persistSurveyRow('survey_a_responses', record, 'survey_a_response');
}

export async function persistSurveyBResponse(
  record: SurveyBResponse,
): Promise<PersistOutcome> {
  return persistSurveyRow('survey_b_responses', record, 'survey_b_response');
}

export async function persistSurveyCResponse(
  record: SurveyCResponse,
): Promise<PersistOutcome> {
  return persistSurveyRow('survey_c_responses', record, 'survey_c_response');
}
