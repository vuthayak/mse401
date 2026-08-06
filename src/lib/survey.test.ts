import { describe, expect, it } from 'vitest';
import { makeCartItem } from '../test/fixtures';
import {
  cartItemToTryOnItem,
  isBinaryRatingsComplete,
  isScaleRatingsComplete,
} from '../types/survey';

describe('isScaleRatingsComplete', () => {
  it('requires all four attribute ratings', () => {
    expect(isScaleRatingsComplete({})).toBe(false);
    expect(
      isScaleRatingsComplete({ fabric: 3, fit: 3, colour: 3 }),
    ).toBe(false);
    expect(
      isScaleRatingsComplete({ fabric: 3, fit: 3, colour: 3, price: 3 }),
    ).toBe(true);
  });
});

describe('isBinaryRatingsComplete', () => {
  it('requires all four boolean ratings', () => {
    expect(isBinaryRatingsComplete({ fabric: true, fit: false })).toBe(false);
    expect(
      isBinaryRatingsComplete({
        fabric: true,
        fit: false,
        colour: true,
        price: false,
      }),
    ).toBe(true);
  });
});

describe('cartItemToTryOnItem', () => {
  it('maps cart fields into a TryOnItem', () => {
    const item = cartItemToTryOnItem(
      makeCartItem({
        id: 'ci-1',
        variationId: 'nike-windrunner-black-m',
        title: 'Nike Windrunner Windbreaker',
        brand: 'Nike',
        colorLabel: 'Black',
        size: 'M',
        imagePath: 'items/nike-windbreaker.png',
        unitPrice: 120,
      }),
    );

    expect(item.id).toBe('nike-windrunner-black-m');
    expect(item.variationId).toBe('nike-windrunner-black-m');
    expect(item.tagline).toBe('Nike · Black · Size M');
    expect(item.imageUrl).toContain('items/nike-windbreaker.png');
    expect(item.unitPrice).toBe(120);
  });
});
