import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  CATALOG_DEPTH_HEADINGS,
  CATALOG_LEVEL_PLURAL,
  CATALOG_LEVEL_SINGULAR,
  catalogHref,
  itemForVariation,
  leafItemIds,
  resolveCatalogPath,
  type CatalogNode,
} from '../../lib/catalogTaxonomy';
import {
  INSIGHT_ATTRIBUTES,
  type SurveyCInsightRow,
} from '../../lib/fetchSurveyCInsights';
import {
  driverLabel,
  formatCurrency,
  primaryRejectionReason,
  revenueFor,
} from '../../lib/storeInsights';
import {
  ATTRIBUTE_DISPLAY,
  summarizeItemSubset,
  type SubsetStats,
} from '../../lib/surveyCInsights';
import { Kpi } from './Kpi';
import { useInsightsRows } from './InsightsLayout';
import { RatingBar } from './RatingBar';

function rowsForNode(
  rows: SurveyCInsightRow[],
  node: CatalogNode,
): SurveyCInsightRow[] {
  const ids = new Set(leafItemIds(node));
  return rows.filter((row) => ids.has(row.selected_item));
}

function childCountLabel(node: CatalogNode): string {
  const count = node.children.length;
  const level = node.children[0].level;
  const noun =
    count === 1 ? CATALOG_LEVEL_SINGULAR[level] : CATALOG_LEVEL_PLURAL[level];
  return `${count} ${noun}`;
}

function ChildCard({
  node,
  path,
  stats,
}: {
  node: CatalogNode;
  path: CatalogNode[];
  stats: SubsetStats;
}) {
  return (
    <Link to={catalogHref([...path, node])} className="insights-cat-card">
      <span className="insights-cat-tag">
        {CATALOG_LEVEL_SINGULAR[node.level]}
      </span>
      <span className="insights-cat-name">{node.label}</span>
      <span className="insights-cat-sub">
        {childCountLabel(node)} · {stats.responses} try-on
        {stats.responses === 1 ? '' : 's'}
      </span>
      {stats.responses === 0 ? (
        <span className="insights-cat-empty">No data yet</span>
      ) : (
        <>
          <div className="insights-cat-stats">
            <span>
              Conversion <strong>{stats.purchaseRate}%</strong>
            </span>
            <span>
              Avg <strong>{stats.overallMean.toFixed(1)}</strong>
            </span>
          </div>
          <RatingBar value={stats.overallMean} />
        </>
      )}
      <span className="insights-cat-cta">Drill down →</span>
    </Link>
  );
}

function VariationCard({
  node,
  stats,
}: {
  node: CatalogNode;
  stats: SubsetStats;
}) {
  const item = itemForVariation(node);

  return (
    <article className="insights-product">
      <div className="insights-product-media">
        {item ? (
          <img src={item.imageUrl} alt="" className="insights-product-img" />
        ) : null}
      </div>
      <div className="insights-product-body">
        <h3 className="insights-product-title">
          {node.label}
          {node.priceCad ? (
            <span className="insights-product-price">
              {formatCurrency(node.priceCad)}
            </span>
          ) : null}
        </h3>
        <p className="insights-product-meta">
          {item ? `${item.title} · ` : ''}
          {stats.responses} try-on{stats.responses === 1 ? '' : 's'}
          {stats.responses > 0
            ? ` · ${stats.purchaseRate}% conversion`
            : ''}
        </p>
        {stats.responses === 0 ? (
          <p className="insights-product-empty">No data yet</p>
        ) : (
          <ul className="insights-product-attrs">
            {INSIGHT_ATTRIBUTES.map((key) => (
              <li key={key}>
                <span>{ATTRIBUTE_DISPLAY[key]}</span>
                <RatingBar value={stats.attributes[key].mean} />
                <strong>{stats.attributes[key].mean.toFixed(1)}</strong>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function CategoryPage() {
  const rows = useInsightsRows();
  const params = useParams();
  const splat = params['*'] ?? '';

  const path = useMemo(
    () => resolveCatalogPath(splat.split('/').filter(Boolean)),
    [splat],
  );

  const node = path && path.length > 0 ? path[path.length - 1] : null;

  const scoped = useMemo(
    () => (node ? rowsForNode(rows, node) : []),
    [rows, node],
  );

  const stats = useMemo(
    () => (node ? summarizeItemSubset(rows, leafItemIds(node)) : null),
    [rows, node],
  );

  const childStats = useMemo(() => {
    const map = new Map<string, SubsetStats>();
    if (!node) return map;
    for (const child of node.children) {
      map.set(child.id, summarizeItemSubset(rows, leafItemIds(child)));
    }
    return map;
  }, [rows, node]);

  if (!path || !node || !stats) {
    return (
      <div className="insights-banner">
        <strong>Category not found.</strong>{' '}
        <Link to="/insights" className="insights-table-link">
          Back to overview
        </Link>
      </div>
    );
  }

  const revenue = revenueFor(scoped);
  const rejection = primaryRejectionReason(
    scoped.filter((row) => row.intent === 'NO'),
  );
  const showingVariations =
    node.children.length > 0 &&
    node.children.every((child) => child.level === 'variation');

  return (
    <>
      <nav className="insights-crumbs" aria-label="Catalog navigation">
        <Link to="/insights" className="insights-crumb">
          Overview
        </Link>
        {path.map((crumb, i) => {
          const isLast = i === path.length - 1;
          return (
            <span key={crumb.id} className="insights-crumb-group">
              <span className="insights-crumb-sep" aria-hidden="true">
                /
              </span>
              {isLast ? (
                <span className="insights-crumb insights-crumb--current">
                  {crumb.label}
                </span>
              ) : (
                <Link
                  to={catalogHref(path.slice(0, i + 1))}
                  className="insights-crumb"
                >
                  {crumb.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <section className="insights-zone">
        <p className="insights-cat-tag">{CATALOG_LEVEL_SINGULAR[node.level]}</p>
        <h2 className="insights-page-title">{node.label}</h2>
        <div className="insights-kpis">
          <Kpi
            label="Try-ons"
            value={String(stats.responses)}
            hint={
              node.children.length > 0 ? childCountLabel(node) : 'single variation'
            }
          />
          <Kpi
            label="Conversion rate"
            value={`${stats.purchaseRate}%`}
            hint={`${stats.purchaseCount} intended to buy`}
            tone="positive"
          />
          <Kpi
            label="Lost revenue"
            value={formatCurrency(revenue.unrealized)}
            hint={`${formatCurrency(revenue.realized)} realized`}
            tone="negative"
          />
          <Kpi
            label="Primary rejection reason"
            value={driverLabel(rejection)}
            hint={
              rejection
                ? `${rejection.share}% of walk-aways rated it ≤2`
                : 'No walk-aways recorded'
            }
            compact
          />
        </div>
      </section>

      {stats.responses > 0 ? (
        <section className="insights-panel insights-panel--wide">
          <h3 className="insights-panel-title">Attribute health</h3>
          <p className="insights-panel-desc">
            Mean score (1–5) and share of unhappy ratings (≤2) within{' '}
            {node.label}.
          </p>
          <ul className="insights-attr-list">
            {INSIGHT_ATTRIBUTES.map((key) => (
              <li key={key} className="insights-attr-row">
                <div className="insights-attr-meta">
                  <span className="insights-attr-name">
                    {ATTRIBUTE_DISPLAY[key]}
                  </span>
                  <span className="insights-attr-stats">
                    {stats.attributes[key].mean.toFixed(1)} avg ·{' '}
                    {stats.attributes[key].unhappyRate}% unhappy
                  </span>
                </div>
                <RatingBar value={stats.attributes[key].mean} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {node.children.length > 0 ? (
        <section className="insights-panel insights-panel--wide">
          <h3 className="insights-panel-title">
            {CATALOG_DEPTH_HEADINGS[path.length]}
          </h3>
          {showingVariations ? (
            <div className="insights-products">
              {node.children.map((child) => (
                <VariationCard
                  key={child.id}
                  node={child}
                  stats={childStats.get(child.id)!}
                />
              ))}
            </div>
          ) : (
            <div className="insights-cat-grid">
              {node.children.map((child) => (
                <ChildCard
                  key={child.id}
                  node={child}
                  path={path}
                  stats={childStats.get(child.id)!}
                />
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}
