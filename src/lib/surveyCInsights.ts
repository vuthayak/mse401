import {
  SURVEY_ITEMS,
  type AttributeKey,
  type SurveyItem,
} from '../types/survey';
import {
  INSIGHT_ATTRIBUTES,
  type SurveyCInsightRow,
} from './fetchSurveyCInsights';

const UNHAPPY_THRESHOLD = 2;

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

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundPct(n: number): number {
  return Math.round(n * 1000) / 10;
}

function attributeStats(values: number[]): AttributeStats {
  if (values.length === 0) {
    return { mean: 0, unhappyRate: 0 };
  }
  const unhappy = values.filter((v) => v <= UNHAPPY_THRESHOLD).length;
  return {
    mean: round1(mean(values)),
    unhappyRate: roundPct(unhappy / values.length),
  };
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

export function summarizeSurveyCInsights(
  rows: SurveyCInsightRow[],
): SurveyCInsightsSummary {
  const purchaseCount = rows.filter((r) => r.intent === 'YES').length;
  const purchaseRate = rows.length === 0 ? 0 : roundPct(purchaseCount / rows.length);

  const attributeMeans = {} as Record<AttributeKey, number>;
  const attributeUnhappyRates = {} as Record<AttributeKey, number>;

  for (const key of INSIGHT_ATTRIBUTES) {
    const values = rows.map((r) => r[key]);
    const stats = attributeStats(values);
    attributeMeans[key] = stats.mean;
    attributeUnhappyRates[key] = stats.unhappyRate;
  }

  const allScores = rows.flatMap((r) =>
    INSIGHT_ATTRIBUTES.map((key) => r[key]),
  );
  const overallMean = round1(mean(allScores));
  const overallUnhappyRate =
    allScores.length === 0
      ? 0
      : roundPct(
          allScores.filter((v) => v <= UNHAPPY_THRESHOLD).length /
            allScores.length,
        );

  let topFriction: AttributeKey | null = null;
  let maxUnhappy = -1;
  for (const key of INSIGHT_ATTRIBUTES) {
    if (attributeUnhappyRates[key] > maxUnhappy) {
      maxUnhappy = attributeUnhappyRates[key];
      topFriction = key;
    }
  }
  if (rows.length === 0) topFriction = null;

  const byItem: ItemInsight[] = SURVEY_ITEMS.map((item) => {
    const itemRows = rows.filter((r) => r.selected_item === item.id);
    const yes = itemRows.filter((r) => r.intent === 'YES').length;
    const attributes = {} as Record<AttributeKey, AttributeStats>;
    let weakestAttribute: AttributeKey | null = null;
    let weakestMean = Infinity;

    for (const key of INSIGHT_ATTRIBUTES) {
      const stats = attributeStats(itemRows.map((r) => r[key]));
      attributes[key] = stats;
      if (itemRows.length > 0 && stats.mean < weakestMean) {
        weakestMean = stats.mean;
        weakestAttribute = key;
      }
    }

    return {
      item,
      responses: itemRows.length,
      purchaseRate:
        itemRows.length === 0 ? 0 : roundPct(yes / itemRows.length),
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
    existing.count += 1;
    if (row.intent === 'YES') existing.purchaseCount += 1;
    dailyMap.set(date, existing);
  }
  const daily = [...dailyMap.values()].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    total: rows.length,
    purchaseCount,
    purchaseRate,
    overallMean,
    overallUnhappyRate,
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
  const purchaseCount = subset.filter((r) => r.intent === 'YES').length;

  const attributes = {} as Record<AttributeKey, AttributeStats>;
  let weakestAttribute: AttributeKey | null = null;
  let weakestMean = Infinity;

  for (const key of INSIGHT_ATTRIBUTES) {
    const stats = attributeStats(subset.map((r) => r[key]));
    attributes[key] = stats;
    if (subset.length > 0 && stats.mean < weakestMean) {
      weakestMean = stats.mean;
      weakestAttribute = key;
    }
  }

  const allScores = subset.flatMap((r) =>
    INSIGHT_ATTRIBUTES.map((key) => r[key]),
  );

  return {
    responses: subset.length,
    purchaseCount,
    purchaseRate:
      subset.length === 0 ? 0 : roundPct(purchaseCount / subset.length),
    overallMean: round1(mean(allScores)),
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
