import { describe, expect, it } from 'vitest';
import { makeInsightFact } from '../test/fixtures';
import {
  driverLabel,
  formatCurrency,
  primaryRejectionReason,
  primaryStrength,
  rowsInPeriod,
  skuPerformanceSplit,
  storeExecutiveMetrics,
  suggestedAction,
  volumeOverTime,
} from './storeInsights';

const NOW = new Date('2026-07-27T12:00:00.000Z');

const FIXTURE = [
  makeInsightFact({
    selected_item: 'nike-windrunner-black-m',
    created_at: '2026-07-25T00:00:00.000Z',
    intent: 'YES',
    fabric: 5,
    fit: 5,
    colour: 4,
    price: 4,
  }),
  makeInsightFact({
    selected_item: 'essential-zip-hoodie-black-m',
    created_at: '2026-07-24T00:00:00.000Z',
    intent: 'NO',
    fabric: 2,
    fit: 1,
    colour: 3,
    price: 2,
  }),
  makeInsightFact({
    selected_item: 'waterloo-zip-hoodie-heather-grey-m',
    created_at: '2026-07-10T00:00:00.000Z',
    intent: 'YES',
    fabric: 4,
    fit: 4,
    colour: 5,
    price: 3,
  }),
  makeInsightFact({
    selected_item: 'chevrolet-graphic-jersey-maroon-m',
    created_at: '2026-05-15T00:00:00.000Z',
    intent: 'NO',
    fabric: 2,
    fit: 2,
    colour: 2,
    price: 1,
  }),
  makeInsightFact({
    selected_item: 'adidas-santiago-track-colourblock-navy-m',
    created_at: '2025-12-01T00:00:00.000Z',
    intent: 'YES',
    fabric: 5,
    fit: 4,
    colour: 4,
    price: 5,
  }),
];

describe('rowsInPeriod', () => {
  it('returns all rows for all-time', () => {
    expect(rowsInPeriod(FIXTURE, 'all', NOW)).toHaveLength(5);
  });

  it('filters to the last 7 days', () => {
    const rows = rowsInPeriod(FIXTURE, '7d', NOW);
    expect(rows.map((r) => r.selected_item)).toEqual([
      'nike-windrunner-black-m',
      'essential-zip-hoodie-black-m',
    ]);
  });

  it('filters to the last month', () => {
    const rows = rowsInPeriod(FIXTURE, '1m', NOW);
    expect(rows).toHaveLength(3);
  });

  it('filters to the last 3 months', () => {
    const rows = rowsInPeriod(FIXTURE, '3m', NOW);
    expect(rows).toHaveLength(4);
  });
});

describe('formatCurrency', () => {
  it('formats CAD without cents', () => {
    expect(formatCurrency(120)).toMatch(/\$120/);
  });
});

describe('primaryRejectionReason', () => {
  it('returns null when there are no walk-aways', () => {
    expect(primaryRejectionReason([])).toBeNull();
  });

  it('picks the attribute with the highest unhappy share', () => {
    const walkAways = FIXTURE.filter((r) => r.intent === 'NO');
    const driver = primaryRejectionReason(walkAways);
    // Both walk-aways rate fit ≤2; one also has a lower fit mean (1 vs 2).
    expect(driver?.attribute).toBe('fit');
    expect(driver?.share).toBe(100);
  });
});

describe('primaryStrength', () => {
  it('returns null when there are no purchases', () => {
    expect(primaryStrength([])).toBeNull();
  });

  it('picks the attribute with the highest happy share', () => {
    const purchases = FIXTURE.filter((r) => r.intent === 'YES');
    const driver = primaryStrength(purchases);
    expect(driver).not.toBeNull();
    expect(['fabric', 'fit', 'colour', 'price']).toContain(driver!.attribute);
  });
});

describe('storeExecutiveMetrics', () => {
  it('aggregates try-ons, conversion, and primary rejection', () => {
    const metrics = storeExecutiveMetrics(FIXTURE);
    expect(metrics.tryOns).toBe(5);
    expect(metrics.conversions).toBe(3);
    expect(metrics.conversionRate).toBe(60);
    expect(metrics.primaryRejection?.attribute).toBe('fit');
  });

  it('handles empty rows', () => {
    const metrics = storeExecutiveMetrics([]);
    expect(metrics.tryOns).toBe(0);
    expect(metrics.conversionRate).toBe(0);
    expect(metrics.primaryRejection).toBeNull();
  });
});

describe('skuPerformanceSplit', () => {
  it('splits SKUs around the store conversion average', () => {
    const split = skuPerformanceSplit(FIXTURE, 3);
    expect(split.storeConversionRate).toBe(60);
    expect(split.top.length + split.worst.length).toBeGreaterThan(0);
    for (const perf of split.top) {
      expect(perf.conversionRate).toBeGreaterThanOrEqual(split.storeConversionRate);
      expect(perf.tryOns).toBeGreaterThan(0);
    }
    for (const perf of split.worst) {
      expect(perf.conversionRate).toBeLessThan(split.storeConversionRate);
    }
  });
});

describe('suggestedAction', () => {
  it('asks to keep collecting when sample is low', () => {
    expect(
      suggestedAction({ attribute: 'fit', share: 80 }, 'worst', 2),
    ).toBe('Low sample — keep collecting responses before acting');
  });

  it('maps a rejection driver to a merchandising action', () => {
    expect(
      suggestedAction({ attribute: 'fabric', share: 70 }, 'worst', 10),
    ).toMatch(/fabric/i);
  });
});

describe('driverLabel', () => {
  it('returns an em dash for null drivers', () => {
    expect(driverLabel(null)).toBe('—');
  });

  it('returns the attribute display name', () => {
    expect(driverLabel({ attribute: 'colour', share: 50 })).toBe('Colour');
  });
});

describe('volumeOverTime', () => {
  it('buckets try-ons within the selected period', () => {
    const series = volumeOverTime(FIXTURE, '7d', NOW);
    expect(series.buckets.length).toBeGreaterThan(0);
    const total = series.buckets.reduce((sum, b) => sum + b.tryOns, 0);
    expect(total).toBe(2);
  });
});
