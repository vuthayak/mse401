import { Link } from 'react-router-dom';
import {
  driverLabel,
  formatCurrency,
  suggestedAction,
  type SkuPerformance,
} from '../../lib/storeInsights';

export function SkuPerformanceTable({
  kind,
  rows,
}: {
  kind: 'top' | 'worst';
  rows: SkuPerformance[];
}) {
  const isTop = kind === 'top';

  if (rows.length === 0) {
    return (
      <p className="insights-product-empty">
        No SKUs with responses in this period.
      </p>
    );
  }

  return (
    <div className="insights-table-scroll">
      <table className="insights-table">
        <thead>
          <tr>
            <th scope="col">SKU</th>
            <th scope="col">Category</th>
            <th scope="col" className="insights-table-num">
              Try-ons
            </th>
            <th scope="col" className="insights-table-num">
              Conversion
            </th>
            <th scope="col">{isTop ? 'Top driver' : 'Primary rejection'}</th>
            <th scope="col" className="insights-table-num">
              {isTop ? 'Realized revenue' : 'Unrealized revenue'}
            </th>
            <th scope="col">Suggested action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((perf) => {
            const driver = isTop ? perf.strengthDriver : perf.rejectionReason;
            const revenue = isTop
              ? perf.realizedRevenue
              : perf.unrealizedRevenue;

            return (
              <tr key={perf.node.id}>
                <th scope="row">
                  <Link to={perf.href} className="insights-table-link">
                    {perf.node.label}
                  </Link>
                </th>
                <td className="insights-table-muted">{perf.categoryLabel}</td>
                <td className="insights-table-num">{perf.tryOns}</td>
                <td className="insights-table-num">{perf.conversionRate}%</td>
                <td>
                  <span
                    className={
                      isTop
                        ? 'insights-pill insights-pill--good'
                        : 'insights-pill insights-pill--bad'
                    }
                  >
                    {driverLabel(driver)}
                  </span>
                  {driver ? (
                    <span className="insights-table-sub">
                      {driver.share}% of {isTop ? 'buyers' : 'walk-aways'}
                    </span>
                  ) : null}
                </td>
                <td
                  className={
                    isTop
                      ? 'insights-table-num insights-table-good'
                      : 'insights-table-num insights-table-bad'
                  }
                >
                  {formatCurrency(revenue)}
                </td>
                <td className="insights-table-action">
                  {suggestedAction(driver, kind, perf.tryOns)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
