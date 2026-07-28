import {
  CATALOG_DEPTH_HEADINGS,
  CATALOG_LEVEL_PLURAL,
  CATALOG_LEVEL_SINGULAR,
  CATALOG_TAXONOMY,
  leafItemIds,
  type CatalogNode,
} from './catalogTaxonomy';
import {
  INSIGHT_ATTRIBUTES,
  type SurveyCInsightRow,
} from './fetchSurveyCInsights';
import {
  DEFAULT_PERIOD,
  PERIOD_HINTS,
  PERIOD_OPTIONS,
  driverLabel,
  formatCurrency,
  primaryRejectionReason,
  revenueFor,
  rowsInPeriod,
  skuPerformanceSplit,
  storeExecutiveMetrics,
  suggestedAction,
  volumeOverTime,
  type InsightsPeriod,
  type SkuPerformance,
  type VolumeGranularity,
} from './storeInsights';
import {
  ATTRIBUTE_DISPLAY,
  summarizeItemSubset,
} from './surveyCInsights';

/** One sheet: name + array-of-arrays (rows of cell values). */
export type ExportSheet = {
  name: string;
  rows: (string | number)[][];
};

export type HomeExportPeriods = {
  execPeriod: InsightsPeriod;
  chartPeriod: InsightsPeriod;
  topPeriod: InsightsPeriod;
  worstPeriod: InsightsPeriod;
};

export function periodLabel(period: InsightsPeriod): string {
  return PERIOD_OPTIONS.find((o) => o.id === period)?.label ?? period;
}

function granularityLabel(g: VolumeGranularity): string {
  switch (g) {
    case 'day':
      return 'daily';
    case 'week':
      return 'weekly';
    case 'month':
      return 'monthly';
  }
}

function periodMeta(period: InsightsPeriod): string {
  return `Period: ${periodLabel(period)}`;
}

function sheetWithHeader(
  title: string,
  meta: string[],
  headers: string[],
  dataRows: (string | number)[][],
): (string | number)[][] {
  return [[title], ...meta.map((m) => [m]), [], headers, ...dataRows];
}

function driverDetail(
  driver: { share: number } | null,
  kind: 'top' | 'worst',
): string {
  if (!driver) return '';
  return `${driver.share}% of ${kind === 'top' ? 'buyers' : 'walk-aways'}`;
}

function skuTableRows(
  kind: 'top' | 'worst',
  rows: SkuPerformance[],
): (string | number)[][] {
  return rows.map((perf) => {
    const driver = kind === 'top' ? perf.strengthDriver : perf.rejectionReason;
    const revenue =
      kind === 'top' ? perf.realizedRevenue : perf.unrealizedRevenue;
    return [
      perf.node.label,
      perf.categoryLabel,
      perf.tryOns,
      `${perf.conversionRate}%`,
      driverLabel(driver),
      driverDetail(driver, kind),
      formatCurrency(revenue),
      suggestedAction(driver, kind, perf.tryOns),
    ];
  });
}

function childCountLabel(node: CatalogNode): string {
  const count = node.children.length;
  if (count === 0) return 'single variation';
  const level = node.children[0].level;
  const noun =
    count === 1 ? CATALOG_LEVEL_SINGULAR[level] : CATALOG_LEVEL_PLURAL[level];
  return `${count} ${noun}`;
}

/** Build the five home-dashboard sheets using the same aggregators as the UI. */
export function buildHomeExportSheets(
  rows: SurveyCInsightRow[],
  periods: HomeExportPeriods = {
    execPeriod: DEFAULT_PERIOD,
    chartPeriod: DEFAULT_PERIOD,
    topPeriod: DEFAULT_PERIOD,
    worstPeriod: DEFAULT_PERIOD,
  },
  now = new Date(),
): ExportSheet[] {
  const metrics = storeExecutiveMetrics(
    rowsInPeriod(rows, periods.execPeriod, now),
  );
  const series = volumeOverTime(rows, periods.chartPeriod, now);
  const topSplit = skuPerformanceSplit(
    rowsInPeriod(rows, periods.topPeriod, now),
  );
  const worstSplit = skuPerformanceSplit(
    rowsInPeriod(rows, periods.worstPeriod, now),
  );
  const categories = CATALOG_TAXONOMY.map((node) => ({
    node,
    stats: summarizeItemSubset(rows, leafItemIds(node)),
  }));

  const executive: ExportSheet = {
    name: 'Executive summary',
    rows: sheetWithHeader(
      'Executive summary',
      [periodMeta(periods.execPeriod)],
      ['Metric', 'Value', 'Detail'],
      [
        [
          'Fitting room try-ons',
          metrics.tryOns,
          PERIOD_HINTS[periods.execPeriod],
        ],
        [
          'Conversion rate',
          `${metrics.conversionRate}%`,
          `${metrics.conversions} of ${metrics.tryOns} intended to buy`,
        ],
        [
          'Lost revenue',
          formatCurrency(metrics.unrealizedRevenue),
          `${formatCurrency(metrics.realizedRevenue)} realized`,
        ],
        [
          'Primary rejection reason',
          driverLabel(metrics.primaryRejection),
          metrics.primaryRejection
            ? `${metrics.primaryRejection.share}% of walk-aways rated it ≤2`
            : 'No walk-aways recorded',
        ],
      ],
    ),
  };

  const volume: ExportSheet = {
    name: 'Try-on volume',
    rows: sheetWithHeader(
      'Try-on volume over time',
      [
        periodMeta(periods.chartPeriod),
        `Granularity: ${granularityLabel(series.granularity)}`,
      ],
      ['Period', 'Try-ons', 'Conversions', 'Conversion %'],
      series.buckets.map((b) => [
        b.label,
        b.tryOns,
        b.conversions,
        `${b.conversionRate}%`,
      ]),
    ),
  };

  const browse: ExportSheet = {
    name: 'Browse by category',
    rows: sheetWithHeader(
      'Browse by category',
      [periodMeta('all')],
      ['Category', 'Try-ons', 'Conversion %'],
      categories.map(({ node, stats }) => [
        node.label,
        stats.responses,
        stats.responses > 0 ? `${stats.purchaseRate}%` : '',
      ]),
    ),
  };

  const top: ExportSheet = {
    name: 'Top performers',
    rows: sheetWithHeader(
      'Top performers',
      [
        periodMeta(periods.topPeriod),
        `Store avg conversion: ${topSplit.storeConversionRate}%`,
      ],
      [
        'SKU',
        'Category',
        'Try-ons',
        'Conversion',
        'Top driver',
        'Driver detail',
        'Realized revenue',
        'Suggested action',
      ],
      skuTableRows('top', topSplit.top),
    ),
  };

  const worst: ExportSheet = {
    name: 'Worst performers',
    rows: sheetWithHeader(
      'Worst performers',
      [
        periodMeta(periods.worstPeriod),
        `Store avg conversion: ${worstSplit.storeConversionRate}%`,
      ],
      [
        'SKU',
        'Category',
        'Try-ons',
        'Conversion',
        'Primary rejection',
        'Driver detail',
        'Unrealized revenue',
        'Suggested action',
      ],
      skuTableRows('worst', worstSplit.worst),
    ),
  };

  return [executive, volume, browse, top, worst];
}

function rowsForNode(
  rows: SurveyCInsightRow[],
  node: CatalogNode,
): SurveyCInsightRow[] {
  const ids = new Set(leafItemIds(node));
  return rows.filter((row) => ids.has(row.selected_item));
}

/** Build category drill-down sheets (2–3, skipping empty ones). */
export function buildCategoryExportSheets(
  rows: SurveyCInsightRow[],
  path: CatalogNode[],
): ExportSheet[] {
  if (path.length === 0) return [];
  const node = path[path.length - 1];
  const scoped = rowsForNode(rows, node);
  const stats = summarizeItemSubset(rows, leafItemIds(node));
  const revenue = revenueFor(scoped);
  const rejection = primaryRejectionReason(
    scoped.filter((row) => row.intent === 'NO'),
  );
  const pathLabel = path.map((n) => n.label).join(' / ');
  const sheets: ExportSheet[] = [];

  sheets.push({
    name: 'Category summary',
    rows: sheetWithHeader(
      node.label,
      [
        `Category path: ${pathLabel}`,
        `Level: ${CATALOG_LEVEL_SINGULAR[node.level]}`,
        periodMeta('all'),
      ],
      ['Metric', 'Value', 'Detail'],
      [
        [
          'Try-ons',
          stats.responses,
          node.children.length > 0
            ? childCountLabel(node)
            : 'single variation',
        ],
        [
          'Conversion rate',
          `${stats.purchaseRate}%`,
          `${stats.purchaseCount} intended to buy`,
        ],
        [
          'Lost revenue',
          formatCurrency(revenue.unrealized),
          `${formatCurrency(revenue.realized)} realized`,
        ],
        [
          'Primary rejection reason',
          driverLabel(rejection),
          rejection
            ? `${rejection.share}% of walk-aways rated it ≤2`
            : 'No walk-aways recorded',
        ],
      ],
    ),
  });

  if (stats.responses > 0) {
    sheets.push({
      name: 'Attribute health',
      rows: sheetWithHeader(
        'Attribute health',
        [
          `Category path: ${pathLabel}`,
          periodMeta('all'),
          `Mean score (1–5) and share of unhappy ratings (≤2) within ${node.label}`,
        ],
        ['Attribute', 'Mean score', 'Unhappy %'],
        INSIGHT_ATTRIBUTES.map((key) => [
          ATTRIBUTE_DISPLAY[key],
          Number(stats.attributes[key].mean.toFixed(1)),
          `${stats.attributes[key].unhappyRate}%`,
        ]),
      ),
    });
  }

  if (node.children.length > 0) {
    const showingVariations = node.children.every(
      (child) => child.level === 'variation',
    );
    const heading =
      CATALOG_DEPTH_HEADINGS[
        Math.min(path.length, CATALOG_DEPTH_HEADINGS.length - 1)
      ];

    if (showingVariations) {
      sheets.push({
        name: 'Variations',
        rows: sheetWithHeader(
          heading,
          [`Category path: ${pathLabel}`, periodMeta('all')],
          [
            'Variation',
            'Price',
            'Try-ons',
            'Conversion %',
            'Fabric avg',
            'Fit avg',
            'Colour avg',
            'Price avg',
          ],
          node.children.map((child) => {
            const childStats = summarizeItemSubset(
              rows,
              leafItemIds(child),
            );
            return [
              child.label,
              child.priceCad != null ? formatCurrency(child.priceCad) : '',
              childStats.responses,
              childStats.responses > 0
                ? `${childStats.purchaseRate}%`
                : '',
              childStats.responses > 0
                ? Number(childStats.attributes.fabric.mean.toFixed(1))
                : '',
              childStats.responses > 0
                ? Number(childStats.attributes.fit.mean.toFixed(1))
                : '',
              childStats.responses > 0
                ? Number(childStats.attributes.colour.mean.toFixed(1))
                : '',
              childStats.responses > 0
                ? Number(childStats.attributes.price.mean.toFixed(1))
                : '',
            ];
          }),
        ),
      });
    } else {
      sheets.push({
        name: 'Child categories',
        rows: sheetWithHeader(
          heading,
          [`Category path: ${pathLabel}`, periodMeta('all')],
          [
            'Name',
            'Level',
            'Children',
            'Try-ons',
            'Conversion %',
            'Avg score',
          ],
          node.children.map((child) => {
            const childStats = summarizeItemSubset(
              rows,
              leafItemIds(child),
            );
            return [
              child.label,
              CATALOG_LEVEL_SINGULAR[child.level],
              childCountLabel(child),
              childStats.responses,
              childStats.responses > 0
                ? `${childStats.purchaseRate}%`
                : '',
              childStats.responses > 0
                ? Number(childStats.overallMean.toFixed(1))
                : '',
            ];
          }),
        ),
      });
    }
  }

  return sheets;
}

/** Escape a cell for RFC 4180 CSV. */
function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function sheetToCsv(sheet: ExportSheet): string {
  const lines = sheet.rows.map((row) => row.map(csvCell).join(','));
  return [`# ${sheet.name}`, ...lines].join('\r\n');
}

/**
 * Download insights as a single CSV (one section per sheet).
 * Replaces the abandoned `xlsx` package to avoid known prototype-pollution advisories.
 */
export function downloadInsightsWorkbook(
  sheets: ExportSheet[],
  filename: string,
): void {
  const body = sheets.map(sheetToCsv).join('\r\n\r\n');
  const blob = new Blob([body], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename.endsWith('.csv')
    ? filename
    : filename.replace(/\.xlsx$/i, '.csv');
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function homeExportFilename(now = new Date()): string {
  return `fitting-room-insights-${now.toISOString().slice(0, 10)}.csv`;
}

export function categoryExportFilename(
  path: CatalogNode[],
  now = new Date(),
): string {
  const slug = path.map((n) => n.id).join('-') || 'category';
  return `fitting-room-insights-${slug}-${now.toISOString().slice(0, 10)}.csv`;
}
