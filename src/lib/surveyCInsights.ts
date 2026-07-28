import {
  SURVEY_ITEMS,
  type AttributeKey,
  type SurveyItem,
} from '../types/survey';
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

export interface ItemInsight {
  item: SurveyItem;
  responses: number;
  purchaseRate: number;
  attributes: Record<AttributeKey, AttributeStats>;
  weakestAttribute: AttributeKey | null;
}

export interface DailyVolume {
  date: string;
  count: number;
  purchaseCount: number;
}

export interface SurveyCInsightsSummary {
  total: number;
  purchaseCount: number;
  purchaseRate: number;
  overallMean: number;
  overallUnhappyRate: number;
  topFriction: AttributeKey | null;
  attributeMeans: Record<AttributeKey, number>;
  attributeUnhappyRates: Record<AttributeKey, number>;
  byItem: ItemInsight[];
  daily: DailyVolume[];
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

function dayKey(iso: string): string {
  return iso.slice(0, 10);
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

function overallUnhappyFromFacts(rows: SurveyCInsightRow[]): number {
  const total = totalResponses(rows);
  if (total === 0) return 0;
  const unhappySum = INSIGHT_ATTRIBUTES.reduce(
    (sum, key) => sum + unhappyForAttribute(rows, key),
    0,
  );
  return roundPct(unhappySum / (total * INSIGHT_ATTRIBUTES.length));
}

export function summarizeSurveyCInsights(
  rows: SurveyCInsightRow[],
): SurveyCInsightsSummary {
  const total = totalResponses(rows);
  const purchaseCount = totalResponses(
    rows.filter((r) => r.intent === 'YES'),
  );
  const purchaseRate = total === 0 ? 0 : roundPct(purchaseCount / total);

  const attributeMeans = {} as Record<AttributeKey, number>;
  const attributeUnhappyRates = {} as Record<AttributeKey, number>;

  for (const key of INSIGHT_ATTRIBUTES) {
    const stats = attributeStatsFromFacts(rows, key);
    attributeMeans[key] = stats.mean;
    attributeUnhappyRates[key] = stats.unhappyRate;
  }

  let topFriction: AttributeKey | null = null;
  let maxUnhappy = -1;
  for (const key of INSIGHT_ATTRIBUTES) {
    if (attributeUnhappyRates[key] > maxUnhappy) {
      maxUnhappy = attributeUnhappyRates[key];
      topFriction = key;
    }
  }
  if (total === 0) topFriction = null;

  const byItem: ItemInsight[] = SURVEY_ITEMS.map((item) => {
    const itemRows = rows.filter((r) => r.selected_item === item.id);
    const responses = totalResponses(itemRows);
    const yes = totalResponses(itemRows.filter((r) => r.intent === 'YES'));
    const attributes = {} as Record<AttributeKey, AttributeStats>;
    let weakestAttribute: AttributeKey | null = null;
    let weakestMean = Infinity;

    for (const key of INSIGHT_ATTRIBUTES) {
      const stats = attributeStatsFromFacts(itemRows, key);
      attributes[key] = stats;
      if (responses > 0 && stats.mean < weakestMean) {
        weakestMean = stats.mean;
        weakestAttribute = key;
      }
    }

    return {
      item,
      responses,
      purchaseRate: responses === 0 ? 0 : roundPct(yes / responses),
      attributes,
      weakestAttribute,
    };
  }).sort((a, b) => b.responses - a.responses);

  const dailyMap = new Map<string, DailyVolume>();
  for (const row of rows) {
    const date = dayKey(row.created_at);
    const existing = dailyMap.get(date) ?? {
      date,
      count: 0,
      purchaseCount: 0,
    };
    existing.count += row.response_count;
    if (row.intent === 'YES') existing.purchaseCount += row.response_count;
    dailyMap.set(date, existing);
  }
  const daily = [...dailyMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    total,
    purchaseCount,
    purchaseRate,
    overallMean: overallMeanFromFacts(rows),
    overallUnhappyRate: overallUnhappyFromFacts(rows),
    topFriction,
    attributeMeans,
    attributeUnhappyRates,
    byItem,
    daily,
  };
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
