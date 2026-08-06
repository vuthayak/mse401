import type { AttendantRequest } from '../lib/attendantQueue';
import type { CartItem, FittingRoomCart } from '../lib/carts';
import type { SurveyCInsightRow } from '../lib/fetchSurveyCInsights';

export function makeCartItem(
  overrides: Partial<CartItem> & Pick<CartItem, 'id' | 'variationId'> = {
    id: 'item-1',
    variationId: 'nike-windrunner-black-m',
  },
): CartItem {
  return {
    id: overrides.id,
    variationId: overrides.variationId,
    position: overrides.position ?? 0,
    status: overrides.status ?? 'pending',
    size: overrides.size ?? 'M',
    title: overrides.title ?? 'Nike Windrunner Windbreaker',
    brand: overrides.brand ?? 'Nike',
    colorLabel: overrides.colorLabel ?? 'Black',
    imagePath: overrides.imagePath ?? 'items/nike-windbreaker.png',
    unitPrice: overrides.unitPrice ?? 120,
  };
}

export function makeCart(
  overrides: Partial<FittingRoomCart> = {},
): FittingRoomCart {
  const items =
    overrides.items ??
    [
      makeCartItem({
        id: 'item-1',
        variationId: 'nike-windrunner-black-m',
      }),
    ];
  return {
    id: overrides.id ?? 'cart-1',
    createdAt: overrides.createdAt ?? '2026-07-29T12:00:00.000Z',
    lastActivityAt: overrides.lastActivityAt ?? '2026-07-29T12:00:00.000Z',
    finishedAt: overrides.finishedAt ?? null,
    fittingRoom: overrides.fittingRoom ?? 2,
    sessionToken: overrides.sessionToken ?? 'session-token-abc',
    items,
  };
}

export function makeRequest(
  overrides: Partial<AttendantRequest> = {},
): AttendantRequest {
  return {
    id: overrides.id ?? 'req-1',
    createdAt: overrides.createdAt ?? '2026-07-29T12:00:00.000Z',
    fulfilledAt: overrides.fulfilledAt ?? null,
    fittingRoom: overrides.fittingRoom ?? 2,
    status: overrides.status ?? 'pending',
    size: overrides.size ?? 'L',
    requestKind: overrides.requestKind ?? 'size_swap',
    variationId: overrides.variationId ?? 'nike-windrunner-black-l',
    title: overrides.title ?? 'Nike Windrunner Windbreaker',
    brand: overrides.brand ?? 'Nike',
    colorLabel: overrides.colorLabel ?? 'Black',
    imagePath: overrides.imagePath ?? 'items/nike-windbreaker.png',
    unitPrice: overrides.unitPrice ?? 120,
    sourceSurveyItemId:
      overrides.sourceSurveyItemId ?? 'nike-windrunner-black-m',
    sourceTitle: overrides.sourceTitle ?? 'Nike Windrunner Windbreaker',
  };
}

/** Build one aggregate fact as if returned by get_survey_c_insights_rows(). */
export function makeInsightFact(overrides: {
  selected_item: string;
  created_at: string;
  intent: 'YES' | 'NO';
  fabric: number;
  fit: number;
  colour: number;
  price: number;
  response_count?: number;
}): SurveyCInsightRow {
  const n = overrides.response_count ?? 1;
  const { fabric, fit, colour, price } = overrides;
  return {
    created_at: overrides.created_at,
    selected_item: overrides.selected_item,
    intent: overrides.intent,
    response_count: n,
    sum_fabric: fabric * n,
    sum_fit: fit * n,
    sum_colour: colour * n,
    sum_price: price * n,
    unhappy_fabric: fabric <= 2 ? n : 0,
    unhappy_fit: fit <= 2 ? n : 0,
    unhappy_colour: colour <= 2 ? n : 0,
    unhappy_price: price <= 2 ? n : 0,
    happy_fabric: fabric >= 4 ? n : 0,
    happy_fit: fit >= 4 ? n : 0,
    happy_colour: colour >= 4 ? n : 0,
    happy_price: price >= 4 ? n : 0,
  };
}
