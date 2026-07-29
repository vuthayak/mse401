import { catalogImageUrl } from './recommendItem';

/**
 * Cascading catalog hierarchy for the insights dashboard, mirroring how an
 * online store organizes inventory:
 *   apparel type (e.g. Jackets) → design type (e.g. Windbreaker)
 *   → SKU (e.g. Nike Windrunner) → variation (e.g. Black · M).
 *
 * Ids, labels and prices mirror the Supabase catalog seeded by
 * supabase/recommender-seed.sql: SKU ids are `styles.style_id`, variation ids
 * are `sku_variations.variation_id`, and prices are `unit_price`. Keeping them
 * identical means a figure on this dashboard and a price in a recommendation
 * can never disagree.
 *
 * The tree is built from the full 23-colourway catalog (21 styles × sizes →
 * 69 variation leaves).
 */

export type CatalogLevel = 'apparel' | 'design' | 'sku' | 'variation';

export interface CatalogNode {
  id: string;
  label: string;
  level: CatalogLevel;
  children: CatalogNode[];
  /** Variation id — set only on variation leaves. */
  itemId?: string;
  /** Catalog unit_price in CAD — set only on variation leaves. */
  priceCad?: number;
  /** Catalog image path — set on variation leaves. */
  imagePath?: string;
  /** Style title — set on variation leaves. */
  title?: string;
  /** Brand — set on variation leaves. */
  brand?: string;
}

/** SurveyItem-like shape for UI cards; not tied to SURVEY_ITEMS. */
export interface CatalogItemView {
  id: string;
  title: string;
  tagline: string;
  imageUrl: string;
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

type SizeSet = 'tops' | 'bottoms';

interface CatalogColourway {
  styleId: string;
  title: string;
  brand: string;
  apparelType: string;
  designType: string;
  colorId: string;
  colorLabel: string;
  unitPrice: number;
  imagePath: string;
  sizeSet: SizeSet;
}

const TOP_SIZES = ['S', 'M', 'L'] as const;
const BOTTOM_SIZES = ['30', '32', '34'] as const;

const APPAREL_ORDER = [
  'Jackets',
  'Hoodies',
  'Tees',
  'Shirts',
  'Jeans',
  'Pants',
  'Shorts',
] as const;

/** Flat catalogue colourway table — source of truth for the taxonomy tree. */
export const CATALOG_COLOURWAYS: CatalogColourway[] = [
  {
    styleId: 'nike-windrunner',
    title: 'Nike Windrunner Windbreaker',
    brand: 'Nike',
    apparelType: 'Jackets',
    designType: 'Windbreakers',
    colorId: 'black',
    colorLabel: 'Black',
    unitPrice: 120,
    imagePath: 'items/nike-windbreaker.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'adidas-santiago-track',
    title: 'Adidas Santiago Track Jacket',
    brand: 'Adidas',
    apparelType: 'Jackets',
    designType: 'Track Jackets',
    colorId: 'colourblock-navy',
    colorLabel: 'Navy colour-block',
    unitPrice: 85,
    imagePath: 'items/adidas-track-jacket.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'hollister-rbr-bomber',
    title: 'Hollister x Oracle Red Bull Racing Bomber',
    brand: 'Hollister',
    apparelType: 'Jackets',
    designType: 'Bombers',
    colorId: 'navy',
    colorLabel: 'Navy',
    unitPrice: 110,
    imagePath: 'items/KIC_332-6016-00083-200_prod2.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'waterloo-zip-hoodie',
    title: 'University of Waterloo Zip Hoodie',
    brand: 'Waterloo',
    apparelType: 'Hoodies',
    designType: 'Zip Hoodies',
    colorId: 'heather-grey',
    colorLabel: 'Heather grey',
    unitPrice: 65,
    imagePath: 'items/waterloo-hoodie.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'essential-zip-hoodie',
    title: 'Essential Full-Zip Hoodie',
    brand: 'Everyday',
    apparelType: 'Hoodies',
    designType: 'Zip Hoodies',
    colorId: 'black',
    colorLabel: 'Black',
    unitPrice: 55,
    imagePath: 'items/black-zip-hoodie.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'relaxed-crew-sweatshirt',
    title: 'Relaxed Crew Neck Sweatshirt',
    brand: 'Uniqlo',
    apparelType: 'Hoodies',
    designType: 'Sweatshirts',
    colorId: 'seafoam',
    colorLabel: 'Seafoam',
    unitPrice: 39.9,
    imagePath: 'items/goods_475377_sub14_3x4.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'chevrolet-graphic-jersey',
    title: 'Chevrolet Graphic Jersey Tee',
    brand: 'Chevrolet',
    apparelType: 'Tees',
    designType: 'Graphic Jerseys',
    colorId: 'maroon',
    colorLabel: 'Maroon',
    unitPrice: 45,
    imagePath: 'items/chevrolet-jersey.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'hollister-crew-tee',
    title: 'Hollister Basic Crew Neck Tee',
    brand: 'Hollister',
    apparelType: 'Tees',
    designType: 'Crew Tees',
    colorId: 'light-blue',
    colorLabel: 'Light blue',
    unitPrice: 24.95,
    imagePath: 'items/KIC_324-26014-00655-210_prod1.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'hollister-raglan-tee',
    title: 'Hollister Relaxed Raglan Tee',
    brand: 'Hollister',
    apparelType: 'Tees',
    designType: 'Raglan Tees',
    colorId: 'cream-navy',
    colorLabel: 'Cream and navy',
    unitPrice: 29.95,
    imagePath: 'items/KIC_324-6333-00614-108_prod1.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'cos-striped-tee',
    title: 'COS Oversized Striped Tee',
    brand: 'COS',
    apparelType: 'Tees',
    designType: 'Crew Tees',
    colorId: 'cream-navy',
    colorLabel: 'Cream and navy',
    unitPrice: 45,
    imagePath: 'items/808fa062a24696cb08e47eb85e9dae3501357691_xxl-1.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'cos-ribbed-tank',
    title: 'COS Ribbed Tank Top',
    brand: 'COS',
    apparelType: 'Tees',
    designType: 'Tanks',
    colorId: 'grey-marl',
    colorLabel: 'Grey marl',
    unitPrice: 35,
    imagePath: 'items/b81278a8400e19b92cf46d9bf814d10a13bdebc8_xxl-1.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'flannel-check-shirt',
    title: 'Flannel Check Shirt',
    brand: 'Uniqlo',
    apparelType: 'Shirts',
    designType: 'Flannel Shirts',
    colorId: 'rust-check',
    colorLabel: 'Rust check',
    unitPrice: 29.9,
    imagePath: 'items/goods_486596_sub14_3x4.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'flannel-check-shirt',
    title: 'Flannel Check Shirt',
    brand: 'Uniqlo',
    apparelType: 'Shirts',
    designType: 'Flannel Shirts',
    colorId: 'navy-check',
    colorLabel: 'Navy check',
    unitPrice: 29.9,
    imagePath: 'items/goods_486604_sub14_3x4.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'jwa-striped-oxford',
    title: 'JW Anderson Striped Oxford Shirt',
    brand: 'Uniqlo',
    apparelType: 'Shirts',
    designType: 'Oxford Shirts',
    colorId: 'light-blue',
    colorLabel: 'Light blue',
    unitPrice: 49.9,
    imagePath: 'items/goods_484904_sub14_3x4.png',
    sizeSet: 'tops',
  },
  {
    styleId: 'hollister-baggy-jeans',
    title: 'Hollister Vintage Baggy Jeans',
    brand: 'Hollister',
    apparelType: 'Jeans',
    designType: 'Baggy Jeans',
    colorId: 'medium-indigo',
    colorLabel: 'Medium indigo wash',
    unitPrice: 69.95,
    imagePath: 'items/KIC_331-6272-00751-276_prod1.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'wide-straight-jeans',
    title: 'Wide Straight Jeans',
    brand: 'Uniqlo',
    apparelType: 'Jeans',
    designType: 'Wide Jeans',
    colorId: 'black',
    colorLabel: 'Black',
    unitPrice: 49.9,
    imagePath: 'items/goods_482868_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'wide-straight-jeans',
    title: 'Wide Straight Jeans',
    brand: 'Uniqlo',
    apparelType: 'Jeans',
    designType: 'Wide Jeans',
    colorId: 'indigo',
    colorLabel: 'Indigo',
    unitPrice: 49.9,
    imagePath: 'items/goods_488743_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'wide-cargo-pants',
    title: 'Wide Cargo Pants',
    brand: 'Uniqlo',
    apparelType: 'Pants',
    designType: 'Cargo Pants',
    colorId: 'charcoal',
    colorLabel: 'Charcoal',
    unitPrice: 49.9,
    imagePath: 'items/goods_482936_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'ultra-stretch-joggers',
    title: 'Ultra Stretch Joggers',
    brand: 'Uniqlo',
    apparelType: 'Pants',
    designType: 'Joggers',
    colorId: 'sage',
    colorLabel: 'Sage',
    unitPrice: 39.9,
    imagePath: 'items/goods_485744_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'hollister-sweat-shorts',
    title: 'Hollister Sweat Shorts',
    brand: 'Hollister',
    apparelType: 'Shorts',
    designType: 'Sweat Shorts',
    colorId: 'black',
    colorLabel: 'Black',
    unitPrice: 34.95,
    imagePath: 'items/KIC_328-6040-00196-902_prod1.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'uniqlo-c-sweat-shorts',
    title: 'Uniqlo :C Sweat Shorts',
    brand: 'Uniqlo',
    apparelType: 'Shorts',
    designType: 'Sweat Shorts',
    colorId: 'light-grey',
    colorLabel: 'Light grey',
    unitPrice: 29.9,
    imagePath: 'items/goods_482758_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'light-wash-denim-shorts',
    title: 'Light Wash Denim Shorts',
    brand: 'Uniqlo',
    apparelType: 'Shorts',
    designType: 'Denim Shorts',
    colorId: 'light-wash',
    colorLabel: 'Light wash',
    unitPrice: 29.9,
    imagePath: 'items/goods_484209_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
  {
    styleId: 'frisso-printed-shorts',
    title: 'F.RISSO Printed Jersey Shorts',
    brand: 'Uniqlo',
    apparelType: 'Shorts',
    designType: 'Jersey Shorts',
    colorId: 'grey-print',
    colorLabel: 'Grey print',
    unitPrice: 24.9,
    imagePath: 'items/goods_488997_sub14_3x4.png',
    sizeSet: 'bottoms',
  },
];

function slugify(label: string): string {
  return label.toLowerCase().replace(/\s+/g, '-');
}

function sizesFor(sizeSet: SizeSet): readonly string[] {
  return sizeSet === 'tops' ? TOP_SIZES : BOTTOM_SIZES;
}

function variationLeaves(cw: CatalogColourway): CatalogNode[] {
  return sizesFor(cw.sizeSet).map((size) => {
    const variationId = `${cw.styleId}-${cw.colorId}-${size.toLowerCase()}`;
    return {
      id: variationId,
      label: `${cw.colorLabel} · ${size}`,
      level: 'variation' as const,
      children: [],
      itemId: variationId,
      priceCad: cw.unitPrice,
      imagePath: cw.imagePath,
      title: cw.title,
      brand: cw.brand,
    };
  });
}

function buildTaxonomy(colourways: CatalogColourway[]): CatalogNode[] {
  type StyleBucket = {
    styleId: string;
    title: string;
    leaves: CatalogNode[];
  };
  type DesignBucket = {
    designType: string;
    styles: Map<string, StyleBucket>;
  };
  type ApparelBucket = {
    apparelType: string;
    designs: Map<string, DesignBucket>;
  };

  const apparelMap = new Map<string, ApparelBucket>();

  for (const cw of colourways) {
    let apparel = apparelMap.get(cw.apparelType);
    if (!apparel) {
      apparel = { apparelType: cw.apparelType, designs: new Map() };
      apparelMap.set(cw.apparelType, apparel);
    }

    let design = apparel.designs.get(cw.designType);
    if (!design) {
      design = { designType: cw.designType, styles: new Map() };
      apparel.designs.set(cw.designType, design);
    }

    let style = design.styles.get(cw.styleId);
    if (!style) {
      style = { styleId: cw.styleId, title: cw.title, leaves: [] };
      design.styles.set(cw.styleId, style);
    }
    style.leaves.push(...variationLeaves(cw));
  }

  return APPAREL_ORDER.filter((label) => apparelMap.has(label)).map(
    (apparelType) => {
      const apparel = apparelMap.get(apparelType)!;
      return {
        id: slugify(apparelType),
        label: apparelType,
        level: 'apparel' as const,
        children: [...apparel.designs.values()].map((design) => ({
          id: slugify(design.designType),
          label: design.designType,
          level: 'design' as const,
          children: [...design.styles.values()].map((style) => ({
            id: style.styleId,
            label: style.title,
            level: 'sku' as const,
            children: style.leaves,
          })),
        })),
      };
    },
  );
}

export const CATALOG_TAXONOMY: CatalogNode[] =
  buildTaxonomy(CATALOG_COLOURWAYS);

/** All variation item ids under a node (a variation returns just its own). */
export function leafItemIds(node: CatalogNode): string[] {
  if (node.itemId) {
    return [node.itemId];
  }
  return node.children.flatMap(leafItemIds);
}

export function itemForVariation(node: CatalogNode): CatalogItemView | undefined {
  if (!node.itemId || node.level !== 'variation') return undefined;
  return {
    id: node.itemId,
    title: node.title ?? node.label,
    tagline: node.label,
    imageUrl: node.imagePath ? catalogImageUrl(node.imagePath) : '',
  };
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
