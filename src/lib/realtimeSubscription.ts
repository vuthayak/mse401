import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from './supabase';
import { isOnline } from './withRetry';

export type ConnectionMode = 'live' | 'polling' | 'offline' | 'connecting';

const REALTIME_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 4000;

export interface SubscribeToTablesOptions {
  /** Unique Realtime channel name. */
  channel: string;
  /** Public-schema tables to watch for `*` postgres_changes. */
  tables: string[];
  onChange: () => void;
  onConnectionChange: (mode: ConnectionMode) => void;
}

export interface SubscribeHandle {
  unsubscribe: () => void;
}

/**
 * Subscribes to one or more tables via Supabase Realtime, with a 4s polling
 * fallback if the channel never reaches SUBSCRIBED (or later errors out).
 * Also refetches when the tab becomes visible again.
 */
export function subscribeToTables({
  channel: channelName,
  tables,
  onChange,
  onConnectionChange,
}: SubscribeToTablesOptions): SubscribeHandle {
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
    let builder = supabase.channel(channelName);
    for (const table of tables) {
      builder = builder.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          onChange();
        },
      );
    }
    channel = builder.subscribe((status) => {
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
