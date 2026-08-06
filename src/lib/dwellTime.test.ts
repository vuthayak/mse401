import { describe, expect, it } from 'vitest';
import {
  DWELL_BENCHMARK_MS,
  averageDwellMs,
  dwellFlag,
  formatDwell,
  indexDwellStats,
  toDwellAverage,
  type DwellStatRow,
} from './dwellTime';

describe('averageDwellMs', () => {
  it('returns mean duration in milliseconds', () => {
    expect(averageDwellMs(690, 2)).toBe(345_000);
  });

  it('returns null for empty or invalid counts', () => {
    expect(averageDwellMs(100, 0)).toBeNull();
    expect(averageDwellMs(NaN, 2)).toBeNull();
    expect(averageDwellMs(100, -1)).toBeNull();
  });
});

describe('formatDwell', () => {
  it('formats seconds under a minute', () => {
    expect(formatDwell(45_000)).toBe('45s');
  });

  it('formats whole minutes', () => {
    expect(formatDwell(300_000)).toBe('5m');
  });

  it('formats minutes and seconds', () => {
    expect(formatDwell(DWELL_BENCHMARK_MS)).toBe('5m 45s');
  });

  it('renders an em dash when missing', () => {
    expect(formatDwell(null)).toBe('—');
    expect(formatDwell(undefined)).toBe('—');
    expect(formatDwell(Number.NaN)).toBe('—');
  });
});

describe('dwellFlag', () => {
  it('flags values below the 5m45s ±30s window as quick', () => {
    expect(dwellFlag(DWELL_BENCHMARK_MS - 31_000)).toBe('quick');
  });

  it('flags values within ±30s of the benchmark as on pace', () => {
    expect(dwellFlag(DWELL_BENCHMARK_MS)).toBe('benchmark');
    expect(dwellFlag(DWELL_BENCHMARK_MS - 30_000)).toBe('benchmark');
    expect(dwellFlag(DWELL_BENCHMARK_MS + 30_000)).toBe('benchmark');
  });

  it('flags values above the window as long', () => {
    expect(dwellFlag(DWELL_BENCHMARK_MS + 31_000)).toBe('long');
  });

  it('returns null for missing values', () => {
    expect(dwellFlag(null)).toBeNull();
  });
});

describe('indexDwellStats', () => {
  it('indexes room and item averages', () => {
    const rows: DwellStatRow[] = [
      {
        scope: 'room',
        scopeKey: '2',
        sessionCount: 2,
        totalSeconds: 690,
      },
      {
        scope: 'item',
        scopeKey: 'nike-windrunner-black-m',
        sessionCount: 1,
        totalSeconds: 200,
      },
    ];

    const index = indexDwellStats(rows);
    expect(index.byRoom.get(2)?.averageMs).toBe(345_000);
    expect(index.byRoom.get(2)?.flag).toBe('benchmark');
    expect(index.byItem.get('nike-windrunner-black-m')?.averageMs).toBe(
      200_000,
    );
    expect(index.byItem.get('nike-windrunner-black-m')?.flag).toBe('quick');
  });

  it('skips rows with zero sessions', () => {
    const index = indexDwellStats([
      { scope: 'room', scopeKey: '1', sessionCount: 0, totalSeconds: 0 },
    ]);
    expect(index.byRoom.size).toBe(0);
  });
});

describe('toDwellAverage', () => {
  it('returns null when average cannot be computed', () => {
    expect(toDwellAverage(10, 0)).toBeNull();
  });
});
