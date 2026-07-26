import { SURVEY_ITEMS, type SurveyItem } from '../types/survey';

/**
 * Cascading catalog hierarchy for the insights dashboard, mirroring how an
 * online store organizes inventory:
 *   apparel type (e.g. Jackets) → design type (e.g. Windbreaker)
 *   → SKU (e.g. Nike Windrunner) → variation (e.g. Black colourway).
 *
 * Ids, labels and prices mirror the Supabase catalog seeded by
 * supabase/recommender-seed.sql: SKU ids are `styles.style_id`, variation ids
 * are `sku_variations.variation_id`, and prices are `unit_price`. Keeping them
 * identical means a figure on this dashboard and a price in a recommendation
 * can never disagree.
 *
 * Only the five garments carried into the fitting room appear here, because
 * they are the only ones Survey C can produce responses for. The recommender
 * draws from the full 21-style catalog.
 */

export type CatalogLevel = 'apparel' | 'design' | 'sku' | 'variation';

export interface CatalogNode {
  id: string;
  label: string;
  level: CatalogLevel;
  children: CatalogNode[];
  /** Survey item id — set only on variation leaves. */
  itemId?: string;
  /** Catalog unit_price in CAD — set only on variation leaves. */
  priceCad?: number;
}

export const CATALOG_LEVEL_SINGULAR: Record<CatalogLevel, string> = {
  apparel: 'apparel type',
  design: 'design type',
  sku: 'SKU',
  variation: 'variation',
};

export const CATALOG_LEVEL_PLURAL: Record<CatalogLevel, string> = {
  apparel: 'apparel types',
  design: 'design types',
  sku: 'SKUs',
  variation: 'variations',
};

/** Grid heading per depth in the drill-down (0 = root listing). */
export const CATALOG_DEPTH_HEADINGS = [
  'Apparel types',
  'Design types',
  'SKUs',
  'Variations',
] as const;

function variation(
  id: string,
  label: string,
  itemId: string,
  priceCad: number,
): CatalogNode {
  return { id, label, level: 'variation', children: [], itemId, priceCad };
}

function sku(id: string, label: string, children: CatalogNode[]): CatalogNode {
  return { id, label, level: 'sku', children };
}

function design(
  id: string,
  label: string,
  children: CatalogNode[],
): CatalogNode {
  return { id, label, level: 'design', children };
}

function apparel(
  id: string,
  label: string,
  children: CatalogNode[],
): CatalogNode {
  return { id, label, level: 'apparel', children };
}

export const CATALOG_TAXONOMY: CatalogNode[] = [
  apparel('jackets', 'Jackets', [
    design('windbreakers', 'Windbreakers', [
      sku('nike-windrunner', 'Nike Windrunner Windbreaker', [
        variation(
          'nike-windrunner-black-m',
          'Black · M',
          'nike-windbreaker',
          120.0,
        ),
      ]),
    ]),
    design('track-jackets', 'Track Jackets', [
      sku('adidas-santiago-track', 'Adidas Santiago Track Jacket', [
        variation(
          'adidas-santiago-track-colourblock-navy-m',
          'Navy colour-block · M',
          'adidas-track-jacket',
          85.0,
        ),
      ]),
    ]),
  ]),
  apparel('hoodies', 'Hoodies', [
    design('zip-hoodies', 'Zip Hoodies', [
      sku('waterloo-zip-hoodie', 'University of Waterloo Zip Hoodie', [
        variation(
          'waterloo-zip-hoodie-heather-grey-m',
          'Heather grey · M',
          'waterloo-hoodie',
          65.0,
        ),
      ]),
      sku('essential-zip-hoodie', 'Essential Full-Zip Hoodie', [
        variation(
          'essential-zip-hoodie-black-m',
          'Black · M',
          'black-zip-hoodie',
          55.0,
        ),
      ]),
    ]),
  ]),
  apparel('tees', 'Tees', [
    design('graphic-jerseys', 'Graphic Jerseys', [
      sku('chevrolet-graphic-jersey', 'Chevrolet Graphic Jersey Tee', [
        variation(
          'chevrolet-graphic-jersey-maroon-m',
          'Maroon · M',
          'chevrolet-jersey',
          45.0,
        ),
      ]),
    ]),
  ]),
];

/** All survey item ids under a node (a variation returns just its own). */
export function leafItemIds(node: CatalogNode): string[] {
  if (node.itemId) {
    return [node.itemId];
  }
  return node.children.flatMap(leafItemIds);
}

const ITEM_BY_ID = new Map<string, SurveyItem>(
  SURVEY_ITEMS.map((item) => [item.id, item]),
);

export function itemForVariation(node: CatalogNode): SurveyItem | undefined {
  return node.itemId ? ITEM_BY_ID.get(node.itemId) : undefined;
}

/** A node together with the ancestor chain leading to it (inclusive). */
export interface CatalogEntry {
  node: CatalogNode;
  path: CatalogNode[];
}

function walk(
  nodes: CatalogNode[],
  ancestors: CatalogNode[],
  out: CatalogEntry[],
): void {
  for (const node of nodes) {
    const path = [...ancestors, node];
    out.push({ node, path });
    walk(node.children, path, out);
  }
}

const ALL_ENTRIES: CatalogEntry[] = (() => {
  const out: CatalogEntry[] = [];
  walk(CATALOG_TAXONOMY, [], out);
  return out;
})();

export function entriesAtLevel(level: CatalogLevel): CatalogEntry[] {
  return ALL_ENTRIES.filter((entry) => entry.node.level === level);
}

const PRICE_BY_ITEM = new Map<string, number>(
  ALL_ENTRIES.filter((e) => e.node.itemId).map((e) => [
    e.node.itemId!,
    e.node.priceCad ?? 0,
  ]),
);

export function priceForItem(itemId: string): number {
  return PRICE_BY_ITEM.get(itemId) ?? 0;
}

/** Resolve URL segments (e.g. ['hoodies', 'zip-hoodies']) to a node path. */
export function resolveCatalogPath(segments: string[]): CatalogNode[] | null {
  const path: CatalogNode[] = [];
  let level = CATALOG_TAXONOMY;

  for (const segment of segments) {
    const match = level.find((node) => node.id === segment);
    if (!match) return null;
    path.push(match);
    level = match.children;
  }

  return path;
}

/** Build the route for a node path, e.g. /insights/c/hoodies/zip-hoodies. */
export function catalogHref(path: CatalogNode[]): string {
  if (path.length === 0) return '/insights';
  return `/insights/c/${path.map((node) => node.id).join('/')}`;
}

/** Human-readable ancestry above a node, e.g. "Hoodies · Zip Hoodies". */
export function ancestryLabel(path: CatalogNode[]): string {
  return path
    .slice(0, -1)
    .map((node) => node.label)
    .join(' · ');
}
