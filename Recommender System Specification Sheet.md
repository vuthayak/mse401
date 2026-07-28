# Technical Specification Document: Alternative Item Recommender System

**System Name:** Digital Fitting Room Companion – Alternative Item Recommender

**Core Purpose:** Real-time feedback processing and alternative item candidate retrieval

**Architecture Pattern:** 2-Stage Hybrid (Rule-Based Heuristic Filter + LLM Feedback-Driven Stylist)

**Primary Tech Stack:** Supabase (Postgres + `pgvector`), FastAPI, Localized / Cloud LLM

---

## 1. Executive Summary & Operational Scope

This document defines the production specification for the Digital Fitting Room Companion's recommendation engine. Built specifically to fit constrained retail development schedules, the engine operates on an **Alternatives-Only Framework**. It explicitly omits complex complementary ("complete the look") recommendation pipelines in favor of high-accuracy item substitution.

The system ingests real-time 5-point Likert scale feedback across four primary garment dimensions (**Price, Fit, Fabric, Colour**) collected via in-room tablets. It processes these inputs through a two-stage pipeline to surface immediate inventory replacements (different sizing, alternative colorways, budget-conscious options, or structural material swaps) with a total target latency under 5 seconds.

---

## 2. Core Architectural Strategy (2-Stage Pipeline)

```
[Tablet UI: 4-Dimension Likert Vector]
                  │
                  ▼
   ┌──────────────────────────────┐
   │  Stage 1: Heuristic Filter   │ ──(Queries Supabase Store Inventory)
   │  (In-Stock Hard Boundaries) │ ──(Applies Conditional Swaps)
   └──────────────┬───────────────┘
                  │ Candidate Pool
                  ▼
   ┌──────────────────────────────┐
   │ Stage 2: Feedback LLM Engine │ ──(Constructs Dynamic Search Vector)
   │ (Attribute Similarity Shift) │ ──(Ranks & Curates Final Alternatives)
   └──────────────┬───────────────┘
                  │
                  ▼
[Tablet UI: Surfaced Alternative Items]

```

### Stage 1: Deterministic Heuristic Filter

* **Objective:** Eliminate operational friction by ensuring a shopper is never recommended an item that is out of stock in the local storefront.
* **Execution:** When a shopper interacts with the tablet, a lightweight SQL query executes against Supabase. It filters out any global catalog item whose local store inventory count equals `0` for the target location.

### Stage 2: LLM Feedback-Driven Tuning Engine

* **Objective:** Translate explicit user dissatisfaction across the four dimensions into targeted candidate rankings without training heavy custom machine learning models.
* **Execution:** A FastAPI service compiles current garment metadata, active store stock, and the active session's **4-Dimension Survey Vector** ($V = [\text{Price}, \text{Fit}, \text{Fabric}, \text{Colour}]$, where each dimension is integer-rated 1–5) into a structured prompt. The LLM acts as an execution layer, ranking candidate items returned by vector similarity.

---

## 3. Physical Retail Data & Edge Handling

### Cold-Start & Data Sparsity Strategy

The recommender is strictly item-attribute and session-driven. Recommendations depend only on the metadata of clothes currently brought into the fitting room and active tablet feedback. **Zero historical user profile data is required or used.**

### Partial Survey Submissions (Neutral Baseline Policy)

Shoppers may submit feedback without adjusting all four dimension sliders. To maintain vector integrity without throwing execution errors:

* **Rule:** Any unrated dimension automatically defaults to a neutral score of `3` (Satisfactory).
* **Formula:** $V_{\text{active}} = [\text{Price}_{\text{obs}}, \text{Fit}_{\text{obs}}, 3, 3]$

### Negative Variance Focus (Low-Score Triggers)

Retail survey data heavily skews positive or neutral because shoppers rarely complain unless a specific issue arises. The system focuses explicitly on **negative variance**:

* Any rating $\le 2$ on a dimension acts as an immediate programmatic override trigger, forcing a pivot or hard filter in the retrieval candidate pool.

---

## 4. Computational Encoding of Replacement Logic

When a score of $\le 2$ is submitted, the system triggers specific programmatic rules before performing similarity vector scoring:

| Survey Dimension | Trigger Condition | Backend Programmatic Action | UX / Business Outcome |
| --- | --- | --- | --- |
| **Fit** | Score $\le 2$<br>

<br>*(e.g., "Too tight" / "Too loose")* | Query local inventory for identical `Style_ID` where `Size` == `Current_Size` $\pm 1$. | Resolves sizing discomfort without requiring the user to leave the room or re-dress. |
| **Fabric** | Score $\le 2$<br>

<br>*(e.g., "Scratchy" / "Stiff")* | Apply a hard SQL `NOT IN` filter on the current `Material_ID` across candidate items. | Pivots to comfortable alternatives (e.g., swapping synthetic polyester to organic cotton/linen). |
| **Colour** | Score $\le 2$<br>

<br>*(e.g., "Unflattering")* | Exclude current `Color_ID`; query local store database for alternative available colorways of the identical SKU. | Preserves purchase intent when the garment silhouette works but aesthetic preference fails. |
| **Price** | Score $\le 2$<br>

<br>*(e.g., "Too expensive")* | Apply a price threshold filter where `Unit_Price` $\le 0.75 \times \text{Current\_Price}$. | Prevents cart abandonment by surfacing budget-conscious alternative substitutes. |

---

## 5. Vectorization & Attribute Similarity (`pgvector`)

### Dynamic Search Vector Modification

To calculate structural item similarity for substitute recommendations, candidate item embeddings stored in Supabase via `pgvector` are adjusted using the survey vector weights:

* **Positive Weights (Scores 4–5):** Maintain baseline profile features. If Price is rated `5`, the system preserves or increases the price bracket anchor.
* **Negative Overrides (Scores 1–2):** Function as mathematical penalties. If Fabric is rated `1`, the engine applies a negative multiplier (e.g., $-1.0$) to the material embedding sub-vector, forcing distance algorithms to favor distinct material alternatives.

### Indexing Approach

* **Extension:** Supabase `pgvector`
* **Indexing Method:** Hierarchical Navigable Small World (**HNSW**)
* **Rationale:** HNSW provides Approximate Nearest Neighbor (ANN) lookup in single-digit milliseconds inside relational Postgres queries, avoiding the maintenance overhead of dedicated vector databases (e.g., Pinecone or Milvus).

---

## 6. Infrastructure, Privacy, and PIPEDA Compliance

### System Architecture Stack

* **Database & Vector Store:** Supabase (Managed Postgres + `pgvector`)
* **API Middleware:** FastAPI (Python 3.11+) handling prompt construction and score encoding
* **Client Interface:** In-room tablet web application

### Anonymous Session-Based Tokenization

To comply fully with PIPEDA (Personal Information Protection and Electronic Documents Act) and standard data privacy practices:

* Interaction data is keyed strictly to an ephemeral session token and a UTC timestamp (coarsened to the hour for retailer analytics).
* No Personally Identifiable Information (PII) or shopper profiles are captured or linked.
* Session linkage (`session_token`) is purged from persisted survey rows after **24 hours**. The in-memory kiosk token is cleared on Start Over or page reload. Item-request rows used for staff fulfillment are deleted after **7 days**.

---

## 7. Implementation Milestones

1. **Milestone 1: Supabase Setup & Schema Design:** Core Infrastructure.
Provision the Supabase project. Define relational tables for store inventory, SKU variations, and garment attributes. Enable the `pgvector` extension.


2. **Milestone 2: Rule Engine & Logic Gates:** Stage 1 Pipeline.
Develop the FastAPI endpoints for Stage 1. Code deterministic logic gates that map 1–5 Likert scale inputs to immediate SKU, size, color, and price threshold shifts.


3. **Milestone 3: Vector Indexing & Substitute Search:** pgvector Integration.
Generate dense item embeddings for catalog items. Implement HNSW indexed cosine similarity queries in Supabase to surface structural garment substitutes.


4. **Milestone 4: LLM Context Integrator:** Stage 2 Pipeline.
Build the prompt constructor in FastAPI to pass filtered candidate pools, Likert feedback vectors, and inventory constraints to the LLM ranking layer.


5. **Milestone 5: Privacy Audit & Edge Optimization:** Deployment Readiness.
Implement automatic session-token retention purge in Supabase (24-hour null-out of `session_token`, 7-day deletion of `item_requests`). Conduct data audits to verify zero PII persistence and validate end-to-end response latency (< 5 seconds).


---