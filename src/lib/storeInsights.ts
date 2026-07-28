import type { AttributeKey } from '../types/survey';
import {
  ancestryLabel,
  catalogHref,
  entriesAtLevel,
  leafItemIds,
  priceForItem,
  type CatalogEntry,
  type CatalogNode,
} from './catalogTaxonomy';
import {
  INSIGHT_ATTRIBUTES,
  happyForAttribute,
  sumForAttribute,
  totalResponses,
  unhappyForAttribute,
  type SurveyCInsightRow,
} from './fetchSurveyCInsights';
import { ATTRIBUTE_DISPLAY } from './surveyCInsights';

const LOW_SAMPLE_TRY_ONS = 5;

const currency = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return currency.format(value);
}

function roundPct(n: number): number {
  return Math.round(n * 1000) / 10;
}

/** Adjustable reporting periods shared by dashboard cards and the chart. */
export type InsightsPeriod = '7d' | '1m' | '3m' | 'all';

export const PERIOD_OPTIONS: ReadonlyArray<{
  id: InsightsPeriod;
  label: string;
}> = [
  { id: '7d', label: '7 days' },
  { id: '1m', label: '1 month' },
  { id: '3m', label: '3 months' },
  { id: 'all', label: 'All time' },
];

export const DEFAULT_PERIOD: InsightsPeriod = '1m';

/** Lowercase phrasing for KPI hints, e.g. "past month". */
export const PERIOD_HINTS: Record<InsightsPeriod, string> = {
  '7d': 'past 7 days',
  '1m': 'past month',
  '3m': 'past 3 months',
  all: 'all time',
};

export function rowsInPeriod(
  rows: SurveyCInsightRow[],
  period: InsightsPeriod,
  now = new Date(),
): SurveyCInsightRow[] {
  const cutoff = periodCutoff(period, now);
  if (cutoff === null) return rows;
  return rows.filter(
    (row) => new Date(row.created_at).getTime() >= cutoff.getTime(),
  );
}

export interface Revenue {
  realized: number;
  unrealized: number;
}

/** Realized = try-ons that intended to buy; unrealized = walk-aways. */
export function revenueFor(rows: SurveyCInsightRow[]): Revenue {
  let realized = 0;
  let unrealized = 0;

  for (const row of rows) {
    const price = priceForItem(row.selected_item) * row.response_count;
    if (row.intent === 'YES') {
      realized += price;
    } else {
      unrealized += price;
    }
  }

  return { realized, unrealized };
}

export interface AttributeDriver {
  attribute: AttributeKey;
  /** Share of the rows flagging this attribute (0–100). */
  share: number;
}

/**
 * Attribute most often rated poorly by shoppers who walked away.
 * Pass only the `NO` aggregate facts.
 */
export function primaryRejectionReason(
  walkAwayRows: SurveyCInsightRow[],
): AttributeDriver | null {
  const total = totalResponses(walkAwayRows);
  if (total === 0) return null;

  let best: AttributeKey | null = null;
  let bestShare = -1;
  let bestMean = Infinity;

  for (const key of INSIGHT_ATTRIBUTES) {
    const share = unhappyForAttribute(walkAwayRows, key) / total;
    const mean = sumForAttribute(walkAwayRows, key) / total;

    if (share > bestShare || (share === bestShare && mean < bestMean)) {
      best = key;
      bestShare = share;
      bestMean = mean;
    }
  }

  return best ? { attribute: best, share: roundPct(bestShare) } : null;
}

/**
 * Attribute most often rated highly by shoppers who intended to buy.
 * Pass only the `YES` aggregate facts.
 */
export function primaryStrength(
  purchaseRows: SurveyCInsightRow[],
): AttributeDriver | null {
  const total = totalResponses(purchaseRows);
  if (total === 0) return null;

  let best: AttributeKey | null = null;
  let bestShare = -1;
  let bestMean = -Infinity;

  for (const key of INSIGHT_ATTRIBUTES) {
    const share = happyForAttribute(purchaseRows, key) / total;
    const mean = sumForAttribute(purchaseRows, key) / total;

    if (share > bestShare || (share === bestShare && mean > bestMean)) {
      best = key;
      bestShare = share;
      bestMean = mean;
    }
  }

  return best ? { attribute: best, share: roundPct(bestShare) } : null;
}

/**
 * Playbook mapping a driver attribute to a merchandising next step. These are
 * heuristics over survey signal, not learned recommendations.
 */
const WEAKNESS_ACTIONS: Record<AttributeKey, string> = {
  fabric: 'Review fabric spec with the vendor; add a hand-feel callout at the rack',
  fit: 'Re-check size grading and post fit guidance in the fitting room',
  colour: 'Rotate this colourway out; feature better-received variants',
  price: 'Test a promotion or reprice against comparable items',
};

const STRENGTH_ACTIONS: Record<AttributeKey, string> = {
  fabric: 'Lead with the fabric story in merchandising and signage',
  fit: 'Hold the current fit; extend the size run',
  colour: 'Expand this colourway across sizes and adjacent SKUs',
  price: 'Protect the price point; avoid discounting',
};

export function suggestedAction(
  driver: AttributeDriver | null,
  kind: 'top' | 'worst',
  tryOns: number,
): string {
  if (tryOns < LOW_SAMPLE_TRY_ONS) {
    return 'Low sample — keep collecting responses before acting';
  }
  if (!driver) {
    return kind === 'top'
      ? 'Maintain current assortment'
      : 'No clear driver yet — review in store';
  }
  return kind === 'top'
    ? STRENGTH_ACTIONS[driver.attribute]
    : WEAKNESS_ACTIONS[driver.attribute];
}

export interface StoreExecutiveMetrics {
  tryOns: number;
  conversions: number;
  conversionRate: number;
  realizedRevenue: number;
  unrealizedRevenue: number;
  primaryRejection: AttributeDriver | null;
}

/** Computes over the facts it is given — filter with `rowsInPeriod` first. */
export function storeExecutiveMetrics(
  rows: SurveyCInsightRow[],
): StoreExecutiveMetrics {
  const tryOns = totalResponses(rows);
  const conversions = totalResponses(rows.filter((row) => row.intent === 'YES'));
  const revenue = revenueFor(rows);

  return {
    tryOns,
    conversions,
    conversionRate: tryOns === 0 ? 0 : roundPct(conversions / tryOns),
    realizedRevenue: revenue.realized,
    unrealizedRevenue: revenue.unrealized,
    primaryRejection: primaryRejectionReason(
      rows.filter((row) => row.intent === 'NO'),
    ),
  };
}

export interface SkuPerformance {
  node: CatalogNode;
  href: string;
  categoryLabel: string;
  tryOns: number;
  conversions: number;
  conversionRate: number;
  realizedRevenue: number;
  unrealizedRevenue: number;
  rejectionReason: AttributeDriver | null;
  strengthDriver: AttributeDriver | null;
}

function skuPerformance(
  entry: CatalogEntry,
  rows: SurveyCInsightRow[],
): SkuPerformance {
  const ids = new Set(leafItemIds(entry.node));
  const skuRows = rows.filter((row) => ids.has(row.selected_item));
  const tryOns = totalResponses(skuRows);
  const conversions = totalResponses(
    skuRows.filter((row) => row.intent === 'YES'),
  );
  const revenue = revenueFor(skuRows);

  return {
    node: entry.node,
    href: catalogHref(entry.path),
    categoryLabel: ancestryLabel(entry.path),
    tryOns,
    conversions,
    conversionRate: tryOns === 0 ? 0 : roundPct(conversions / tryOns),
    realizedRevenue: revenue.realized,
    unrealizedRevenue: revenue.unrealized,
    rejectionReason: primaryRejectionReason(
      skuRows.filter((row) => row.intent === 'NO'),
    ),
    strengthDriver: primaryStrength(
      skuRows.filter((row) => row.intent === 'YES'),
    ),
  };
}

export interface SkuPerformanceSplit {
  top: SkuPerformance[];
  worst: SkuPerformance[];
  /** Store-wide conversion (0–100) across the same rows, used as the split line. */
  storeConversionRate: number;
}

/**
 * Splits SKUs on conversion relative to the store average, then ranks each
 * side by revenue. Ranking both lists on revenue alone would let a
 * high-traffic, high-price SKU top both — expensive items accumulate the most
 * lost revenue even when they convert well.
 *
 * Computes over the rows it is given — filter with `rowsInPeriod` first.
 */
export function skuPerformanceSplit(
  rows: SurveyCInsightRow[],
  limit = 3,
): SkuPerformanceSplit {
  const all = entriesAtLevel('sku')
    .map((entry) => skuPerformance(entry, rows))
    .filter((perf) => perf.tryOns > 0);

  const storeTryOns = totalResponses(rows);
  const storeConversions = totalResponses(
    rows.filter((row) => row.intent === 'YES'),
  );
  const storeConversionRate =
    storeTryOns === 0 ? 0 : roundPct(storeConversions / storeTryOns);

  const top = all
    .filter((perf) => perf.conversionRate >= storeConversionRate)
    .sort(
      (a, b) =>
        b.realizedRevenue - a.realizedRevenue ||
        b.conversionRate - a.conversionRate,
    )
    .slice(0, limit);

  const worst = all
    .filter((perf) => perf.conversionRate < storeConversionRate)
    .sort(
      (a, b) =>
        b.unrealizedRevenue - a.unrealizedRevenue ||
        a.conversionRate - b.conversionRate,
    )
    .slice(0, limit);

  return { top, worst, storeConversionRate };
}

export function driverLabel(driver: AttributeDriver | null): string {
  return driver ? ATTRIBUTE_DISPLAY[driver.attribute] : '—';
}

export type VolumeGranularity = 'day' | 'week' | 'month';

export interface VolumeBucket {
  /** Bucket start as YYYY-MM-DD (UTC). */
  key: string;
  label: string;
  tryOns: number;
  conversions: number;
  /** Purchase intent rate within the bucket (0–100). */
  conversionRate: number;
}

export interface VolumeSeries {
  period: InsightsPeriod;
  granularity: VolumeGranularity;
  buckets: VolumeBucket[];
  /** Axis ceiling — evenly divisible so try-on ticks land on equal integer steps. */
  maxTryOns: number;
  /** Axis ceiling for conversion % (at least 100, or a round step above the peak). */
  maxConversionRate: number;
}

const MS_DAY = 24 * 60 * 60 * 1000;

function utcDayStart(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function addUtcDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_DAY);
}

function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Monday-start week key in UTC. */
function weekStartKey(date: Date): string {
  const day = utcDayStart(date);
  const dow = day.getUTCDay(); // 0 Sun … 6 Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  return formatDayKey(addUtcDays(day, mondayOffset));
}

function monthStartKey(date: Date): string {
  return formatDayKey(
    new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
  );
}

function periodCutoff(period: InsightsPeriod, now: Date): Date | null {
  const today = utcDayStart(now);
  switch (period) {
    case '7d':
      return addUtcDays(today, -6);
    case '1m':
      return addUtcDays(today, -29);
    case '3m':
      return addUtcDays(today, -89);
    case 'all':
      return null;
  }
}

function granularityFor(
  period: InsightsPeriod,
  spanDays: number,
): VolumeGranularity {
  switch (period) {
    case '7d':
      return 'day';
    case '1m':
      // ~30 daily bars stay readable; weekly only if the window somehow balloons.
      return spanDays > 45 ? 'week' : 'day';
    case '3m':
      return 'week';
    case 'all':
      return spanDays > 120 ? 'month' : 'week';
  }
}

function bucketKeyFor(iso: string, granularity: VolumeGranularity): string {
  const date = new Date(iso);
  if (granularity === 'day') return formatDayKey(utcDayStart(date));
  if (granularity === 'week') return weekStartKey(date);
  return monthStartKey(date);
}

function nextBucketStart(key: string, granularity: VolumeGranularity): Date {
  const start = new Date(`${key}T00:00:00.000Z`);
  if (granularity === 'day') return addUtcDays(start, 1);
  if (granularity === 'week') return addUtcDays(start, 7);
  return new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1),
  );
}

function formatBucketLabel(key: string, granularity: VolumeGranularity): string {
  const date = new Date(`${key}T00:00:00.000Z`);
  if (granularity === 'month') {
    return date.toLocaleDateString('en-CA', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    });
  }
  return date.toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function conversionAxisMax(peakRate: number): number {
  if (peakRate <= 0) return 100;
  if (peakRate <= 100) return 100;
  return Math.ceil(peakRate / 10) * 10;
}

/**
 * Axis ceiling for try-on counts: the smallest multiple of `divisions` that
 * is ≥ peak, so ticks land on even integer steps (0, step, 2·step, …).
 */
function evenCountAxisMax(peak: number, divisions = 4): number {
  if (peak <= 0) return divisions;
  const step = Math.max(1, Math.ceil(peak / divisions));
  return step * divisions;
}

/**
 * Buckets try-ons and conversion rate over an adjustable window.
 * Empty buckets are filled so the time axis stays continuous.
 */
export function volumeOverTime(
  rows: SurveyCInsightRow[],
  period: InsightsPeriod = DEFAULT_PERIOD,
  now = new Date(),
): VolumeSeries {
  const cutoff = periodCutoff(period, now);
  const filtered = rowsInPeriod(rows, period, now);

  const today = utcDayStart(now);
  let rangeStart: Date;
  let rangeEnd: Date = today;

  if (cutoff) {
    rangeStart = cutoff;
  } else if (filtered.length === 0) {
    rangeStart = addUtcDays(today, -29);
  } else {
    const timestamps = filtered.map((row) =>
      utcDayStart(new Date(row.created_at)).getTime(),
    );
    rangeStart = new Date(Math.min(...timestamps));
  }

  const spanDays = Math.max(
    1,
    Math.round((rangeEnd.getTime() - rangeStart.getTime()) / MS_DAY) + 1,
  );
  const granularity = granularityFor(period, spanDays);

  const startKey = bucketKeyFor(rangeStart.toISOString(), granularity);
  const endKey = bucketKeyFor(rangeEnd.toISOString(), granularity);

  const counts = new Map<string, { tryOns: number; conversions: number }>();
  for (const row of filtered) {
    const key = bucketKeyFor(row.created_at, granularity);
    const existing = counts.get(key) ?? { tryOns: 0, conversions: 0 };
    existing.tryOns += row.response_count;
    if (row.intent === 'YES') existing.conversions += row.response_count;
    counts.set(key, existing);
  }

  const buckets: VolumeBucket[] = [];
  let cursor = startKey;
  // Guard against pathological ranges.
  for (let i = 0; i < 400; i += 1) {
    const tally = counts.get(cursor) ?? { tryOns: 0, conversions: 0 };
    buckets.push({
      key: cursor,
      label: formatBucketLabel(cursor, granularity),
      tryOns: tally.tryOns,
      conversions: tally.conversions,
      conversionRate:
        tally.tryOns === 0
          ? 0
          : roundPct(tally.conversions / tally.tryOns),
    });
    if (cursor === endKey) break;
    cursor = formatDayKey(nextBucketStart(cursor, granularity));
    if (cursor > endKey) break;
  }

  const maxTryOns = Math.max(0, ...buckets.map((b) => b.tryOns));
  const maxConversionRate = Math.max(
    0,
    ...buckets.map((b) => b.conversionRate),
  );

  return {
    period,
    granularity,
    buckets,
    maxTryOns: evenCountAxisMax(maxTryOns),
    maxConversionRate: conversionAxisMax(maxConversionRate),
  };
}
