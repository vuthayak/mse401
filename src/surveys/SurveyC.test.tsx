import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCart, makeCartItem } from '../test/fixtures';
import { renderWithProviders } from '../test/renderWithProviders';
import { SurveyC } from './SurveyC';

vi.mock('motion/react', async () => import('../test/mocks/motion'));

const cartHook = {
  cart: makeCart({
    sessionToken: 'anon-session-token',
    items: [
      makeCartItem({
        id: 'cart-item-1',
        variationId: 'nike-windrunner-black-m',
        title: 'Nike Windrunner Windbreaker',
        status: 'pending',
      }),
    ],
  }),
  status: 'ready' as const,
  error: null as string | null,
  reload: vi.fn(),
  markItemStatus: vi.fn(async () => undefined),
  finish: vi.fn(async () => true),
  touchActivity: vi.fn(),
};

vi.mock('../lib/useFittingRoomCart', () => ({
  useFittingRoomCart: () => cartHook,
}));

const persistSurveyCResponse = vi.fn();
const fetchRecommendations = vi.fn();
const fetchSizeOptions = vi.fn();
const persistItemRequest = vi.fn();
const isOnline = vi.fn(() => true);

vi.mock('../lib/persistSurvey', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/persistSurvey')>();
  return {
    ...actual,
    persistSurveyCResponse: (...args: unknown[]) =>
      persistSurveyCResponse(...args),
  };
});

vi.mock('../lib/recommendItem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/recommendItem')>();
  return {
    ...actual,
    fetchRecommendations: (...args: unknown[]) => fetchRecommendations(...args),
  };
});

vi.mock('../lib/fetchSizeOptions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/fetchSizeOptions')>();
  return {
    ...actual,
    fetchSizeOptions: (...args: unknown[]) => fetchSizeOptions(...args),
  };
});

vi.mock('../lib/itemRequests', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/itemRequests')>();
  return {
    ...actual,
    persistItemRequest: (...args: unknown[]) => persistItemRequest(...args),
  };
});

vi.mock('../lib/withRetry', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/withRetry')>();
  return {
    ...actual,
    isOnline: () => isOnline(),
  };
});

const recommendationResult = {
  currentItem: {
    itemId: 'nike-windrunner-black-m',
    title: 'Nike Windrunner Windbreaker',
    brand: 'Nike',
    size: 'M',
    price: 120,
    imagePath: 'items/nike-windbreaker.png',
  },
  items: [
    {
      itemId: 'essential-zip-hoodie-black-m',
      styleId: 'essential-zip-hoodie',
      title: 'Essential Full-Zip Hoodie',
      brand: 'Uniqlo',
      size: 'M',
      colorLabel: 'Black',
      materialLabel: 'Fleece',
      apparelType: 'Hoodies',
      price: 59,
      imagePath: 'items/black-zip-hoodie.png',
      reasons: ['Similar fit'],
      matchedRules: [],
      inStock: 3,
    },
    {
      itemId: 'waterloo-zip-hoodie-heather-grey-m',
      styleId: 'waterloo-zip-hoodie',
      title: 'University of Waterloo Zip Hoodie',
      brand: 'UW',
      size: 'M',
      colorLabel: 'Heather Grey',
      materialLabel: 'Fleece',
      apparelType: 'Hoodies',
      price: 70,
      imagePath: 'items/waterloo-hoodie.png',
      reasons: ['Campus favourite'],
      matchedRules: [],
      inStock: 2,
    },
    {
      itemId: 'adidas-santiago-track-colourblock-navy-m',
      styleId: 'adidas-santiago-track',
      title: 'Adidas Santiago Track Jacket',
      brand: 'Adidas',
      size: 'M',
      colorLabel: 'Navy',
      materialLabel: 'Polyester',
      apparelType: 'Jackets',
      price: 90,
      imagePath: 'items/adidas-track-jacket.png',
      reasons: ['Similar layering'],
      matchedRules: [],
      inStock: 1,
    },
  ],
  strategy: 'heuristic' as const,
  latencyMs: 12,
};

async function acknowledgePrivacy(
  user: ReturnType<typeof userEvent.setup>,
) {
  await user.click(
    screen.getByLabelText(
      /I understand this survey collects anonymous product feedback only/i,
    ),
  );
  await user.click(screen.getByRole('button', { name: 'Continue to survey' }));
  expect(await screen.findByText('Your items')).toBeInTheDocument();
}

async function rateAllAxes(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Fabric: love it' }));
  await user.click(screen.getByRole('button', { name: 'Fit: just right' }));
  await user.click(
    screen.getByRole('button', { name: 'Colour: love the colour' }),
  );
  await user.click(screen.getByRole('button', { name: 'Price: great value' }));
}

async function selectItemAndRate(
  user: ReturnType<typeof userEvent.setup>,
) {
  await acknowledgePrivacy(user);
  await user.click(
    screen.getByRole('button', { name: /Nike Windrunner Windbreaker/i }),
  );
  expect(
    await screen.findByText('Rate each attribute for this product'),
  ).toBeInTheDocument();
  await rateAllAxes(user);
  await user.click(screen.getByRole('button', { name: 'Continue' }));
  expect(await screen.findByText('Your Decision')).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  cartHook.cart = makeCart({
    sessionToken: 'anon-session-token',
    items: [
      makeCartItem({
        id: 'cart-item-1',
        variationId: 'nike-windrunner-black-m',
        title: 'Nike Windrunner Windbreaker',
        status: 'pending',
      }),
    ],
  });
  cartHook.status = 'ready';
  cartHook.error = null;
  cartHook.finish.mockResolvedValue(true);
  cartHook.markItemStatus.mockResolvedValue(undefined);
  isOnline.mockReturnValue(true);
  persistSurveyCResponse.mockResolvedValue({
    status: 'saved',
    recordId: 'resp-1',
  });
  fetchRecommendations.mockResolvedValue({
    status: 'ok',
    result: recommendationResult,
  });
  fetchSizeOptions.mockResolvedValue({
    status: 'ok',
    options: [
      {
        variationId: 'nike-windrunner-black-s',
        size: 'S',
        sizeOrder: 2,
        unitPrice: 120,
        imagePath: 'items/nike-windbreaker.png',
        title: 'Nike Windrunner Windbreaker',
        brand: 'Nike',
        colorLabel: 'Black',
        isTriedOn: false,
        quantity: 2,
      },
      {
        variationId: 'nike-windrunner-black-m',
        size: 'M',
        sizeOrder: 3,
        unitPrice: 120,
        imagePath: 'items/nike-windbreaker.png',
        title: 'Nike Windrunner Windbreaker',
        brand: 'Nike',
        colorLabel: 'Black',
        isTriedOn: true,
        quantity: 4,
      },
      {
        variationId: 'nike-windrunner-black-xl',
        size: 'XL',
        sizeOrder: 5,
        unitPrice: 120,
        imagePath: 'items/nike-windbreaker.png',
        title: 'Nike Windrunner Windbreaker',
        brand: 'Nike',
        colorLabel: 'Black',
        isTriedOn: false,
        quantity: 0,
      },
    ],
  });
  persistItemRequest.mockResolvedValue({ status: 'saved', recordId: 'req-1' });
});

describe('NFR-01 (Built) - privacy gate and anonymous session', () => {
  it('blocks the survey until the privacy notice is acknowledged', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });

    expect(
      screen.getByRole('heading', { name: 'Fitting Room Survey' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Your items')).not.toBeInTheDocument();

    await acknowledgePrivacy(user);
    expect(screen.getByText('Your items')).toBeInTheDocument();
    expect(
      screen.getByText('Anonymous session — no personal data collected'),
    ).toBeInTheDocument();
  });
});

describe('FR-04a (Survey MVP built) - rate item attributes', () => {
  it('requires fabric, fit, colour, and price before Continue is enabled', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await acknowledgePrivacy(user);
    await user.click(
      screen.getByRole('button', { name: /Nike Windrunner Windbreaker/i }),
    );

    const continueBtn = await screen.findByRole('button', { name: 'Continue' });
    expect(continueBtn).toBeDisabled();
    expect(screen.getByText(/Rate Fabric/i)).toBeInTheDocument();

    await rateAllAxes(user);
    expect(continueBtn).toBeEnabled();
    expect(
      screen.getByText(/All attributes rated\. Continue to your purchase decision/i),
    ).toBeInTheDocument();
  });
});

describe('FR-04b (Survey MVP built) - capture purchase intent', () => {
  it('persists ratings and YES intent together', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);

    await user.click(
      screen.getByRole('button', { name: 'I plan on purchasing' }),
    );

    await waitFor(() => {
      expect(persistSurveyCResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          fabric: 5,
          fit: 3,
          colour: 5,
          price: 5,
          intent: 'YES',
          selected_item: 'nike-windrunner-black-m',
        }),
      );
    });
  });
});

describe('FR-01a (Built) - dislike/rejection triggers recommendations', () => {
  it('loads recommendations after a NO purchase intent', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);

    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalled();
    });
    expect(
      await screen.findByText(/We found something you might like/i),
    ).toBeInTheDocument();
  });
});

describe('FR-01b (MVP built) - up to 3 recommendations', () => {
  it('requests recommendations with the default limit of 3 and renders at most 3 cards', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);
    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    await waitFor(() => {
      expect(fetchRecommendations).toHaveBeenCalled();
    });
    const call = fetchRecommendations.mock.calls[0]?.[0] as {
      limit?: number;
    };
    expect(call.limit === undefined || call.limit === 3).toBe(true);
    expect(await screen.findByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
    expect(screen.getByText('Option 3')).toBeInTheDocument();
    expect(screen.queryByText('Option 4')).not.toBeInTheDocument();
  });
});

describe('FR-01c (Almost complete) - in-stock recommendations only', () => {
  it('shows in-stock counts on cards and the empty in-stock message', async () => {
    const user = userEvent.setup();
    fetchRecommendations.mockResolvedValueOnce({
      status: 'ok',
      result: { ...recommendationResult, items: [] },
    });
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);
    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    expect(
      await screen.findByText(
        /Nothing comparable is in stock at this store right now/i,
      ),
    ).toBeInTheDocument();
  });

  it('shows stock counts when alternatives are returned', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);
    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    expect(await screen.findByText(/3 in stock now/i)).toBeInTheDocument();
  });

  it.todo(
    'verifies server-side filtering against live inventory rather than mock stock counts',
  );
});

describe('FR-01d (MVP built) - display recommendations on tablet', () => {
  it('shows the recommendation screen after the intent tap with no further shopper action', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);
    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    expect(
      await screen.findByText(/We found something you might like/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', { name: 'Survey progress' }),
    ).toHaveAttribute('aria-valuenow', '3');
  });
});

describe('FR-06 (Built) - end session from tablet', () => {
  it('finishes the cart and shows the visit-complete screen', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await acknowledgePrivacy(user);

    await user.click(screen.getByRole('button', { name: "I'm done" }));
    await waitFor(() => {
      expect(cartHook.finish).toHaveBeenCalled();
    });
    expect(
      await screen.findByRole('heading', { name: 'Thanks for visiting' }),
    ).toBeInTheDocument();
  });
});

describe('FR-07 (Almost complete) - request a different size', () => {
  it('persists a size_swap request and blocks out-of-stock sizes', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);
    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    expect(
      await screen.findByRole('heading', { name: 'Need a different size?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Size XL, out of stock'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /Request size S of Nike Windrunner Windbreaker/i,
      }),
    );

    await waitFor(() => {
      expect(persistItemRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          requestKind: 'size_swap',
          size: 'S',
          variationId: 'nike-windrunner-black-s',
        }),
      );
    });
  });

  it.todo(
    'shows an on-screen confirmation once the attendant acknowledges the size request',
  );
});

describe('NFR-04 (Built) - accessible survey controls', () => {
  it('exposes progressbar and aria-pressed scale options', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await acknowledgePrivacy(user);
    await user.click(
      screen.getByRole('button', { name: /Nike Windrunner Windbreaker/i }),
    );

    const progress = await screen.findByRole('progressbar', {
      name: 'Survey progress',
    });
    expect(progress).toHaveAttribute('aria-valuenow', '1');

    const fabric = screen.getByRole('button', { name: 'Fabric: love it' });
    expect(fabric).toHaveAttribute('aria-pressed', 'false');
    await user.click(fabric);
    expect(fabric).toHaveAttribute('aria-pressed', 'true');

    const continueBtn = screen.getByRole('button', { name: 'Continue' });
    expect(continueBtn).toHaveAttribute('aria-describedby');
  });
});

describe('NFR-07 (Almost complete) - preserve ratings through interruptions', () => {
  it('disables retry while offline and recovers on retry after a failed save', async () => {
    const user = userEvent.setup();
    persistSurveyCResponse
      .mockResolvedValueOnce({ status: 'error', message: 'network down' })
      .mockResolvedValueOnce({ status: 'saved', recordId: 'resp-2' });

    renderWithProviders(<SurveyC />, { route: '/survey-c' });
    await selectItemAndRate(user);

    await user.click(
      screen.getByRole('button', {
        name: 'I plan on not purchasing, give me recommendations',
      }),
    );

    expect(
      await screen.findByText(/Could not save to database/i),
    ).toBeInTheDocument();

    isOnline.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Waiting for network…' }),
      ).toBeDisabled();
    });

    isOnline.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));

    const retry = await screen.findByRole('button', { name: 'Retry save' });
    expect(retry).toBeEnabled();
    await user.click(retry);

    await waitFor(() => {
      expect(persistSurveyCResponse).toHaveBeenCalledTimes(2);
    });
  });

  it.todo('persists unfinished ratings durably across a full page reload offline');
});

describe('NFR-02 (Not started) - tablet interactivity within 3 seconds', () => {
  it.todo(
    'The tablet UI is fully interactive within 3 seconds on a 10 Mbps connection, confirmed across repeated test runs.',
  );
});
