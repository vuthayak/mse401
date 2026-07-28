import { describe, expect, it } from 'vitest';
import { resolveCatalogPath } from './catalogTaxonomy';
import {
  buildCategoryExportSheets,
  buildHomeExportSheets,
  categoryExportFilename,
  homeExportFilename,
  periodLabel,
} from './exportInsights';
import type { SurveyCInsightRow } from './fetchSurveyCInsights';

/** Build one aggregate fact as if returned by get_survey_c_insights_rows(). */
function fact(
  overrides: {
    selected_item: string;
    created_at: string;
    intent: 'YES' | 'NO';
    fabric: number;
    fit: number;
    colour: number;
    price: number;
    response_count?: number;
  },
): SurveyCInsightRow {
  const n = overrides.response_count ?? 1;
  const { fabric, fit, colour, price } = overrides;
  return {
    created_at: overrides.created_at,
    selected_item: overrides.selected_item,
    intent: overrides.intent,
    response_count: n,
    sum_fabric: fabric * n,
    sum_fit: fit * n,
    sum_colour: colour * n,
    sum_price: price * n,
    unhappy_fabric: fabric <= 2 ? n : 0,
    unhappy_fit: fit <= 2 ? n : 0,
    unhappy_colour: colour <= 2 ? n : 0,
    unhappy_price: price <= 2 ? n : 0,
    happy_fabric: fabric >= 4 ? n : 0,
    happy_fit: fit >= 4 ? n : 0,
    happy_colour: colour >= 4 ? n : 0,
    happy_price: price >= 4 ? n : 0,
  };
}

/** Fixed "now" for period filtering: 2026-07-27 UTC. */
const NOW = new Date('2026-07-27T12:00:00.000Z');

const FIXTURE: SurveyCInsightRow[] = [
  // Within 7d
  fact({
    selected_item: 'nike-windbreaker',
    created_at: '2026-07-25T00:00:00.000Z',
    intent: 'YES',
    fabric: 5,
    fit: 5,
    colour: 4,
    price: 4,
  }),
  fact({
    selected_item: 'black-zip-hoodie',
    created_at: '2026-07-24T00:00:00.000Z',
    intent: 'NO',
    fabric: 2,
    fit: 1,
    colour: 3,
    price: 2,
  }),
  // Within 1m but outside 7d
  fact({
    selected_item: 'waterloo-hoodie',
    created_at: '2026-07-10T00:00:00.000Z',
    intent: 'YES',
    fabric: 4,
    fit: 4,
    colour: 5,
    price: 3,
  }),
  // Outside 1m (within 3m)
  fact({
    selected_item: 'chevrolet-jersey',
    created_at: '2026-05-15T00:00:00.000Z',
    intent: 'NO',
    fabric: 2,
    fit: 2,
    colour: 2,
    price: 1,
  }),
  // Outside 3m
  fact({
    selected_item: 'adidas-track-jacket',
    created_at: '2025-12-01T00:00:00.000Z',
    intent: 'YES',
    fabric: 5,
    fit: 4,
    colour: 4,
    price: 5,
  }),
];

describe('periodLabel', () => {
  it('maps period ids to dashboard labels', () => {
    expect(periodLabel('7d')).toBe('7 days');
    expect(periodLabel('1m')).toBe('1 month');
    expect(periodLabel('3m')).toBe('3 months');
    expect(periodLabel('all')).toBe('All time');
  });
});

describe('buildHomeExportSheets', () => {
  it('produces five sheets with period metadata', () => {
    const sheets = buildHomeExportSheets(FIXTURE, {
      execPeriod: 'all',
      chartPeriod: 'all',
      topPeriod: 'all',
      worstPeriod: 'all',
    });

    expect(sheets.map((s) => s.name)).toEqual([
      'Executive summary',
      'Try-on volume',
      'Browse by category',
      'Top performers',
      'Worst performers',
    ]);

    const exec = sheets[0];
    expect(exec.rows[0][0]).toBe('Executive summary');
    expect(exec.rows[1][0]).toBe('Period: All time');
    expect(exec.rows[3]).toEqual(['Metric', 'Value', 'Detail']);
    // try-ons = all 5 fixture response_counts
    expect(exec.rows[4]).toEqual([
      'Fitting room try-ons',
      5,
      'all time',
    ]);

    const volume = sheets[1];
    expect(volume.rows[1][0]).toBe('Period: All time');
    expect(String(volume.rows[2][0])).toMatch(/^Granularity:/);

    const browse = sheets[2];
    expect(browse.rows[1][0]).toBe('Period: All time');
    expect(browse.rows[3]).toEqual([
      'Category',
      'Try-ons',
      'Conversion %',
    ]);

    const top = sheets[3];
    expect(top.rows[1][0]).toBe('Period: All time');
    expect(String(top.rows[2][0])).toMatch(/^Store avg conversion:/);

    const worst = sheets[4];
    expect(worst.rows[1][0]).toBe('Period: All time');
  });

  it('applies independent period filters per sheet', () => {
    const sheets = buildHomeExportSheets(
      FIXTURE,
      {
        execPeriod: '7d',
        chartPeriod: '7d',
        topPeriod: '1m',
        worstPeriod: '3m',
      },
      NOW,
    );

    expect(sheets[0].rows[1][0]).toBe('Period: 7 days');
    expect(sheets[1].rows[1][0]).toBe('Period: 7 days');
    expect(sheets[3].rows[1][0]).toBe('Period: 1 month');
    expect(sheets[4].rows[1][0]).toBe('Period: 3 months');

    // 7d window: 2026-07-21..27 → two fixture facts
    expect(sheets[0].rows[4][1]).toBe(2);

    const allTime = buildHomeExportSheets(
      FIXTURE,
      {
        execPeriod: 'all',
        chartPeriod: 'all',
        topPeriod: 'all',
        worstPeriod: 'all',
      },
      NOW,
    );
    expect(allTime[0].rows[4][1]).toBe(5);

    const oneMonth = buildHomeExportSheets(
      FIXTURE,
      {
        execPeriod: '1m',
        chartPeriod: '1m',
        topPeriod: '1m',
        worstPeriod: '1m',
      },
      NOW,
    );
    // 1m: from 2026-06-28 → three facts (Jul 25, 24, 10)
    expect(oneMonth[0].rows[4][1]).toBe(3);
  });

  it('handles empty rows without throwing', () => {
    const sheets = buildHomeExportSheets([], undefined, NOW);
    expect(sheets).toHaveLength(5);
    expect(sheets[0].rows[4][1]).toBe(0);
    expect(sheets[3].rows[0][0]).toBe('Top performers');
    expect(sheets[3].rows.some((r) => r[0] === 'SKU')).toBe(true);
    const headerIdx = sheets[3].rows.findIndex((r) => r[0] === 'SKU');
    expect(sheets[3].rows.length).toBe(headerIdx + 1);
  });
});

describe('buildCategoryExportSheets', () => {
  it('builds summary + attribute + children for apparel node', () => {
    const path = resolveCatalogPath(['hoodies']);
    expect(path).not.toBeNull();
    const sheets = buildCategoryExportSheets(FIXTURE, path!);

    expect(sheets[0].name).toBe('Category summary');
    expect(sheets[0].rows[1][0]).toBe('Category path: Hoodies');
    expect(sheets[0].rows[3][0]).toBe('Period: All time');

    expect(sheets.some((s) => s.name === 'Attribute health')).toBe(true);
    expect(sheets.some((s) => s.name === 'Child categories')).toBe(true);

    const attrs = sheets.find((s) => s.name === 'Attribute health')!;
    expect(attrs.rows[2][0]).toBe('Period: All time');
    expect(attrs.rows.some((r) => r[0] === 'Fabric')).toBe(true);
  });

  it('builds variations sheet at SKU leaf parent', () => {
    const path = resolveCatalogPath([
      'hoodies',
      'zip-hoodies',
      'waterloo-zip-hoodie',
    ]);
    expect(path).not.toBeNull();
    const sheets = buildCategoryExportSheets(FIXTURE, path!);

    expect(sheets.some((s) => s.name === 'Variations')).toBe(true);
    expect(sheets.some((s) => s.name === 'Child categories')).toBe(false);
  });

  it('skips attribute health when category has no responses', () => {
    const path = resolveCatalogPath(['hoodies']);
    const sheets = buildCategoryExportSheets([], path!);
    expect(sheets.map((s) => s.name)).toEqual([
      'Category summary',
      'Child categories',
    ]);
  });

  it('returns empty array for empty path', () => {
    expect(buildCategoryExportSheets(FIXTURE, [])).toEqual([]);
  });
});

describe('filenames', () => {
  it('formats home and category filenames with date', () => {
    expect(homeExportFilename(NOW)).toBe(
      'fitting-room-insights-2026-07-27.csv',
    );
    const path = resolveCatalogPath(['hoodies', 'zip-hoodies'])!;
    expect(categoryExportFilename(path, NOW)).toBe(
      'fitting-room-insights-hoodies-zip-hoodies-2026-07-27.csv',
    );
  });
});
