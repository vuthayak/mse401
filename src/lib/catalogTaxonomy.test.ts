import { describe, expect, it } from 'vitest';
import {
  CATALOG_TAXONOMY,
  entriesAtLevel,
  leafItemIds,
  priceForItem,
  resolveCatalogPath,
  itemForVariation,
} from './catalogTaxonomy';

function countLeaves(nodes: typeof CATALOG_TAXONOMY): number {
  return nodes.reduce((sum, node) => {
    if (node.level === 'variation') return sum + 1;
    return sum + countLeaves(node.children);
  }, 0);
}

describe('catalogTaxonomy expansion', () => {
  it('builds 7 apparel types in the seeded order', () => {
    expect(CATALOG_TAXONOMY.map((n) => n.id)).toEqual([
      'jackets',
      'hoodies',
      'tees',
      'shirts',
      'jeans',
      'pants',
      'shorts',
    ]);
  });

  it('generates 69 variation leaves from 23 colourways', () => {
    expect(countLeaves(CATALOG_TAXONOMY)).toBe(69);
    expect(entriesAtLevel('variation')).toHaveLength(69);
  });

  it('has 21 SKUs and keeps legacy insight URLs', () => {
    expect(entriesAtLevel('sku')).toHaveLength(21);
    const path = resolveCatalogPath(['hoodies', 'zip-hoodies']);
    expect(path?.map((n) => n.id)).toEqual(['hoodies', 'zip-hoodies']);
  });

  it('keys leaf itemId and price by variation_id', () => {
    expect(priceForItem('nike-windrunner-black-m')).toBe(120);
    expect(priceForItem('hollister-baggy-jeans-medium-indigo-32')).toBe(69.95);
    expect(priceForItem('unknown-item')).toBe(0);
  });

  it('leafItemIds returns variation ids under a node', () => {
    const path = resolveCatalogPath(['jackets', 'windbreakers', 'nike-windrunner']);
    expect(path).not.toBeNull();
    const sku = path![path!.length - 1];
    expect(leafItemIds(sku).sort()).toEqual([
      'nike-windrunner-black-l',
      'nike-windrunner-black-m',
      'nike-windrunner-black-s',
    ]);
  });

  it('itemForVariation builds display fields from the leaf', () => {
    const path = resolveCatalogPath([
      'jackets',
      'windbreakers',
      'nike-windrunner',
      'nike-windrunner-black-m',
    ]);
    expect(path).not.toBeNull();
    const leaf = path![path!.length - 1];
    const item = itemForVariation(leaf);
    expect(item?.id).toBe('nike-windrunner-black-m');
    expect(item?.title).toBe('Nike Windrunner Windbreaker');
    expect(item?.imageUrl).toContain('items/nike-windbreaker.png');
  });
});
