import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CATALOG_TAXONOMY,
  catalogHref,
  leafItemIds,
} from '../../lib/catalogTaxonomy';
import {
  buildHomeExportSheets,
  downloadInsightsWorkbook,
  homeExportFilename,
} from '../../lib/exportInsights';
import {
  DEFAULT_PERIOD,
  PERIOD_HINTS,
  driverLabel,
  formatCurrency,
  rowsInPeriod,
  skuPerformanceSplit,
  storeExecutiveMetrics,
  type InsightsPeriod,
} from '../../lib/storeInsights';
import { summarizeItemSubset } from '../../lib/surveyCInsights';
import { Kpi } from './Kpi';
import { useRegisterInsightsExport } from './InsightsExportContext';
import { useInsightsRows } from './InsightsLayout';
import { PeriodSelector } from './PeriodSelector';
import { SkuPerformanceTable } from './SkuPerformanceTable';
import { TryOnVolumeChart } from './TryOnVolumeChart';

export function InsightsHome() {
  const rows = useInsightsRows();

  const [execPeriod, setExecPeriod] = useState<InsightsPeriod>(DEFAULT_PERIOD);
  const [chartPeriod, setChartPeriod] =
    useState<InsightsPeriod>(DEFAULT_PERIOD);
  const [topPeriod, setTopPeriod] = useState<InsightsPeriod>(DEFAULT_PERIOD);
  const [worstPeriod, setWorstPeriod] =
    useState<InsightsPeriod>(DEFAULT_PERIOD);

  const metrics = useMemo(
    () => storeExecutiveMetrics(rowsInPeriod(rows, execPeriod)),
    [rows, execPeriod],
  );
  const topSplit = useMemo(
    () => skuPerformanceSplit(rowsInPeriod(rows, topPeriod)),
    [rows, topPeriod],
  );
  const worstSplit = useMemo(
    () => skuPerformanceSplit(rowsInPeriod(rows, worstPeriod)),
    [rows, worstPeriod],
  );
  const categories = useMemo(
    () =>
      CATALOG_TAXONOMY.map((node) => ({
        node,
        stats: summarizeItemSubset(rows, leafItemIds(node)),
      })),
    [rows],
  );

  const exportFn = useCallback(() => {
    const sheets = buildHomeExportSheets(rows, {
      execPeriod,
      chartPeriod,
      topPeriod,
      worstPeriod,
    });
    downloadInsightsWorkbook(sheets, homeExportFilename());
  }, [rows, execPeriod, chartPeriod, topPeriod, worstPeriod]);

  useRegisterInsightsExport(exportFn);

  return (
    <>
      <section className="insights-zone" aria-labelledby="zone-exec">
        <div className="insights-zone-head">
          <h2 id="zone-exec" className="insights-zone-title">
            Executive summary
          </h2>
          <PeriodSelector
            value={execPeriod}
            onChange={setExecPeriod}
            ariaLabel="Executive summary period"
          />
        </div>
        <div className="insights-kpis">
          <Kpi
            label="Fitting room try-ons"
            value={String(metrics.tryOns)}
            hint={PERIOD_HINTS[execPeriod]}
          />
          <Kpi
            label="Conversion rate"
            value={`${metrics.conversionRate}%`}
            hint={`${metrics.conversions} of ${metrics.tryOns} intended to buy`}
            tone="positive"
          />
          <Kpi
            label="Lost revenue"
            value={formatCurrency(metrics.unrealizedRevenue)}
            hint={`${formatCurrency(metrics.realizedRevenue)} realized`}
            tone="negative"
          />
          <Kpi
            label="Primary rejection reason"
            value={driverLabel(metrics.primaryRejection)}
            hint={
              metrics.primaryRejection
                ? `${metrics.primaryRejection.share}% of walk-aways rated it ≤2`
                : 'No walk-aways recorded'
            }
            compact
          />
        </div>
        <p className="insights-footnote">
          Revenue uses catalog list prices; each try-on counts as one potential
          unit.
        </p>

        <TryOnVolumeChart
          rows={rows}
          period={chartPeriod}
          onPeriodChange={setChartPeriod}
        />
      </section>

      <section className="insights-zone" aria-labelledby="zone-cats">
        <h2 id="zone-cats" className="insights-zone-title">
          Browse by category
        </h2>
        <div className="insights-cat-grid">
          {categories.map(({ node, stats }) => (
            <Link
              key={node.id}
              to={catalogHref([node])}
              className="insights-cat-card"
            >
              <span className="insights-cat-tag">apparel type</span>
              <span className="insights-cat-name">{node.label}</span>
              <span className="insights-cat-sub">
                {stats.responses} try-on{stats.responses === 1 ? '' : 's'}
                {stats.responses > 0
                  ? ` · ${stats.purchaseRate}% conversion`
                  : ''}
              </span>
              <span className="insights-cat-cta">Drill down →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="insights-zone" aria-labelledby="zone-sku">
        <h2 id="zone-sku" className="insights-zone-title">
          SKU performance
        </h2>

        <div className="insights-panel insights-panel--wide">
          <div className="insights-panel-head">
            <div>
              <h3 className="insights-panel-title">Top performers</h3>
              <p className="insights-panel-desc">
                Converting at or above the {topSplit.storeConversionRate}% store
                average, ranked by realized revenue.
              </p>
            </div>
            <PeriodSelector
              value={topPeriod}
              onChange={setTopPeriod}
              ariaLabel="Top performers period"
            />
          </div>
          <SkuPerformanceTable kind="top" rows={topSplit.top} />
        </div>

        <div className="insights-panel insights-panel--wide">
          <div className="insights-panel-head">
            <div>
              <h3 className="insights-panel-title">Worst performers</h3>
              <p className="insights-panel-desc">
                Converting below the {worstSplit.storeConversionRate}% store
                average, ranked by unrealized revenue.
              </p>
            </div>
            <PeriodSelector
              value={worstPeriod}
              onChange={setWorstPeriod}
              ariaLabel="Worst performers period"
            />
          </div>
          <SkuPerformanceTable kind="worst" rows={worstSplit.worst} />
        </div>
      </section>
    </>
  );
}
