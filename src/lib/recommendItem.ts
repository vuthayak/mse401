import {
  SURVEY_ITEMS,
  type AttributeKey,
  type ScaleRating,
  type SurveyItem,
} from '../types/survey';

/** Mock attribute strengths per item (1–5). Used only by the prototype recommender. */
const ITEM_PROFILES: Record<string, Record<AttributeKey, number>> = {
  'nike-windbreaker': { fabric: 3, fit: 4, colour: 4, price: 3 },
  'adidas-track-jacket': { fabric: 4, fit: 3, colour: 5, price: 3 },
  'waterloo-hoodie': { fabric: 5, fit: 4, colour: 3, price: 4 },
  'black-zip-hoodie': { fabric: 4, fit: 5, colour: 4, price: 5 },
  'chevrolet-jersey': { fabric: 3, fit: 3, colour: 5, price: 4 },
};

const ATTRIBUTE_LABELS: Record<AttributeKey, string> = {
  fabric: 'fabric feel',
  fit: 'fit',
  colour: 'colour',
  price: 'value',
};

export interface Recommendation {
  item: SurveyItem;
  reasons: string[];
}

export function getUnhappyAttributesFromScale(
  ratings: Record<AttributeKey, ScaleRating>,
): AttributeKey[] {
  return (Object.entries(ratings) as [AttributeKey, ScaleRating][])
    .filter(([, value]) => value <= 2)
    .map(([key]) => key);
}

export function getUnhappyAttributesFromBinary(
  ratings: Record<AttributeKey, boolean>,
): AttributeKey[] {
  return (Object.entries(ratings) as [AttributeKey, boolean][])
    .filter(([, liked]) => !liked)
    .map(([key]) => key);
}

function buildReasons(unhappyAttributes: AttributeKey[]): string[] {
  if (unhappyAttributes.length === 0) {
    return ['A popular alternative from our fitting-room collection.'];
  }

  return unhappyAttributes.map(
    (key) => `Stronger ${ATTRIBUTE_LABELS[key]} based on your feedback`,
  );
}

export function recommendItem(
  selectedItemId: string,
  unhappyAttributes: AttributeKey[],
): Recommendation | null {
  const candidates = SURVEY_ITEMS.filter((item) => item.id !== selectedItemId);
  if (candidates.length === 0) return null;

  const focusAttributes =
    unhappyAttributes.length > 0
      ? unhappyAttributes
      : (['fit', 'fabric', 'colour', 'price'] as AttributeKey[]);

  let bestItem = candidates[0];
  let bestScore = -Infinity;

  for (const candidate of candidates) {
    const profile = ITEM_PROFILES[candidate.id];
    const score = focusAttributes.reduce((sum, key) => sum + profile[key], 0);

    if (score > bestScore) {
      bestScore = score;
      bestItem = candidate;
    }
  }

  return {
    item: bestItem,
    reasons: buildReasons(unhappyAttributes),
  };
}
