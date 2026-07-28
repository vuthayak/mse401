import { createContext, useContext, useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import {
  fetchSurveyCInsights,
  type SurveyCInsightRow,
} from '../../lib/fetchSurveyCInsights';
import {
  InsightsExportProvider,
  useInsightsExport,
} from './InsightsExportContext';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; rows: SurveyCInsightRow[] }
  | { status: 'empty' }
  | { status: 'skipped' }
  | { status: 'error'; message: string };

const RowsContext = createContext<SurveyCInsightRow[]>([]);

/** Survey C rows for the current dashboard session. */
export function useInsightsRows(): SurveyCInsightRow[] {
  return useContext(RowsContext);
}

export function InsightsLayout() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: 'loading' });
      const outcome = await fetchSurveyCInsights();
      if (cancelled) return;

      if (outcome.status === 'skipped') {
        setState({ status: 'skipped' });
        return;
      }
      if (outcome.status === 'error') {
        setState({ status: 'error', message: outcome.message });
        return;
      }
      if (outcome.rows.length === 0) {
        setState({ status: 'empty' });
        return;
      }
      setState({ status: 'ready', rows: outcome.rows });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const ready = state.status === 'ready';

  return (
    <MotionConfig reducedMotion="user">
      <InsightsExportProvider>
        <div className="app-shell insights-shell">
          <header className="insights-header">
            <div className="insights-header-inner">
              <div className="insights-header-text">
                <p className="insights-eyebrow">Retailer insights</p>
                <Link to="/insights" className="insights-title-link">
                  <h1 className="insights-title">Fitting Room Intelligence</h1>
                </Link>
                <p className="insights-subtitle">
                  Try-on behaviour, conversion, and lost revenue across the
                  catalog.
                </p>
              </div>
              <div className="insights-header-actions">
                <InsightsExportButton enabled={ready} />
                <button
                  type="button"
                  className="insights-refresh"
                  onClick={() => setRefreshKey((k) => k + 1)}
                  disabled={state.status === 'loading'}
                >
                  Refresh
                </button>
                <Link to="/" className="insights-back">
                  ← Surveys
                </Link>
              </div>
            </div>
          </header>

          <main className="insights-main">
            {state.status === 'loading' ? (
              <p className="insights-status">Loading Survey C responses…</p>
            ) : null}

            {state.status === 'skipped' ? (
              <div className="insights-banner insights-banner--warn">
                <strong>Supabase not configured.</strong> Add{' '}
                <code>VITE_SUPABASE_URL</code> and{' '}
                <code>VITE_SUPABASE_ANON_KEY</code> to <code>.env.local</code>,
                then run <code>supabase/add-survey-c-insights-rpc.sql</code>.
              </div>
            ) : null}

            {state.status === 'error' ? (
              <div className="insights-banner insights-banner--error">
                <strong>Could not load insights.</strong> {state.message}
                <p className="insights-banner-hint">
                  If the table exists but reads fail, run{' '}
                  <code>supabase/add-survey-c-insights-rpc.sql</code> in the SQL
                  Editor.
                </p>
              </div>
            ) : null}

            {state.status === 'empty' ? (
              <div className="insights-banner">
                No Survey C responses yet. Complete a survey or run the seed
                SQL.
              </div>
            ) : null}

            {state.status === 'ready' ? (
              <RowsContext.Provider value={state.rows}>
                <Outlet />
              </RowsContext.Provider>
            ) : null}
          </main>

          <footer className="privacy-footer">
            Anonymous fitting-room feedback — no personal data
          </footer>
        </div>
      </InsightsExportProvider>
    </MotionConfig>
  );
}

function InsightsExportButton({ enabled }: { enabled: boolean }) {
  const { canExport, runExport } = useInsightsExport();
  return (
    <button
      type="button"
      className="insights-refresh"
      onClick={runExport}
      disabled={!enabled || !canExport}
    >
      Export
    </button>
  );
}
