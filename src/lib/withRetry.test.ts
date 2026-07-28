import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  OfflineError,
  TimeoutError,
  isOnline,
  isRetryableError,
  withRetry,
} from './withRetry';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('isRetryableError', () => {
  it('retries offline and timeout errors', () => {
    expect(isRetryableError(new OfflineError())).toBe(true);
    expect(isRetryableError(new TimeoutError())).toBe(true);
    expect(isRetryableError(new TypeError('Failed to fetch'))).toBe(true);
  });

  it('does not retry 4xx client errors', () => {
    const err = Object.assign(new Error('not found'), { status: 404 });
    expect(isRetryableError(err)).toBe(false);
  });

  it('retries 5xx and 429', () => {
    expect(isRetryableError(Object.assign(new Error('down'), { status: 503 }))).toBe(
      true,
    );
    expect(isRetryableError(Object.assign(new Error('slow'), { status: 429 }))).toBe(
      true,
    );
  });
});

describe('withRetry', () => {
  it('reports online when navigator.onLine is true', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(isOnline()).toBe(true);
  });

  it('returns on first success', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const fn = vi.fn(async () => 'ok');
    await expect(withRetry(fn, { maxAttempts: 3, timeoutMs: 1000 })).resolves.toBe(
      'ok',
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries retryable failures then succeeds', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce('ok');

    await expect(
      withRetry(fn, { maxAttempts: 3, timeoutMs: 1000 }),
    ).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-retryable errors', async () => {
    vi.stubGlobal('navigator', { onLine: true });
    const err = Object.assign(new Error('bad request'), { status: 400 });
    const fn = vi.fn(async () => {
      throw err;
    });

    await expect(withRetry(fn, { maxAttempts: 3, timeoutMs: 1000 })).rejects.toBe(
      err,
    );
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
