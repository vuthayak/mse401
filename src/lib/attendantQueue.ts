import type { RealtimeChannel } from '@supabase/supabase-js';
import type { PersistOutcome } from './persistSurvey';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, isOnline, OfflineError, withRetry } from './withRetry';

export type RequestStatus = 'pending' | 'fulfilled' | 'cancelled';
export type ItemRequestKind = 'size_swap' | 'recommendation';

export type ConnectionMode = 'live' | 'polling' | 'offline' | 'connecting';

export interface AttendantRequest {
  id: string;
  createdAt: string;
  fulfilledAt: string | null;
  fittingRoom: number;
  status: RequestStatus;
  size: string;
  requestKind: ItemRequestKind;
  variationId: string;
  title: string;
  brand: string;
  colorLabel: string;
  imagePath: string;
  unitPrice: number;
  sourceSurveyItemId: string;
  sourceTitle: string | null;
}

export type RoomRequestsOutcome =
  | { status: 'ok'; requests: AttendantRequest[] }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiRoomRequest {
  id: string;
  created_at: string;
  fulfilled_at: string | null;
  fitting_room: number;
  status: RequestStatus;
  size: string;
  request_kind: ItemRequestKind;
  variation_id: string;
  title: string;
  brand: string;
  color_label: string;
  image_path: string;
  unit_price: number;
  source_survey_item_id: string;
  source_title: string | null;
}

function toAttendantRequest(raw: ApiRoomRequest): AttendantRequest {
  return {
    id: raw.id,
    createdAt: raw.created_at,
    fulfilledAt: raw.fulfilled_at,
    fittingRoom: Number(raw.fitting_room),
    status: raw.status,
    size: raw.size,
    requestKind: raw.request_kind,
    variationId: raw.variation_id,
    title: raw.title,
    brand: raw.brand,
    colorLabel: raw.color_label,
    imagePath: raw.image_path,
    unitPrice: Number(raw.unit_price),
    sourceSurveyItemId: raw.source_survey_item_id,
    sourceTitle: raw.source_title,
  };
}

/**
 * Formats a wait duration for the attendant queue.
 * Examples: "just now", "3 min", "12 min", "1h 5m".
 */
export function formatWaiting(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return 'just now';
  }
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 45) {
    return 'just now';
  }
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) {
    return `${Math.max(1, totalMinutes)} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${minutes}m`;
}

export async function fetchRoomRequests(
  storeId = 'kw-flagship',
  signal?: AbortSignal,
): Promise<RoomRequestsOutcome> {
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
          .rpc('get_room_requests', { p_store_id: storeId })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const rows = (data ?? []) as ApiRoomRequest[];
    return { status: 'ok', requests: rows.map(toAttendantRequest) };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('get_room_requests_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load room requests'),
    };
  }
}

export async function setRequestStatus(
  requestId: string,
  status: RequestStatus,
): Promise<PersistOutcome> {
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
        .rpc('set_request_status', {
          p_request_id: requestId,
          p_status: status,
        })
        .abortSignal(signal);

      if (error) throw error;
    });

    return { status: 'saved', recordId: requestId };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('set_request_status_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not update request'),
    };
  }
}

const REALTIME_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 4000;

export interface SubscribeOptions {
  onChange: () => void;
  onConnectionChange: (mode: ConnectionMode) => void;
}

export interface SubscribeHandle {
  unsubscribe: () => void;
}

/**
 * Subscribes to item_requests changes via Supabase Realtime, with a 4s polling
 * fallback if the channel never reaches SUBSCRIBED (or later errors out).
 * Also refetches when the tab becomes visible again.
 */
export function subscribeToRequests({
  onChange,
  onConnectionChange,
}: SubscribeOptions): SubscribeHandle {
  const supabase = getSupabase();
  let channel: RealtimeChannel | null = null;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let realtimeTimer: ReturnType<typeof setTimeout> | null = null;
  let mode: ConnectionMode = 'connecting';
  let cleaned = false;

  const setMode = (next: ConnectionMode) => {
    if (cleaned || next === mode) return;
    mode = next;
    onConnectionChange(next);
  };

  const startPolling = () => {
    if (pollTimer || cleaned) return;
    setMode(isOnline() ? 'polling' : 'offline');
    pollTimer = setInterval(() => {
      if (!isOnline()) {
        setMode('offline');
        return;
      }
      if (mode === 'offline') {
        setMode('polling');
      }
      onChange();
    }, POLL_INTERVAL_MS);
  };

  const stopPolling = () => {
    if (!pollTimer) return;
    clearInterval(pollTimer);
    pollTimer = null;
  };

  const onVisibility = () => {
    if (document.visibilityState === 'visible') {
      onChange();
    }
  };

  const onOnline = () => {
    if (mode === 'offline') {
      setMode(pollTimer ? 'polling' : 'connecting');
    }
    onChange();
  };

  const onOffline = () => {
    setMode('offline');
  };

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  if (!supabase || !isOnline()) {
    startPolling();
    if (!isOnline()) setMode('offline');
  } else {
    setMode('connecting');
    channel = supabase
      .channel('attendant-item-requests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'item_requests' },
        () => {
          onChange();
        },
      )
      .subscribe((status) => {
        if (cleaned) return;
        if (status === 'SUBSCRIBED') {
          if (realtimeTimer) {
            clearTimeout(realtimeTimer);
            realtimeTimer = null;
          }
          stopPolling();
          setMode('live');
          return;
        }
        if (
          status === 'CHANNEL_ERROR' ||
          status === 'TIMED_OUT' ||
          status === 'CLOSED'
        ) {
          startPolling();
        }
      });

    realtimeTimer = setTimeout(() => {
      if (cleaned || mode === 'live') return;
      startPolling();
    }, REALTIME_TIMEOUT_MS);
  }

  return {
    unsubscribe: () => {
      cleaned = true;
      if (realtimeTimer) clearTimeout(realtimeTimer);
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      if (channel && supabase) {
        void supabase.removeChannel(channel);
      }
    },
  };
}
