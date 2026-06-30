# Survey Specification Sheet

**Purpose:** This specification sheet serves as an execution-ready technical prompt for a downstream Large Language Model (LLM). It provides the exact guardrails, survey methodology constraints, architectural logic, and output schemas required to dynamically generate user-facing micro-surveys that flexibly capture both positive affinity and negative friction for an inline, per-item product view inside a physical retail digital fitting room stall.

## 1. Survey Sequence + Logical Flow Architecture

To maximize response flexibility while keeping interaction time under 20 seconds per item, the system completely avoids multi-page forks and linear negative-only structures. Instead, it uses a top-down chronological sequence directly inside the active product listing card:

```
[STEP 1: Granular Attribute Evaluation Matrix]
  ├── Forced-choice single-tap buttons evaluating 4 core axes.
  └── Captures BOTH positive ("Liked Fabric") and negative ("Disliked Fit") signals.
                          │
                          ▼
[STEP 2: Universal Conversion Decision Screen]
  └── Balanced binary choice stem ("Purchase" vs. "Leave Behind").
                          │
                          ▼
             [UNIVERSAL INTENT EVALUATION]
             /                           \
     If Positive Outlook           If Negative Outlook
           /                               \
[Relational DB Write]         [RE RECOMMENDER PIPELINE STEP-IN ZONE]
(Log product feature           └── Ingests Step 1's combined matrix.
 affinity data for retail      └── Stage 1/2 executes Hybrid Search:
 trend optimizations)              • MAINTAIN positive attributes.
                                   • MUTATE/FIX negative attributes.

```

## 2. Core Architectural Context + System Constraints

- **Target Interface:** Inline micro-survey module pinned to individual product layout cards within an interactive, scrollable list layout. Survey inputs are isolated and evaluated independently per scanned item.
- **Data Privacy Compliance (PIPEDA):** In strict compliance with the *Personal Information Protection and Electronic Documents Act (PIPEDA)*, the generated survey text and backend tracking engines must never collect, request, or store Personally Identifiable Information (PII). Data packets are keyed entirely to an anonymous, ephemeral session UUID held in temporary cache memory, which is completely purged after 10 minutes of stall inactivity or upon room clearance.

## 3. Methodological Survey Rules

The downstream generator must strictly construct the survey choices and text strings using established user experience research and self-reported analytics guidelines:

- **Balanced Stems on the Intent Screen:** The final conversion question must explicitly state both alternatives within its prompt text to avoid compliance and confirmation bias (e.g., *"Do you plan to purchase or leave behind this garment?"* instead of *"Are you buying this garment?"*).
- **Forced-Choice Over Multi-Select Checkboxes:** For Step 1's feature matrix, the generator must use nominal closed-ended forced-choice option items (discrete standalone tap buttons per axis) rather than a single multi-select checkbox list. Every axis evaluated must have an explicit selection to prevent unselected choices from skewing the recommender engine's calculations.
- **Completely Labeled, Balanced Dimensions:** All option menus and toggle targets must feature clear, direct, descriptive everyday labels (avoiding internal retail product nomenclature or technical data codes). Intervals must be conceptually placed at equal distances from neutral positions.
- **Anti-Double-Barreling:** Ensure each single button interaction evaluates exactly one product vector at a time (e.g., do not combine size and cut into a single selection like *"Tight & Short"*).

## 4. High-Level Question + Selection Specifications

### STEP 1: The Multi-Axis Attribute Evaluation Matrix (Granular Assessment)

- **Objective:** Capture a distinct multi-dimensional map of product attribute sentiment to preserve high-affinity traits while identifying explicit friction points.
- **Question Type:** Closed-ended nominal forced-choice evaluation tabs per category block.
- **High-Level Parameters:** The generated UI blocks must gather separate feedback across the **4 Strategic Recommender Axes** with both positive and negative values:
  1. **Size/Fit Axis:** Values map to `[Too Small / Perfect / Too Large]`.
  2. **Colorway Axis:** Values map to `[Dislike Shade / Love Color]`.
  3. **Cut/Silhouette Axis:** Values map to `[Uncomfortable Proportions / Flattering Cut]`.
  4. **Material Property Axis:** Values map to `[Harsh Fabric / Premium Texture]`.

### STEP 2: The Universal Intent Screen (The Gatekeeper)

- **Objective:** Determine final conversion outcome and execute the programmatic branching logic for the recommendation pipeline.
- **Question Type:** Closed-ended nominal binary selection with a balanced stem.
- **High-Level Parameters:** Capture the shopper's closing basket action for that specific item card (e.g., *"Keep & Wear"* vs. *"Leave/Swap"*).

## 5. Technical Recommender Handoff Logic

If a user selects a Negative Outlook (`"Leave/Swap"`) at Step 2, the pipeline immediately ingests Step 1's array to process a Hybrid Recommendation:

1. **Stage 1 Heuristic Filters (Deterministic Lookups):** If the size/fit axis contains a negative vector (`Too Small`), the system instantly flags an offset parameter (`+1 Size`) but maintains the current style code context if other traits were positive.
2. **Stage 2 Localized LLM Stylist (Probabilistic Embedding Shifts):** If the user selects a negative signal for `Cut/Silhouette` but registers a positive signal for `Material Property`, the pipeline injects an explicit constraint into the Stage 2 text generation router. The stylist system locks the fabric type (e.g., `100% Linen`) while executing a similarity vector search across different relaxed silhouette definitions, immediately serving up alternative garments that bypass the structural discomfort.

## 6. Expected Hybrid Technical Output Schema

The frontend interface must serialize all multi-axis selections into the following uniform JSON payload. This allows the backend routers to execute hybrid matching calculations seamlessly regardless of how mixed the customer's affinity profile is.

(Note: The raw schema layout has been programmatically repaired below into valid JSON syntax while retaining all core keys and mappings):

JSON

```
{
  "session_metadata": {
    "session_token": "anon_cache_uuid_883102V",
    "fitting_room_id": "STALL_03",
    "timestamp_utc": "2026-06-21T10:14:22Z"
  },
  "active_product_context": {
    "scanned_sku": "SKU-49120-BLU-MED",
    "style_group_id": "STYLE-49120",
    "current_size": "M",
    "current_color_code": "BLU",
    "categorical_tags": [
      "Material: 100% Linen",
      "Style: Slim-Fit-Blazer"
    ]
  },
  "step_1_granular_sentiment_matrix": {
    "size_fit": {
      "captured_signal": "TOO_SMALL",
      "valence": "NEGATIVE"
    },
    "colorway": {
      "captured_signal": "LOVE_COLOR",
      "valence": "POSITIVE"
    },
    "cut_silhouette": {
      "captured_signal": "UNCOMFORTABLE_SHOULDERS",
      "valence": "NEGATIVE"
    },
    "material_property": {
      "captured_signal": "PREMIUM_TEXTURE",
      "valence": "POSITIVE"
    }
  },
  "step_2_universal_conversion_intent": {
    "user_decision": "LEAVE_AND_SWAP",
    "recommender_pipeline_triggered": true
  },
  "hybrid_recommender_routing_directives": {
    "stage_1_heuristic_execution": {
      "action": "QUERY_SAME_STYLE_INVENTORY_OFFSET",
      "parameters": {
        "target_size_operator": "+1",
        "fallback_strategy": "PASS_TO_STAGE_2"
      }
    },
    "stage_2_llm_stylist_hybrid_override": {
      "action": "EXECUTE_HYBRID_SUBSTITUTION_PROMPT",
      "parameters": {
        "attributes_to_lock_and_match": [
          "Material: 100% Linen",
          "Color_Code: BLU"
        ],
        "attributes_to_penalize_and_mutate": [
          "Style: Slim-Fit-Blazer",
          "Fit: Too_Small"
        ],
        "target_recommendation_strategy": "REPLACEMENT_GARMENT_ONLY",
        "vector_multiplier": 1.5
      }
    }
  }
}

```

## Instructions for Downstream LLM Generation

1. Ensure the user-facing text for Step 1 translates the technical targets into clear, minimal, one-tap visual elements (e.g., simple thumbs-up/thumbs-down icons or small unipolar chips grouped per axis).
2. Strictly generate layout labels that follow the balanced question-stem rule on the conversion decision tier.
3. Ensure the JSON mapping names are preserved so that the data payload pipelines seamlessly into the 2-Stage Recommender Architecture modules.

