import { describe, expect, it } from 'vitest';
import {
  CART_IDLE_MS,
  cartExpiresInMs,
  formatExpiresIn,
} from './carts';
import { groupColourways, type CatalogVariation } from './catalogItems';

describe('cartExpiresInMs', () => {
  it('returns full idle window when activity is now', () => {
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    expect(cartExpiresInMs(new Date(now).toISOString(), now)).toBe(CART_IDLE_MS);
  });

  it('returns remaining time after partial idle', () => {
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    const last = now - 3 * 60_000;
    expect(cartExpiresInMs(new Date(last).toISOString(), now)).toBe(
      CART_IDLE_MS - 3 * 60_000,
    );
  });

  it('clamps to zero when past idle window', () => {
    const now = Date.parse('2026-07-29T12:00:00.000Z');
    const last = now - CART_IDLE_MS - 5_000;
    expect(cartExpiresInMs(new Date(last).toISOString(), now)).toBe(0);
  });

  it('returns zero for invalid timestamps', () => {
    expect(cartExpiresInMs('not-a-date')).toBe(0);
  });
});

describe('formatExpiresIn', () => {
  it('formats seconds under a minute', () => {
    expect(formatExpiresIn(45_000)).toBe('45s');
  });

  it('formats minutes by rounding up', () => {
    expect(formatExpiresIn(90_000)).toBe('2 min');
  });

  it('says expiring when idle window is over', () => {
    expect(formatExpiresIn(0)).toBe('expiring');
    expect(formatExpiresIn(-1)).toBe('expiring');
  });
});

describe('groupColourways', () => {
  const sample: CatalogVariation[] = [
    {
      variationId: 'nike-windrunner-black-s',
      styleId: 'nike-windrunner',
      title: 'Nike Windrunner Windbreaker',
      brand: 'Nike',
      apparelType: 'Jackets',
      designType: 'Windbreakers',
      colorId: 'black',
      colorLabel: 'Black',
      size: 'S',
      sizeOrder: 2,
      isDefault: false,
      imagePath: 'items/nike-windbreaker.png',
      unitPrice: 120,
      quantity: 2,
    },
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
    {
      variationId: 'nike-windrunner-black-l',
      styleId: 'nike-windrunner',
      title: 'Nike Windrunner Windbreaker',
      brand: 'Nike',
      apparelType: 'Jackets',
      designType: 'Windbreakers',
      colorId: 'black',
      colorLabel: 'Black',
      size: 'L',
      sizeOrder: 4,
      isDefault: false,
      imagePath: 'items/nike-windbreaker.png',
      unitPrice: 120,
      quantity: 1,
    },
    {
      variationId: 'wide-straight-jeans-indigo-32',
      styleId: 'wide-straight-jeans',
      title: 'Wide Straight Jeans',
      brand: 'Uniqlo',
      apparelType: 'Jeans',
      designType: 'Wide Jeans',
      colorId: 'indigo',
      colorLabel: 'Indigo',
      size: '32',
      sizeOrder: 3,
      isDefault: true,
      imagePath: 'items/goods_488743_sub14_3x4.png',
      unitPrice: 49.9,
      quantity: 3,
    },
  ];

  it('groups variations into colourways with sizes sorted', () => {
    const colourways = groupColourways(sample);
    expect(colourways).toHaveLength(2);
    const nike = colourways.find((c) => c.styleId === 'nike-windrunner');
    expect(nike?.sizes.map((s) => s.size)).toEqual(['S', 'M', 'L']);
    expect(nike?.colorLabel).toBe('Black');
  });
});
