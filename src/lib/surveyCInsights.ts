import { type AttributeKey } from '../types/survey';
import {
  INSIGHT_ATTRIBUTES,
  sumForAttribute,
  totalResponses,
  unhappyForAttribute,
  type SurveyCInsightRow,
} from './fetchSurveyCInsights';

export interface AttributeStats {
  mean: number;
  unhappyRate: number;
}

/** Aggregate metrics for any slice of the catalog (a taxonomy node). */
export interface SubsetStats {
  responses: number;
  purchaseCount: number;
  purchaseRate: number;
  overallMean: number;
  attributes: Record<AttributeKey, AttributeStats>;
  weakestAttribute: AttributeKey | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 1000) / 10;
}

function attributeStatsFromFacts(
  rows: SurveyCInsightRow[],
  key: AttributeKey,
): AttributeStats {
  const total = totalResponses(rows);
  if (total === 0) {
    return { mean: 0, unhappyRate: 0 };
  }
  return {
    mean: round1(sumForAttribute(rows, key) / total),
    unhappyRate: roundPct(unhappyForAttribute(rows, key) / total),
  };
}

function overallMeanFromFacts(rows: SurveyCInsightRow[]): number {
  const total = totalResponses(rows);
  if (total === 0) return 0;
  const scoreSum = INSIGHT_ATTRIBUTES.reduce(
    (sum, key) => sum + sumForAttribute(rows, key),
    0,
  );
  return round1(scoreSum / (total * INSIGHT_ATTRIBUTES.length));
}

export function summarizeItemSubset(
  rows: SurveyCInsightRow[],
  itemIds: readonly string[],
): SubsetStats {
  const ids = new Set(itemIds);
  const subset = rows.filter((r) => ids.has(r.selected_item));
  const responses = totalResponses(subset);
  const purchaseCount = totalResponses(
    subset.filter((r) => r.intent === 'YES'),
  );

  const attributes = {} as Record<AttributeKey, AttributeStats>;
  let weakestAttribute: AttributeKey | null = null;
  let weakestMean = Infinity;

  for (const key of INSIGHT_ATTRIBUTES) {
    const stats = attributeStatsFromFacts(subset, key);
    attributes[key] = stats;
    if (responses > 0 && stats.mean < weakestMean) {
      weakestMean = stats.mean;
      weakestAttribute = key;
    }
  }

  return {
    responses,
    purchaseCount,
    purchaseRate:
      responses === 0 ? 0 : roundPct(purchaseCount / responses),
    overallMean: overallMeanFromFacts(subset),
    attributes,
    weakestAttribute,
  };
}

export const ATTRIBUTE_DISPLAY: Record<AttributeKey, string> = {
  fabric: 'Fabric',
  fit: 'Fit',
  colour: 'Colour',
  price: 'Price',
};
