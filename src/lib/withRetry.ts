/**
 * In-memory retry with exponential backoff and per-attempt timeouts.
 * Never persists participant data to device storage.
 */

export const DEFAULT_MAX_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT_MS = 12_000;
const BACKOFF_MS = [400, 800, 1600] as const;

export class OfflineError extends Error {
  constructor(message = 'No network — check the connection, then Retry') {
    super(message);
    this.name = 'OfflineError';
  }
}

export class TimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function jitter(baseMs: number): number {
  const spread = baseMs * 0.25;
  return Math.round(baseMs + (Math.random() * 2 - 1) * spread);
}

/**
 * True for failures that may succeed on retry: network errors, timeouts,
 * AbortError from our timeout (not caller abort), and 5xx-class PostgREST codes.
 * Never retries 4xx / RLS / validation failures.
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof OfflineError) return true;
  if (error instanceof TimeoutError) return true;

  if (error instanceof DOMException && error.name === 'AbortError') {
    // Caller aborts are not retryable; timeout aborts are wrapped as TimeoutError.
    return false;
  }

  if (error instanceof TypeError) {
    // fetch() network failures typically surface as TypeError.
    return true;
  }

  if (error && typeof error === 'object') {
    const record = error as {
      code?: string;
      status?: number;
      message?: string;
      name?: string;
    };

    if (typeof record.status === 'number') {
      if (record.status === 408 || record.status === 429) {
        return true;
      }
      // Never retry other client errors.
      if (record.status >= 400 && record.status < 500) {
        return false;
      }
      if (record.status >= 500) {
        return true;
      }
    }

    // PostgREST / Supabase transient codes
    const code = record.code ?? '';
    if (
      code === '57014' || // statement timeout
      code === '57P01' || // admin shutdown
      code === '08006' || // connection failure
      code === '08001' || // sqlclient unable to establish
      code === 'PGRST301' // JWT expired mid-flight (rare for anon inserts)
    ) {
      return true;
    }

    const message = (record.message ?? '').toLowerCase();
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('failed to fetch') ||
      message.includes('timeout') ||
      message.includes('temporar') ||
      message.includes('503') ||
      message.includes('502') ||
      message.includes('504')
    ) {
      return true;
    }
  }

  return false;
}

export interface WithRetryOptions {
  maxAttempts?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Called before each attempt (1-indexed). */
  onAttempt?: (attempt: number) => void;
}

/**
 * Runs `fn` up to maxAttempts times. Each attempt gets a fresh AbortSignal that
 * fires after timeoutMs, and is also aborted if the caller's signal fires.
 */
export async function withRetry<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  options: WithRetryOptions = {},
): Promise<T> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const callerSignal = options.signal;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (callerSignal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    if (!isOnline()) {
      lastError = new OfflineError();
      if (attempt === maxAttempts) break;
      await sleep(jitter(BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]), callerSignal);
      continue;
    }

    options.onAttempt?.(attempt);

    const attemptController = new AbortController();
    const timer = setTimeout(() => attemptController.abort(), timeoutMs);
    const onCallerAbort = () => attemptController.abort();
    callerSignal?.addEventListener('abort', onCallerAbort);

    try {
      return await fn(attemptController.signal);
    } catch (error) {
      const timedOut =
        attemptController.signal.aborted && !callerSignal?.aborted;
      const wrapped =
        timedOut && error instanceof DOMException && error.name === 'AbortError'
          ? new TimeoutError()
          : error;

      lastError = wrapped;

      if (callerSignal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (!isRetryableError(wrapped) || attempt === maxAttempts) {
        throw wrapped;
      }

      await sleep(
        jitter(BACKOFF_MS[Math.min(attempt - 1, BACKOFF_MS.length - 1)]),
        callerSignal,
      );
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', onCallerAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError ?? 'Request failed'));
}

/** Human-readable message for UI error banners. */
export function errorMessage(error: unknown, fallback = 'Request failed'): string {
  if (error instanceof OfflineError || error instanceof TimeoutError) {
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}
