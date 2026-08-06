import { describe, expect, it } from 'vitest';
import { makeInsightFact } from '../test/fixtures';
import { summarizeItemSubset } from './surveyCInsights';

describe('summarizeItemSubset', () => {
  const rows = [
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
      selected_item: 'essential-zip-hoodie-black-m',
      created_at: '2026-07-25T00:00:00.000Z',
      intent: 'YES',
      fabric: 4,
      fit: 5,
      colour: 4,
      price: 3,
      response_count: 2,
    }),
    makeInsightFact({
      selected_item: 'nike-windrunner-black-m',
      created_at: '2026-07-25T00:00:00.000Z',
      intent: 'YES',
      fabric: 5,
      fit: 5,
      colour: 4,
      price: 4,
    }),
  ];

  it('aggregates means, purchase rate, and weakest attribute', () => {
    const stats = summarizeItemSubset(rows, [
      'essential-zip-hoodie-black-m',
    ]);
    expect(stats.responses).toBe(3);
    expect(stats.purchaseCount).toBe(2);
    expect(stats.purchaseRate).toBe(66.7);
    expect(stats.attributes.fit.mean).toBeCloseTo(3.7, 1);
    expect(stats.attributes.fit.unhappyRate).toBeCloseTo(33.3, 1);
    expect(stats.weakestAttribute).toBe('price');
  });

  it('returns zeros for an empty subset', () => {
    const stats = summarizeItemSubset(rows, ['missing-item']);
    expect(stats.responses).toBe(0);
    expect(stats.purchaseRate).toBe(0);
    expect(stats.weakestAttribute).toBeNull();
    expect(stats.attributes.fabric).toEqual({ mean: 0, unhappyRate: 0 });
  });
});
