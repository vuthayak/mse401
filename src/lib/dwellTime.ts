import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, withRetry } from './withRetry';

/** Alert Technologies industry benchmark: 5 minutes 45 seconds. */
export const DWELL_BENCHMARK_MS = 345_000;

/** ±30s window around the benchmark counts as "on benchmark". */
export const DWELL_TOLERANCE_MS = 30_000;

export type DwellFlag = 'quick' | 'benchmark' | 'long';

export interface DwellStatRow {
  scope: 'room' | 'item';
  scopeKey: string;
  sessionCount: number;
  totalSeconds: number;
}

export interface DwellAverage {
  averageMs: number;
  sessionCount: number;
  flag: DwellFlag;
}

export type DwellStatsIndex = {
  byRoom: Map<number, DwellAverage>;
  byItem: Map<string, DwellAverage>;
};

export type DwellStatsOutcome =
  | { status: 'ok'; index: DwellStatsIndex }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiDwellRow {
  scope: string;
  scope_key: string;
  session_count: number | string;
  total_seconds: number | string;
}

export function averageDwellMs(
  totalSeconds: number,
  sessionCount: number,
): number | null {
  if (
    !Number.isFinite(totalSeconds) ||
    !Number.isFinite(sessionCount) ||
    sessionCount <= 0
  ) {
    return null;
  }
  return (totalSeconds / sessionCount) * 1000;
}

export function formatDwell(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.round(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function dwellFlag(ms: number | null | undefined): DwellFlag | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < DWELL_BENCHMARK_MS - DWELL_TOLERANCE_MS) return 'quick';
  if (ms > DWELL_BENCHMARK_MS + DWELL_TOLERANCE_MS) return 'long';
  return 'benchmark';
}

export function toDwellAverage(
  totalSeconds: number,
  sessionCount: number,
): DwellAverage | null {
  const averageMs = averageDwellMs(totalSeconds, sessionCount);
  if (averageMs == null) return null;
  const flag = dwellFlag(averageMs);
  if (flag == null) return null;
  return { averageMs, sessionCount, flag };
}

export function indexDwellStats(rows: DwellStatRow[]): DwellStatsIndex {
  const byRoom = new Map<number, DwellAverage>();
  const byItem = new Map<string, DwellAverage>();

  for (const row of rows) {
    const avg = toDwellAverage(row.totalSeconds, row.sessionCount);
    if (!avg) continue;
    if (row.scope === 'room') {
      const room = Number(row.scopeKey);
      if (Number.isFinite(room)) byRoom.set(room, avg);
    } else if (row.scope === 'item') {
      byItem.set(row.scopeKey, avg);
    }
  }

  return { byRoom, byItem };
}

function normalizeRow(raw: ApiDwellRow): DwellStatRow | null {
  const scope = raw.scope === 'item' ? 'item' : raw.scope === 'room' ? 'room' : null;
  if (!scope) return null;
  return {
    scope,
    scopeKey: String(raw.scope_key),
    sessionCount: Number(raw.session_count) || 0,
    totalSeconds: Number(raw.total_seconds) || 0,
  };
}

export async function fetchDwellStats(
  storeId = 'kw-flagship',
  signal?: AbortSignal,
): Promise<DwellStatsOutcome> {
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
          .rpc('get_dwell_time_stats', { p_store_id: storeId })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const normalized = ((data ?? []) as ApiDwellRow[])
      .map(normalizeRow)
      .filter((row): row is DwellStatRow => row != null);

    return { status: 'ok', index: indexDwellStats(normalized) };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('get_dwell_time_stats_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load dwell times'),
    };
  }
}

export function emptyDwellIndex(): DwellStatsIndex {
  return { byRoom: new Map(), byItem: new Map() };
}
