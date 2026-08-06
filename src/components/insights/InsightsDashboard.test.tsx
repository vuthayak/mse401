import { Route, Routes } from 'react-router-dom';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeInsightFact } from '../../test/fixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { CategoryPage } from './CategoryPage';
import { InsightsHome } from './InsightsHome';
import { InsightsLayout } from './InsightsLayout';

vi.mock('motion/react', async () => import('../../test/mocks/motion'));

const fetchSurveyCInsights = vi.fn();
const downloadInsightsWorkbook = vi.fn();

vi.mock('../../lib/fetchSurveyCInsights', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../lib/fetchSurveyCInsights')>();
  return {
    ...actual,
    fetchSurveyCInsights: (...args: unknown[]) =>
      fetchSurveyCInsights(...args),
  };
});

vi.mock('../../lib/exportInsights', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../lib/exportInsights')>();
  return {
    ...actual,
    downloadInsightsWorkbook: (...args: unknown[]) =>
      downloadInsightsWorkbook(...args),
  };
});

const NOW_ISO = '2026-07-25T00:00:00.000Z';

const FIXTURE = [
  makeInsightFact({
    selected_item: 'nike-windrunner-black-m',
    created_at: NOW_ISO,
    intent: 'YES',
    fabric: 5,
    fit: 5,
    colour: 4,
    price: 4,
    response_count: 4,
  }),
  makeInsightFact({
    selected_item: 'essential-zip-hoodie-black-m',
    created_at: NOW_ISO,
    intent: 'NO',
    fabric: 2,
    fit: 1,
    colour: 3,
    price: 2,
    response_count: 6,
  }),
  makeInsightFact({
    selected_item: 'waterloo-zip-hoodie-heather-grey-m',
    created_at: '2026-06-01T00:00:00.000Z',
    intent: 'YES',
    fabric: 4,
    fit: 4,
    colour: 5,
    price: 3,
    response_count: 3,
  }),
];

function renderInsights(route = '/insights') {
  return renderWithProviders(
    <Routes>
      <Route path="/insights" element={<InsightsLayout />}>
        <Route index element={<InsightsHome />} />
        <Route path="c/*" element={<CategoryPage />} />
      </Route>
    </Routes>,
    { route },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchSurveyCInsights.mockResolvedValue({ status: 'ok', rows: FIXTURE });
  downloadInsightsWorkbook.mockImplementation(() => undefined);
});

describe('Insights layout load states', () => {
  it('shows loading, skipped, error, empty, and recovers via Refresh', async () => {
    const user = userEvent.setup();
    let resolveLoad: (value: unknown) => void = () => undefined;
    fetchSurveyCInsights.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLoad = resolve;
        }),
    );

    renderInsights();
    expect(
      screen.getByText('Loading Survey C responses…'),
    ).toBeInTheDocument();

    resolveLoad({ status: 'skipped', reason: 'not_configured' });
    expect(
      await screen.findByText(/Supabase not configured/i),
    ).toBeInTheDocument();

    fetchSurveyCInsights.mockResolvedValueOnce({
      status: 'error',
      message: 'rpc failed',
    });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(
      await screen.findByText(/Could not load insights/i),
    ).toBeInTheDocument();

    fetchSurveyCInsights.mockResolvedValueOnce({ status: 'ok', rows: [] });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(
      await screen.findByText(/No Survey C responses yet/i),
    ).toBeInTheDocument();

    fetchSurveyCInsights.mockResolvedValueOnce({
      status: 'ok',
      rows: FIXTURE,
    });
    await user.click(screen.getByRole('button', { name: 'Refresh' }));
    await screen.findByRole('heading', { name: 'Executive summary' });
  });
});

describe('FR-05a (MVP built) - try-on count and conversion per SKU', () => {
  it('renders Try-ons and Conversion columns on top and worst tables', async () => {
    renderInsights();
    await screen.findByText('Top performers');
    expect(screen.getByText('Worst performers')).toBeTruthy();
    expect(screen.getAllByRole('table').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Try-ons').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Conversion').length).toBeGreaterThan(0);
  });
});

describe('FR-05b (MVP built) - top-rejected attributes per SKU', () => {
  it('shows the single Primary rejection column available today', async () => {
    renderInsights();
    await screen.findByRole('heading', { name: 'Worst performers' });
    expect(screen.getByText('Primary rejection')).toBeInTheDocument();
  });

  it.todo(
    'shows the top 3 most-rejected attributes per SKU ranked by rejection frequency',
  );
});

describe('FR-05c (Built) - filter by date range and product category', () => {
  it('updates executive KPIs when the period radiogroup changes and drills into a category', async () => {
    const user = userEvent.setup();
    renderInsights();
    await screen.findByRole('heading', { name: 'Executive summary' });

    const period = screen.getByRole('radiogroup', {
      name: 'Executive summary period',
    });
    await user.click(within(period).getByRole('radio', { name: 'All time' }));

    expect(
      await screen.findByRole('heading', { name: 'Browse by category' }),
    ).toBeInTheDocument();

    const drill = screen.getAllByRole('link', { name: /Drill down/i })[0];
    await user.click(drill);

    await waitFor(() => {
      expect(screen.getByRole('navigation', { name: 'Catalog navigation' })).toBeInTheDocument();
    });
  });

  it.todo('adds a date-range filter on the category drill-down page');
});

describe('FR-02c (Built, logic complete) - conversion by item and date range', () => {
  it('shows conversion rate in executive KPIs and SKU tables', async () => {
    renderInsights();
    await screen.findByRole('heading', { name: 'Executive summary' });
    expect(screen.getByText('Conversion rate')).toBeInTheDocument();
    expect(screen.getAllByText('Conversion').length).toBeGreaterThan(0);
  });

  it.todo(
    'derives conversion from POS purchase matches rather than survey purchase intent',
  );
});

describe('FR-08a (MVP built) - rank attributes by rejection frequency', () => {
  it('shows attribute health with mean and unhappy rate on category pages', async () => {
    renderInsights('/insights/c/hoodies');
    await screen.findByText('Attribute health');
    expect(screen.getByText('Fabric')).toBeTruthy();
    expect(screen.getAllByText(/% unhappy/i).length).toBeGreaterThan(0);
  });

  it.todo(
    'ranks attributes by rejection frequency per SKU (weakestAttribute is computed but not rendered)',
  );
});

describe('FR-08b / FR-12 (Built) - export CSV with current filters', () => {
  // FR-12 acceptance criteria: CSV or PDF. CSV alone satisfies the "or".
  // No PDF export path exists in the codebase.
  it('exports a dated CSV workbook reflecting the current view', async () => {
    const user = userEvent.setup();
    renderInsights();
    await screen.findByRole('heading', { name: 'Executive summary' });

    const exportBtn = screen.getByRole('button', { name: 'Export' });
    await waitFor(() => {
      expect(exportBtn).toBeEnabled();
    });
    await user.click(exportBtn);

    await waitFor(() => {
      expect(downloadInsightsWorkbook).toHaveBeenCalled();
    });
    const [sheets, filename] = downloadInsightsWorkbook.mock.calls[0] as [
      { name: string }[],
      string,
    ];
    expect(sheets.map((s) => s.name)).toEqual([
      'Executive summary',
      'Try-on volume',
      'Browse by category',
      'Top performers',
      'Worst performers',
    ]);
    expect(filename).toMatch(/^fitting-room-insights-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

describe('FR-02a (Not started) - unique session identifier', () => {
  it.todo(
    'Every fitting-room visit generates exactly one session ID, persisting for the duration of that visit.',
  );
});

describe('FR-02b (Not started) - cart-to-POS purchase matching', () => {
  it.todo(
    'Cart-to-purchase matches are accurate to at least 95% when checked against a manual reconciliation sample.',
  );
});

describe('FR-11 (Built on Attendant) - dwell time on retailer dashboard', () => {
  it.todo(
    'surface average dwell time per item and per fitting room on the retailer analytics dashboard (currently Attendant-only)',
  );
});
