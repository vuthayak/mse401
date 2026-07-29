import type { PersistOutcome } from './persistSurvey';
import { getSupabase, isSupabaseConfigured } from './supabase';
import { errorMessage, isOnline, OfflineError, withRetry } from './withRetry';

export interface CatalogVariation {
  variationId: string;
  styleId: string;
  title: string;
  brand: string;
  apparelType: string;
  designType: string;
  colorId: string;
  colorLabel: string;
  size: string;
  sizeOrder: number;
  isDefault: boolean;
  imagePath: string;
  unitPrice: number;
  quantity: number;
}

/** One colourway with its available sizes. */
export interface CatalogColourway {
  key: string;
  styleId: string;
  title: string;
  brand: string;
  apparelType: string;
  designType: string;
  colorId: string;
  colorLabel: string;
  imagePath: string;
  unitPrice: number;
  sizes: CatalogVariation[];
}

export type CatalogItemsOutcome =
  | { status: 'ok'; colourways: CatalogColourway[] }
  | { status: 'unavailable'; reason: 'not_configured' }
  | { status: 'error'; message: string };

interface ApiCatalogItem {
  variation_id: string;
  style_id: string;
  title: string;
  brand: string;
  apparel_type: string;
  design_type: string;
  color_id: string;
  color_label: string;
  size: string;
  size_order: number;
  is_default: boolean;
  image_path: string;
  unit_price: number;
  quantity: number;
}

function toVariation(raw: ApiCatalogItem): CatalogVariation {
  return {
    variationId: raw.variation_id,
    styleId: raw.style_id,
    title: raw.title,
    brand: raw.brand,
    apparelType: raw.apparel_type,
    designType: raw.design_type,
    colorId: raw.color_id,
    colorLabel: raw.color_label,
    size: raw.size,
    sizeOrder: Number(raw.size_order),
    isDefault: Boolean(raw.is_default),
    imagePath: raw.image_path,
    unitPrice: Number(raw.unit_price),
    quantity: Number(raw.quantity ?? 0),
  };
}

export function groupColourways(
  variations: CatalogVariation[],
): CatalogColourway[] {
  const map = new Map<string, CatalogColourway>();

  for (const v of variations) {
    const key = `${v.styleId}::${v.colorId}`;
    let colourway = map.get(key);
    if (!colourway) {
      colourway = {
        key,
        styleId: v.styleId,
        title: v.title,
        brand: v.brand,
        apparelType: v.apparelType,
        designType: v.designType,
        colorId: v.colorId,
        colorLabel: v.colorLabel,
        imagePath: v.imagePath,
        unitPrice: v.unitPrice,
        sizes: [],
      };
      map.set(key, colourway);
    }
    colourway.sizes.push(v);
  }

  for (const colourway of map.values()) {
    colourway.sizes.sort((a, b) => a.sizeOrder - b.sizeOrder);
  }

  return [...map.values()];
}

export async function fetchCatalogItems(
  storeId = 'kw-flagship',
  signal?: AbortSignal,
): Promise<CatalogItemsOutcome> {
  if (!isSupabaseConfigured()) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'unavailable', reason: 'not_configured' };
  }

  if (signal?.aborted) {
    return { status: 'error', message: 'Request cancelled.' };
  }

  try {
    const data = await withRetry(
      async (attemptSignal) => {
        const { data: rows, error } = await supabase
          .rpc('list_catalog_items', { p_store_id: storeId })
          .abortSignal(attemptSignal);

        if (error) throw error;
        return rows;
      },
      { signal },
    );

    const variations = ((data ?? []) as ApiCatalogItem[]).map(toVariation);
    return { status: 'ok', colourways: groupColourways(variations) };
  } catch (error) {
    if (signal?.aborted) {
      return { status: 'error', message: 'Request cancelled.' };
    }
    if (import.meta.env.DEV) {
      console.error('list_catalog_items_error', error);
    }
    return {
      status: 'error',
      message: errorMessage(error, 'Could not load catalog'),
    };
  }
}

/** Convenience re-export so callers can surface assign errors uniformly. */
export type AssignPersistOutcome = PersistOutcome;
export { isOnline, OfflineError };
