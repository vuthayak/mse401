import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeCart, makeCartItem, makeRequest } from '../../test/fixtures';
import { renderWithProviders } from '../../test/renderWithProviders';
import { AttendantScreen } from './AttendantScreen';

vi.mock('motion/react', async () => {
  return import('../../test/mocks/motion');
});

const fetchRoomRequests = vi.fn();
const setRequestStatus = vi.fn();
const subscribeToRequests = vi.fn();
const fetchRoomCarts = vi.fn();
const clearRoomCart = vi.fn();
const assignCart = vi.fn();
const subscribeToCarts = vi.fn();
const fetchCatalogItems = vi.fn();
const fetchDwellStats = vi.fn();

vi.mock('../../lib/attendantQueue', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/attendantQueue')>();
  return {
    ...actual,
    fetchRoomRequests: (...args: unknown[]) => fetchRoomRequests(...args),
    setRequestStatus: (...args: unknown[]) => setRequestStatus(...args),
    subscribeToRequests: (...args: unknown[]) => subscribeToRequests(...args),
  };
});

vi.mock('../../lib/carts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/carts')>();
  return {
    ...actual,
    fetchRoomCarts: (...args: unknown[]) => fetchRoomCarts(...args),
    clearRoomCart: (...args: unknown[]) => clearRoomCart(...args),
    assignCart: (...args: unknown[]) => assignCart(...args),
    subscribeToCarts: (...args: unknown[]) => subscribeToCarts(...args),
  };
});

vi.mock('../../lib/catalogItems', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/catalogItems')>();
  return {
    ...actual,
    fetchCatalogItems: (...args: unknown[]) => fetchCatalogItems(...args),
  };
});

vi.mock('../../lib/dwellTime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/dwellTime')>();
  return {
    ...actual,
    fetchDwellStats: (...args: unknown[]) => fetchDwellStats(...args),
  };
});

function emptySubscribe() {
  return { unsubscribe: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  subscribeToRequests.mockReturnValue(emptySubscribe());
  subscribeToCarts.mockReturnValue(emptySubscribe());
  fetchRoomRequests.mockResolvedValue({ status: 'ok', requests: [] });
  fetchRoomCarts.mockResolvedValue({ status: 'ok', carts: [] });
  fetchDwellStats.mockResolvedValue({
    status: 'ok',
    index: { byRoom: new Map(), byItem: new Map() },
  });
  fetchCatalogItems.mockResolvedValue({ status: 'ok', colourways: [] });
  setRequestStatus.mockResolvedValue({ status: 'saved', recordId: 'req-1' });
  clearRoomCart.mockResolvedValue({ status: 'saved', recordId: '2' });
  assignCart.mockResolvedValue({ status: 'saved', recordId: 'cart-new' });
});

describe('FR-03 (Almost complete) - scan items into room cart', () => {
  it('assigns staged catalog items to the selected room via assignCart', async () => {
    const user = userEvent.setup();
    fetchCatalogItems.mockResolvedValue({
      status: 'ok',
      colourways: [
        {
          key: 'nike-windrunner::black',
          styleId: 'nike-windrunner',
          title: 'Nike Windrunner Windbreaker',
          brand: 'Nike',
          apparelType: 'Jackets',
          designType: 'Windbreakers',
          colorId: 'black',
          colorLabel: 'Black',
          imagePath: 'items/nike-windbreaker.png',
          unitPrice: 120,
          sizes: [
            {
              variationId: 'nike-windrunner-black-m',
              styleId: 'nike-windrunner',
              title: 'Nike Windrunner Windbreaker',
              brand: 'Nike',
              apparelType: 'Jackets',
              designType: 'Windbreakers',
              colorId: 'black',
              colorLabel: 'Black',
              size: 'M',
              sizeOrder: 3,
              isDefault: true,
              imagePath: 'items/nike-windbreaker.png',
              unitPrice: 120,
              quantity: 4,
            },
          ],
        },
      ],
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    await user.click(await screen.findByRole('button', { name: /Check in \(dev\)/i }));
    await screen.findByPlaceholderText(/Search title, brand, color/i);

    const sizeGroup = await screen.findByRole('radiogroup', {
      name: /Sizes for Nike Windrunner Windbreaker/i,
    });
    await user.click(within(sizeGroup).getByRole('radio', { name: 'M' }));
    await user.click(screen.getByRole('button', { name: 'Add' }));
    await user.click(
      await screen.findByRole('button', { name: /Assign to room 2/i }),
    );

    await waitFor(() => {
      expect(assignCart).toHaveBeenCalledWith(
        expect.objectContaining({
          fittingRoom: 2,
          variationIds: ['nike-windrunner-black-m'],
        }),
      );
    });
  });

  it.todo(
    'accepts real barcode-scanner input instead of the Check in (dev) catalog picker',
  );
});

describe('FR-06 (Built) - manual end session and idle timeout', () => {
  it('clears a room cart and announces success', async () => {
    const user = userEvent.setup();
    const cart = makeCart({
      fittingRoom: 2,
      lastActivityAt: new Date().toISOString(),
    });
    fetchRoomCarts.mockResolvedValue({ status: 'ok', carts: [cart] });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    expect(
      await screen.findByRole('article', { name: /Room 2 cart/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/expires in/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Clear room' }));

    await waitFor(() => {
      expect(clearRoomCart).toHaveBeenCalledWith(2);
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Cleared cart for fitting room 2.',
      );
    });
  });

  it('rolls back and announces when clear fails', async () => {
    const user = userEvent.setup();
    const cart = makeCart({ fittingRoom: 3 });
    fetchRoomCarts.mockResolvedValue({ status: 'ok', carts: [cart] });
    clearRoomCart.mockResolvedValue({
      status: 'error',
      message: 'network down',
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });
    await screen.findByRole('article', { name: /Room 3 cart/i });
    await user.click(screen.getByRole('button', { name: 'Clear room' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Could not clear room 3. Try again.',
      );
    });
    expect(
      screen.getByRole('article', { name: /Room 3 cart/i }),
    ).toBeInTheDocument();
  });
});

describe('FR-07 (Almost complete) - size request notifies attendant', () => {
  it('renders a pending size_swap request and lets the attendant deliver it', async () => {
    const user = userEvent.setup();
    const request = makeRequest({
      id: 'req-size',
      requestKind: 'size_swap',
      fittingRoom: 4,
      size: 'L',
      title: 'Nike Windrunner Windbreaker',
      status: 'pending',
    });
    fetchRoomRequests.mockResolvedValue({ status: 'ok', requests: [request] });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    expect(await screen.findByText('Size swap')).toBeInTheDocument();
    expect(
      screen.getByRole('listitem', {
        name: /Nike Windrunner Windbreaker, size L, fitting room 4/i,
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delivered' }));
    await waitFor(() => {
      expect(setRequestStatus).toHaveBeenCalledWith('req-size', 'fulfilled');
    });
    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /Delivered Nike Windrunner Windbreaker to fitting room 4/i,
      );
    });
  });

  it.todo(
    'shows an on-screen confirmation to the shopper once the attendant acknowledges the size request',
  );
});

describe('FR-09 (Almost complete) - live occupancy status', () => {
  it('marks occupied rooms and filters carts by selected room tab', async () => {
    const user = userEvent.setup();
    fetchRoomCarts.mockResolvedValue({
      status: 'ok',
      carts: [
        makeCart({ id: 'c2', fittingRoom: 2 }),
        makeCart({
          id: 'c4',
          fittingRoom: 4,
          items: [
            makeCartItem({
              id: 'i4',
              variationId: 'essential-zip-hoodie-black-m',
              title: 'Essential Full-Zip Hoodie',
            }),
          ],
        }),
      ],
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    const tablist = await screen.findByRole('tablist', {
      name: 'Fitting rooms',
    });
    expect(within(tablist).getAllByLabelText(/cart item/i).length).toBeGreaterThan(
      0,
    );

    const room4 = within(tablist)
      .getAllByRole('tab')
      .find((tab) => tab.querySelector('.attendant-room-tile-num')?.textContent === '4');
    expect(room4).toBeTruthy();
    await user.click(room4!);
    await waitFor(() => {
      expect(
        screen.queryByRole('article', { name: /Room 2 cart/i }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole('article', { name: /Room 4 cart/i }),
      ).toBeInTheDocument();
    });
  });

  it.todo(
    'labels each room Occupied/Available explicitly and updates within 10 seconds of a state change',
  );
});

describe('FR-11 (Built) - average dwell time per item and room', () => {
  it('renders room and item averages flagged against the 5m45s benchmark', async () => {
    const cart = makeCart({
      fittingRoom: 2,
      items: [
        makeCartItem({
          id: 'item-1',
          variationId: 'nike-windrunner-black-m',
        }),
      ],
    });
    fetchRoomCarts.mockResolvedValue({ status: 'ok', carts: [cart] });
    fetchDwellStats.mockResolvedValue({
      status: 'ok',
      index: {
        byRoom: new Map([
          [2, { averageMs: 345_000, sessionCount: 4, flag: 'benchmark' }],
        ]),
        byItem: new Map([
          [
            'nike-windrunner-black-m',
            { averageMs: 200_000, sessionCount: 3, flag: 'quick' },
          ],
        ]),
      },
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    const card = await screen.findByRole('article', { name: /Room 2 cart/i });
    expect(card).toHaveTextContent(/avg 5m 45s/i);
    expect(card).toHaveTextContent(/On pace/i);
    expect(
      screen.getByLabelText(/Average dwell for Nike Windrunner Windbreaker/i),
    ).toHaveTextContent(/avg 3m 20s/i);
  });

  it('renders an em dash when dwell history is missing and still shows carts on dwell error', async () => {
    fetchRoomCarts.mockResolvedValue({
      status: 'ok',
      carts: [makeCart({ fittingRoom: 1 })],
    });
    fetchDwellStats.mockResolvedValue({
      status: 'error',
      message: 'dwell rpc down',
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    const card = await screen.findByRole('article', { name: /Room 1 cart/i });
    expect(card).toHaveTextContent(/avg —/);
  });
});

describe('NFR-01 (Built) - anonymous session data', () => {
  it('does not render session tokens or PII in the attendant view', async () => {
    fetchRoomCarts.mockResolvedValue({
      status: 'ok',
      carts: [makeCart({ sessionToken: 'secret-session-token-xyz' })],
    });
    fetchRoomRequests.mockResolvedValue({
      status: 'ok',
      requests: [makeRequest()],
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });
    await screen.findByRole('heading', { name: 'Fitting Room Attendant' });
    expect(screen.queryByText(/secret-session-token-xyz/)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/@|ssn|email/i);
  });
});

describe('NFR-04 (Built) - WCAG 2.1 AA interactive affordances', () => {
  it('exposes skip link, live region, and room tablist semantics', async () => {
    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    const skip = await screen.findByRole('link', {
      name: 'Skip to main content',
    });
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toBeTruthy();

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');

    const tablist = screen.getByRole('tablist', { name: 'Fitting rooms' });
    const allTab = within(tablist).getByRole('tab', { name: /All/i });
    expect(allTab).toHaveAttribute('aria-selected', 'true');
  });
});

describe('NFR-07 (Almost complete) - preserve data through brief interruptions', () => {
  it('shows Retry on request load errors and recovers', async () => {
    const user = userEvent.setup();
    fetchRoomRequests
      .mockResolvedValueOnce({ status: 'error', message: 'Could not load requests' })
      .mockResolvedValueOnce({
        status: 'ok',
        requests: [makeRequest({ id: 'recovered' })],
      });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Could not load requests/i,
    );
    await user.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => {
      expect(screen.getByText('Size swap')).toBeInTheDocument();
    });
  });

  it('rolls a request card back when setRequestStatus fails', async () => {
    const user = userEvent.setup();
    fetchRoomRequests.mockResolvedValue({
      status: 'ok',
      requests: [makeRequest({ id: 'req-fail', status: 'pending' })],
    });
    setRequestStatus.mockResolvedValue({
      status: 'error',
      message: 'write failed',
    });

    renderWithProviders(<AttendantScreen />, { route: '/attendant' });
    await screen.findByRole('button', { name: 'Delivered' });
    await user.click(screen.getByRole('button', { name: 'Delivered' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        /Could not update .* Try again/i,
      );
    });
    expect(screen.getByRole('button', { name: 'Delivered' })).toBeInTheDocument();
  });

  it.todo('queues failed writes for replay after reconnect (durable offline queue)');
});
