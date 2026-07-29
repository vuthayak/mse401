import { describe, expect, it } from 'vitest';
import { formatWaiting } from './attendantQueue';
import {
  DEFAULT_FITTING_ROOM,
  getFittingRoom,
  parseFittingRoom,
} from './fittingRoom';

describe('parseFittingRoom', () => {
  it('defaults when raw is missing or invalid', () => {
    expect(parseFittingRoom(undefined)).toBe(DEFAULT_FITTING_ROOM);
    expect(parseFittingRoom(null)).toBe(DEFAULT_FITTING_ROOM);
    expect(parseFittingRoom('')).toBe(DEFAULT_FITTING_ROOM);
    expect(parseFittingRoom('abc')).toBe(DEFAULT_FITTING_ROOM);
  });

  it('clamps to 1–5', () => {
    expect(parseFittingRoom('0')).toBe(1);
    expect(parseFittingRoom('1')).toBe(1);
    expect(parseFittingRoom('2')).toBe(2);
    expect(parseFittingRoom('5')).toBe(5);
    expect(parseFittingRoom('9')).toBe(5);
  });
});

describe('getFittingRoom', () => {
  it('reads room from URLSearchParams', () => {
    expect(getFittingRoom(new URLSearchParams('room=4'))).toBe(4);
    expect(getFittingRoom('room=3')).toBe(3);
    expect(getFittingRoom('')).toBe(DEFAULT_FITTING_ROOM);
  });
});

describe('formatWaiting', () => {
  it('formats short waits as just now', () => {
    expect(formatWaiting(0)).toBe('just now');
    expect(formatWaiting(30_000)).toBe('just now');
  });

  it('formats minutes', () => {
    expect(formatWaiting(60_000)).toBe('1 min');
    expect(formatWaiting(3 * 60_000)).toBe('3 min');
    expect(formatWaiting(12 * 60_000)).toBe('12 min');
  });

  it('formats hours', () => {
    expect(formatWaiting(60 * 60_000)).toBe('1h');
    expect(formatWaiting(65 * 60_000)).toBe('1h 5m');
  });

  it('handles invalid values', () => {
    expect(formatWaiting(-10)).toBe('just now');
    expect(formatWaiting(Number.NaN)).toBe('just now');
  });
});
