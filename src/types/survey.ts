export type IntentDecision = 'YES' | 'NO';

export type ScaleRating = 1 | 2 | 3 | 4 | 5;

export type AttributeKey = 'fabric' | 'fit' | 'colour' | 'price';

export interface SurveyItem {
  id: string;
  title: string;
  tagline: string;
  imageUrl: string;
}

function itemImage(filename: string): string {
  return `${import.meta.env.BASE_URL}items/${filename}`;
}

export const SURVEY_ITEMS: SurveyItem[] = [
  {
    id: 'nike-windbreaker',
    title: 'Nike Windrunner Windbreaker',
    tagline: 'Lightweight black hooded windbreaker with a classic chevron seam.',
    imageUrl: itemImage('nike-windbreaker.png'),
  },
  {
    id: 'adidas-track-jacket',
    title: 'Adidas Santiago Track Jacket',
    tagline: 'Color-blocked track jacket with the iconic three stripes.',
    imageUrl: itemImage('adidas-track-jacket.png'),
  },
  {
    id: 'waterloo-hoodie',
    title: 'University of Waterloo Zip Hoodie',
    tagline: 'Heather grey zip-up hoodie with university branding.',
    imageUrl: itemImage('waterloo-hoodie.png'),
  },
  {
    id: 'black-zip-hoodie',
    title: 'Black Zip-Up Hoodie',
    tagline: 'Essential full-zip hoodie in solid black for everyday layering.',
    imageUrl: itemImage('black-zip-hoodie.png'),
  },
  {
    id: 'chevrolet-jersey',
    title: 'Chevrolet Graphic Jersey Tee',
    tagline: 'Maroon athletic jersey tee with a vintage Chevrolet graphic.',
    imageUrl: itemImage('chevrolet-jersey.png'),
  },
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
  intent: IntentDecision;
}

export interface SurveyBResponse {
  session_token: string;
  selected_item: string;
  intent: IntentDecision;
  fabric: boolean;
  fit: boolean;
  colour: boolean;
  price: boolean;
}
