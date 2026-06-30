import type {
  ConversionDecision,
  HybridRoutingDirectives,
  ProductContext,
  SentimentMatrix,
  SizeFitSignal,
  SurveyPayload,
} from '../types/survey';
import { getSessionToken } from './session';
import { getValence } from './valence';

function buildSentimentMatrix(matrix: {
  size_fit: SizeFitSignal;
  colorway: import('../types/survey').ColorwaySignal;
  cut_silhouette: import('../types/survey').CutSilhouetteSignal;
  material_property: import('../types/survey').MaterialSignal;
}): SentimentMatrix {
  return {
    size_fit: {
      captured_signal: matrix.size_fit,
      valence: getValence(matrix.size_fit),
    },
    colorway: {
      captured_signal: matrix.colorway,
      valence: getValence(matrix.colorway),
    },
    cut_silhouette: {
      captured_signal: matrix.cut_silhouette,
      valence: getValence(matrix.cut_silhouette),
    },
    material_property: {
      captured_signal: matrix.material_property,
      valence: getValence(matrix.material_property),
    },
  };
}

function buildRoutingDirectives(
  sentiment: SentimentMatrix,
  product: ProductContext,
): HybridRoutingDirectives {
  let sizeOperator: string | null = null;
  if (sentiment.size_fit.captured_signal === 'TOO_SMALL') {
    sizeOperator = '+1';
  } else if (sentiment.size_fit.captured_signal === 'TOO_LARGE') {
    sizeOperator = '-1';
  }

  const attributesToLock: string[] = [];
  const attributesToPenalize: string[] = [];

  for (const tag of product.categorical_tags) {
    if (tag.startsWith('Material:') && sentiment.material_property.valence === 'POSITIVE') {
      attributesToLock.push(tag);
    }
    if (tag.startsWith('Style:') && sentiment.cut_silhouette.valence === 'NEGATIVE') {
      attributesToPenalize.push(tag);
    }
  }

  if (sentiment.colorway.valence === 'POSITIVE') {
    attributesToLock.push(`Color_Code: ${product.current_color_code}`);
  }

  if (sentiment.size_fit.valence === 'NEGATIVE') {
    attributesToPenalize.push(`Fit: ${sentiment.size_fit.captured_signal}`);
  }

  if (sentiment.material_property.valence === 'NEGATIVE') {
    const materialTag = product.categorical_tags.find((t) => t.startsWith('Material:'));
    if (materialTag) attributesToPenalize.push(materialTag);
  }

  return {
    stage_1_heuristic_execution: {
      action: 'QUERY_SAME_STYLE_INVENTORY_OFFSET',
      parameters: {
        target_size_operator: sizeOperator,
        fallback_strategy: 'PASS_TO_STAGE_2',
      },
    },
    stage_2_llm_stylist_hybrid_override: {
      action: 'EXECUTE_HYBRID_SUBSTITUTION_PROMPT',
      parameters: {
        attributes_to_lock_and_match: attributesToLock,
        attributes_to_penalize_and_mutate: attributesToPenalize,
        target_recommendation_strategy: 'REPLACEMENT_GARMENT_ONLY',
        vector_multiplier: 1.5,
      },
    },
  };
}

export function buildSurveyPayload(
  product: ProductContext,
  fittingRoomId: string,
  rawMatrix: {
    size_fit: SizeFitSignal;
    colorway: import('../types/survey').ColorwaySignal;
    cut_silhouette: import('../types/survey').CutSilhouetteSignal;
    material_property: import('../types/survey').MaterialSignal;
  },
  decision: ConversionDecision,
): SurveyPayload {
  const sentiment = buildSentimentMatrix(rawMatrix);
  const triggered = decision === 'LEAVE_AND_SWAP';

  const payload: SurveyPayload = {
    session_metadata: {
      session_token: getSessionToken(),
      fitting_room_id: fittingRoomId,
      timestamp_utc: new Date().toISOString(),
    },
    active_product_context: {
      scanned_sku: product.scanned_sku,
      style_group_id: product.style_group_id,
      current_size: product.current_size,
      current_color_code: product.current_color_code,
      categorical_tags: product.categorical_tags,
    },
    step_1_granular_sentiment_matrix: sentiment,
    step_2_universal_conversion_intent: {
      user_decision: decision,
      recommender_pipeline_triggered: triggered,
    },
    hybrid_recommender_routing_directives: triggered
      ? buildRoutingDirectives(sentiment, product)
      : null,
  };

  return payload;
}
