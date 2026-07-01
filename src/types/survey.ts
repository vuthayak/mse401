export type ConversionDecision = 'KEEP_AND_WEAR' | 'LEAVE_AND_SWAP';

export type ScaleRating = 1 | 2 | 3 | 4 | 5;

export type AttributeKey = 'fabric' | 'fit' | 'colour' | 'price';

export interface SurveyItem {
  id: string;
  title: string;
  tagline: string;
  imageUrl?: string;
}

export const SURVEY_ITEMS: SurveyItem[] = [
  { id: 'item-1', title: 'Item 1', tagline: 'Placeholder tagline for item one.' },
  { id: 'item-2', title: 'Item 2', tagline: 'Placeholder tagline for item two.' },
  { id: 'item-3', title: 'Item 3', tagline: 'Placeholder tagline for item three.' },
  { id: 'item-4', title: 'Item 4', tagline: 'Placeholder tagline for item four.' },
  { id: 'item-5', title: 'Item 5', tagline: 'Placeholder tagline for item five.' },
];

export interface ScaleAxisConfig {
  key: AttributeKey;
  label: string;
  options: { value: ScaleRating; label: string }[];
}

export const SURVEY_A_AXES: ScaleAxisConfig[] = [
  {
    key: 'fabric',
    label: 'Fabric',
    options: [
      { value: 1, label: 'hate it' },
      { value: 2, label: 'dislike it' },
      { value: 3, label: 'neutral' },
      { value: 4, label: 'like it' },
      { value: 5, label: 'love it' },
    ],
  },
  {
    key: 'fit',
    label: 'Fit',
    options: [
      { value: 1, label: 'too tight' },
      { value: 2, label: 'slightly tight' },
      { value: 3, label: 'just right' },
      { value: 4, label: 'slightly loose' },
      { value: 5, label: 'too loose' },
    ],
  },
  {
    key: 'colour',
    label: 'Colour',
    options: [
      { value: 1, label: 'hate the colour' },
      { value: 2, label: 'dislike the colour' },
      { value: 3, label: 'neutral' },
      { value: 4, label: 'like the colour' },
      { value: 5, label: 'love the colour' },
    ],
  },
  {
    key: 'price',
    label: 'Price',
    options: [
      { value: 1, label: 'overpriced' },
      { value: 2, label: 'poor value' },
      { value: 3, label: 'fair' },
      { value: 4, label: 'good value' },
      { value: 5, label: 'great value' },
    ],
  },
];

export const SURVEY_B_AXES: { key: AttributeKey; label: string }[] = [
  { key: 'fabric', label: 'Fabric' },
  { key: 'fit', label: 'Fit' },
  { key: 'colour', label: 'Colour' },
  { key: 'price', label: 'Price' },
];

export const INTENT_STEM =
  'Do you plan on purchasing this item, or leave and get recommendations?';

export const INTENT_LABEL_PURCHASE = 'I plan on purchasing';
export const INTENT_LABEL_LEAVE = 'I plan on not purchasing, give me recommendations';

export type PartialScaleRatings = Partial<Record<AttributeKey, ScaleRating>>;

export type PartialBinaryRatings = Partial<Record<AttributeKey, boolean>>;

export function isScaleRatingsComplete(
  ratings: PartialScaleRatings,
): ratings is Record<AttributeKey, ScaleRating> {
  return (
    ratings.fabric !== undefined &&
    ratings.fit !== undefined &&
    ratings.colour !== undefined &&
    ratings.price !== undefined
  );
}

export function isBinaryRatingsComplete(
  ratings: PartialBinaryRatings,
): ratings is Record<AttributeKey, boolean> {
  return (
    ratings.fabric !== undefined &&
    ratings.fit !== undefined &&
    ratings.colour !== undefined &&
    ratings.price !== undefined
  );
}

export interface SurveyAResponse {
  session_token: string;
  selected_item: string;
  fabric: ScaleRating;
  fit: ScaleRating;
  colour: ScaleRating;
  price: ScaleRating;
  purchase_intent: ConversionDecision;
}

export interface SurveyBResponse {
  session_token: string;
  selected_item: string;
  purchase_intent: ConversionDecision;
  fabric: boolean;
  fit: boolean;
  colour: boolean;
  price: boolean;
}
