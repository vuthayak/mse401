export type Valence = 'POSITIVE' | 'NEGATIVE';

export type SizeFitSignal = 'TOO_SMALL' | 'PERFECT' | 'TOO_LARGE';
export type ColorwaySignal = 'DISLIKE_SHADE' | 'LOVE_COLOR';
export type CutSilhouetteSignal = 'UNCOMFORTABLE_PROPORTIONS' | 'FLATTERING_CUT';
export type MaterialSignal = 'HARSH_FABRIC' | 'PREMIUM_TEXTURE';

export type ConversionDecision = 'KEEP_AND_WEAR' | 'LEAVE_AND_SWAP';

export interface AxisSelection<T extends string> {
  captured_signal: T;
  valence: Valence;
}

export interface SentimentMatrix {
  size_fit: AxisSelection<SizeFitSignal>;
  colorway: AxisSelection<ColorwaySignal>;
  cut_silhouette: AxisSelection<CutSilhouetteSignal>;
  material_property: AxisSelection<MaterialSignal>;
}

export interface ProductContext {
  scanned_sku: string;
  style_group_id: string;
  current_size: string;
  current_color_code: string;
  categorical_tags: string[];
  display_name: string;
  display_color: string;
}

export interface SurveyPayload {
  session_metadata: {
    session_token: string;
    fitting_room_id: string;
    timestamp_utc: string;
  };
  active_product_context: {
    scanned_sku: string;
    style_group_id: string;
    current_size: string;
    current_color_code: string;
    categorical_tags: string[];
  };
  step_1_granular_sentiment_matrix: SentimentMatrix;
  step_2_universal_conversion_intent: {
    user_decision: ConversionDecision;
    recommender_pipeline_triggered: boolean;
  };
  hybrid_recommender_routing_directives: HybridRoutingDirectives | null;
}

export interface HybridRoutingDirectives {
  stage_1_heuristic_execution: {
    action: string;
    parameters: {
      target_size_operator: string | null;
      fallback_strategy: string;
    };
  };
  stage_2_llm_stylist_hybrid_override: {
    action: string;
    parameters: {
      attributes_to_lock_and_match: string[];
      attributes_to_penalize_and_mutate: string[];
      target_recommendation_strategy: string;
      vector_multiplier: number;
    };
  };
}

export interface AxisConfig<T extends string> {
  key: keyof SentimentMatrix;
  label: string;
  options: { label: string; signal: T }[];
}

export const AXIS_CONFIGS: [
  AxisConfig<SizeFitSignal>,
  AxisConfig<ColorwaySignal>,
  AxisConfig<CutSilhouetteSignal>,
  AxisConfig<MaterialSignal>,
] = [
  {
    key: 'size_fit',
    label: 'Size / Fit',
    options: [
      { label: 'Too Small', signal: 'TOO_SMALL' },
      { label: 'Perfect', signal: 'PERFECT' },
      { label: 'Too Large', signal: 'TOO_LARGE' },
    ],
  },
  {
    key: 'colorway',
    label: 'Color',
    options: [
      { label: 'Dislike Shade', signal: 'DISLIKE_SHADE' },
      { label: 'Love Color', signal: 'LOVE_COLOR' },
    ],
  },
  {
    key: 'cut_silhouette',
    label: 'Cut / Silhouette',
    options: [
      { label: 'Uncomfortable Proportions', signal: 'UNCOMFORTABLE_PROPORTIONS' },
      { label: 'Flattering Cut', signal: 'FLATTERING_CUT' },
    ],
  },
  {
    key: 'material_property',
    label: 'Fabric / Material',
    options: [
      { label: 'Harsh Fabric', signal: 'HARSH_FABRIC' },
      { label: 'Premium Texture', signal: 'PREMIUM_TEXTURE' },
    ],
  },
];

export const PRODUCT_BLAZER: ProductContext = {
  scanned_sku: 'SKU-49120-BLU-MED',
  style_group_id: 'STYLE-49120',
  current_size: 'M',
  current_color_code: 'BLU',
  categorical_tags: ['Material: 100% Linen', 'Style: Slim-Fit-Blazer'],
  display_name: 'Slim-Fit Linen Blazer',
  display_color: 'Blue',
};

export const PRODUCT_DRESS: ProductContext = {
  scanned_sku: 'SKU-77204-SND-SML',
  style_group_id: 'STYLE-77204',
  current_size: 'S',
  current_color_code: 'SND',
  categorical_tags: ['Material: 100% Linen', 'Style: Relaxed-Midi-Dress'],
  display_name: 'Relaxed Linen Midi Dress',
  display_color: 'Sand',
};

export const INTENT_STEM =
  'Do you plan on purchasing this item, or leave and get recommendations?';

export const INTENT_LABEL_PURCHASE = 'I plan on purchasing';
export const INTENT_LABEL_LEAVE = 'I plan on not purchasing, give me recommendations';

export type PartialSentimentMatrix = {
  size_fit?: SizeFitSignal;
  colorway?: ColorwaySignal;
  cut_silhouette?: CutSilhouetteSignal;
  material_property?: MaterialSignal;
};

export function isMatrixComplete(matrix: PartialSentimentMatrix): matrix is {
  size_fit: SizeFitSignal;
  colorway: ColorwaySignal;
  cut_silhouette: CutSilhouetteSignal;
  material_property: MaterialSignal;
} {
  return (
    matrix.size_fit !== undefined &&
    matrix.colorway !== undefined &&
    matrix.cut_silhouette !== undefined &&
    matrix.material_property !== undefined
  );
}
