# Fitting Room Sample Surveys

Lo-fi iPad kiosk prototype for collecting per-item fitting-room feedback.

## What's included

| Route | Screen |
|-------|--------|
| `/` | Landing — survey, attendant, or insights |
| `/survey-c` | Survey C: cart items → rate each (skip / finish early) → purchase intent |
| `/attendant` | Attendant — check-in carts, room carts, live request queue |
| `/insights` | Retailer dashboard home — executive KPIs + SKU performance |
| `/insights/c/:apparel/:design/:sku/:variation` | Category drill-down pages (each segment optional) |

**Survey C flow**
1. An attendant assigns catalog items + sizes to a fitting room via the check-in panel on `/#/attendant` (dev stand-in for barcode scanning)
2. The kiosk at `/#/survey-c?room=N` loads that room's cart (or waits if empty)
3. Rate Fabric, Fit, Colour, and Price for each item (skip or finish early anytime)
4. Answer purchase intent (`YES` / `NO`)
5. On `NO`, the [recommender API](backend/README.md) returns up to three in-stock alternatives; the shopper can request a size or an alternative to their room

Carts auto-clear after **10 minutes** of no shopper activity, or when the attendant clears the room. Responses store catalog `variation_id`s as `selected_item`. Item requests land in `item_requests` and appear on `/#/attendant`.

## Alternative item recommender

When a shopper declines to buy, the tablet posts their rating vector to a FastAPI
service that runs the two-stage pipeline from
[`Recommender System Specification Sheet.md`](Recommender%20System%20Specification%20Sheet.md):

| Stage | Where | What it does |
|-------|-------|--------------|
| 1 — heuristic filter | `stage1_candidates()` in Postgres | Hard boundaries over live inventory: in stock only, size ±1 when fit is off, different `material_id` when fabric is rated ≤2, alternate colourway when colour is rated ≤2, `unit_price ≤ 0.75×` when price is rated ≤2 |
| 2a — attribute similarity | pgvector HNSW | Cosine search over the Stage 1 pool. The query vector is `embed(what they want) − penalty × embed(what they rejected)`, so it points away from the garment that just failed |
| 2b — ranking | Gemini | Reorders and explains, restricted to the Stage 1 pool. Any item id it invents is discarded |

The recommendation pool is the full catalog (21 styles / 23 colourways / 69 SKUs
across `public/items/`); the fitting-room picker stays at the original five.

Every stage degrades instead of failing. No Gemini key, a rate limit, or an
outage all fall back to the deterministic rule ordering, so the tablet always
shows something. If `VITE_RECOMMENDER_API_URL` is unset the survey still records
responses and the result screen says recommendations are unavailable.

Setup, deployment, and the request/response contract are in
[`backend/README.md`](backend/README.md).

## Retailer insights dashboard

`/insights` loads Survey C responses once via the `get_survey_c_insights_rows` RPC and shares them across pages. Session tokens are never exposed to the dashboard.

**Home** (`/insights`)
- *Executive summary:* fitting-room try-ons, conversion rate, lost revenue, primary rejection reason
- *Try-on volume chart:* dual-axis bars (try-ons) + line (conversion %) with an adjustable period (default 1 month)
- *Browse by category:* entry points into each apparel type
- *SKU performance:* top and worst performers with try-ons, conversion, driver attribute, past-week revenue, and a suggested action

**Category pages** (`/insights/c/...`) drill through apparel type → design type → SKU → variation. Every level shows the same four KPIs plus attribute health, aggregated over all variations beneath it. Breadcrumbs and deep links work at any depth.

### How derived metrics are calculated

The survey collects ratings and intent only — it has no pricing, revenue, or merchandising data. Three dashboard figures are therefore derived:

| Metric | Derivation |
|--------|------------|
| Realized / unrealized revenue | Each try-on counts as one potential unit at the SKU list price. `YES` intent → realized, `NO` → unrealized (lost). Prices in `src/lib/catalogTaxonomy.ts` mirror `sku_variations.unit_price` in the Supabase catalog, so the dashboard and a recommendation can never quote different figures. |
| Primary rejection reason | Among walk-aways (`NO`), the attribute most often rated ≤2. Top performers show the mirror image: the attribute most often rated ≥4 by buyers. |
| Suggested action | A fixed playbook in `src/lib/storeInsights.ts` mapping the driver attribute to a merchandising step. Heuristics over survey signal, not learned recommendations. Low-sample SKUs (<5 try-ons) are flagged instead. |
| Try-on volume / conversion over time | Rows are filtered to the selected window (7d / 1m / 3m / all), then bucketed: daily for ≤1 month, weekly for 3 months, weekly or monthly for all-time depending on span. Empty buckets are filled so the axis stays continuous. Conversion % is purchases ÷ try-ons within each bucket. |

Top and worst performer lists are split by conversion relative to the store average, then ranked by revenue — ranking both on revenue alone would let an expensive, high-traffic SKU top both lists. "Past week" falls back to all-time when the last 7 days have no responses.

Two earlier variants, **Survey A** (one question per screen) and **Survey B** (thumbs up/down), still live in `src/surveys/` with their own tables, but they are not routed or linked. To bring one back, re-add its import and `<Route>` in `src/App.tsx` plus a `<Link>` in `src/components/Landing.tsx`.

No personal data is collected — only anonymous session tokens and product feedback.

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm**

```bash
node -v
npm -v
```

## Installation

```bash
npm install
```

## Running locally

### Development server

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/`).

To test from an iPad on the same network:

```bash
npm run dev -- --host
```

Then visit `http://<your-computer-ip>:5173/` from the iPad.

### Production build + preview

```bash
npm run build
npm run preview
```

`npm run build` outputs static files to `dist/`. `npm run preview` serves that build locally.

### GitHub Pages

This app is hosted on **GitHub Pages**.

**One-time setup**
1. Push this repo to GitHub (repo name `mse401`, or update `base` in [`vite.config.ts`](vite.config.ts)).
2. **Settings → Pages → Build and deployment** → set **Source** to **GitHub Actions** (not “Deploy from branch”).
3. If the site was previously deployed from the `main` branch, switching to GitHub Actions is required — otherwise GitHub serves the raw dev `index.html` and you get a **blank page**.

**Deploy:** Push to `main`. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds and deploys `dist/`.

**Live URL:** `https://<your-github-username>.github.io/mse401/`

**Verify:** View page source on the live site. You should see `/mse401/assets/index-….js`, **not** `/src/main.tsx`.

**iPad:** Open that URL in Safari → **Share → Add to Home Screen**.

> If your repo is not named `mse401`, change the `base` path in `vite.config.ts` to `/<your-repo-name>/`.

## Supabase setup

Survey responses are stored in Supabase when credentials are configured.

### 1. Create the tables

In Supabase → **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql).

That creates `survey_a_responses`, `survey_b_responses`, and `survey_c_responses`, with **anonymous inserts only** (no direct public table reads).

If A and B already exist and you only need Survey C, run [`supabase/add-survey-c-table.sql`](supabase/add-survey-c-table.sql) instead.

Then run [`supabase/add-survey-c-insights-rpc.sql`](supabase/add-survey-c-insights-rpc.sql), then [`supabase/add-insights-aggregates.sql`](supabase/add-insights-aggregates.sql) so `/insights` loads **day × item × intent aggregates** (no individual responses) for the anon key. Also run [`supabase/add-retention-policy.sql`](supabase/add-retention-policy.sql) for 24-hour session-token purge, 1-day item-request deletion, and cleared-cart cleanup.

For fitting-room carts, item requests, and the attendant screen, also run (after the recommender catalog exists):

1. [`supabase/add-item-requests-table.sql`](supabase/add-item-requests-table.sql) — `item_requests` table
2. [`supabase/add-size-options-rpc.sql`](supabase/add-size-options-rpc.sql) — size chips (survey slug + variation id RPCs)
3. [`supabase/add-attendant-queue.sql`](supabase/add-attendant-queue.sql) — `fitting_room` column, `get_room_requests` / `set_request_status` RPCs, anon SELECT + Realtime publication
4. [`supabase/add-fitting-room-carts.sql`](supabase/add-fitting-room-carts.sql) — carts + cart items, check-in / clear / idle-expiry RPCs, catalog list, Realtime
5. Optional demo seed: [`supabase/seed-attendant-demo.sql`](supabase/seed-attendant-demo.sql) — pending requests + an active room-2 cart

The attendant screen prefers **Supabase Realtime** (`item_requests`, `fitting_room_carts`, and `fitting_room_cart_items` in the `supabase_realtime` publication). If Realtime is unavailable it falls back to polling every 4 seconds.

### 2. Seed Survey C (optional)

To load ~60 synthetic rows for analysis / demos, run [`supabase/seed-survey-c.sql`](supabase/seed-survey-c.sql) after the table exists. Safe to re-run only if you clear existing seed rows first (see comments in that file).

### 3. Create the product catalog

The recommender needs a catalog to search. In **SQL Editor**, run in order:

1. [`supabase/recommender-schema.sql`](supabase/recommender-schema.sql) — catalog tables, `pgvector`, HNSW index, RLS
2. [`supabase/recommender-seed.sql`](supabase/recommender-seed.sql) — 21 styles / 23 colourways / 69 SKUs with stock
3. [`supabase/recommender-rpc.sql`](supabase/recommender-rpc.sql) — `stage1_candidates` + `search_similar_variations`

Then generate embeddings once (see [`backend/README.md`](backend/README.md)):

```bash
cd backend && .venv/bin/python -m app.embeddings
```

### 4. Get your API keys

Supabase → **Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL` (frontend) and `SUPABASE_URL` (backend)
- **anon public** key → `VITE_SUPABASE_ANON_KEY`
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (backend only — never ship it to the browser)

### 5. Local development

```bash
cp .env.example .env.local
```

Fill in your values, then `npm run dev`. Without `.env.local`, surveys still work but only log to the console.

To get recommendations locally, also start the API (see [`backend/README.md`](backend/README.md)) and point `VITE_RECOMMENDER_API_URL` at it.

### 6. GitHub Pages (production)

Add repository secrets (**Settings** → **Secrets and variables** → **Actions**):

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon public key |
| `VITE_RECOMMENDER_API_URL` | Public URL of the deployed recommender API, e.g. `https://<service>.onrender.com` |

Push to `main` to redeploy with database support baked into the build.

Pages is a static host, so the recommender runs as a separate Render service. Only its URL reaches the browser — the Gemini and service-role keys stay on that host.

### Viewing responses

In-app: open **`/#/insights`** for the retailer dashboard, or **`/#/attendant`** for the live fitting-room request queue.

Survey kiosks load the cart assigned to their fitting room (`/#/survey-c?room=4`, clamped to 1–5). Empty rooms show a waiting screen until the attendant checks items in.

Or Supabase → **Table Editor** → `survey_c_responses`. Each row:

| Column | Type | Notes |
|--------|------|-------|
| `session_token` | text | Anonymous session UUID (not shown on the insights dashboard) |
| `selected_item` | text | Item id (e.g. `nike-windbreaker`) |
| `fabric` / `fit` / `colour` / `price` | smallint | 1–5 scale |
| `intent` | text | `YES` or `NO` |

## Survey C details

**Items** (from `SURVEY_ITEMS` in `src/types/survey.ts`):

| Id | Product |
|----|---------|
| `nike-windbreaker` | Nike Windrunner Windbreaker |
| `adidas-track-jacket` | Adidas Santiago Track Jacket |
| `waterloo-hoodie` | University of Waterloo Zip Hoodie |
| `black-zip-hoodie` | Essential Full-Zip Hoodie |
| `chevrolet-jersey` | Chevrolet Graphic Jersey Tee |

**Scale:** 1 = hate it … 5 = love it (fit uses the same endpoints; underlying labels run too loose → too tight).

**Intent stem:** *Do you plan on purchasing this item, or leave and get recommendations?*

## Project structure

```
src/
├── App.tsx                      # Routes (Survey C + attendant + insights)
├── components/
│   ├── Landing.tsx
│   ├── attendant/
│   │   ├── AttendantScreen.tsx  # Queue + check-in + room carts
│   │   ├── CheckInPanel.tsx     # Dev assign items to a room
│   │   ├── RoomCartCard.tsx     # Per-room cart + Clear room
│   │   ├── RequestCard.tsx
│   │   └── RoomStrip.tsx
│   ├── insights/
│   │   ├── InsightsLayout.tsx   # Shared header + one-time data load
│   │   ├── InsightsHome.tsx     # Executive KPIs + volume chart + SKU performance
│   │   ├── TryOnVolumeChart.tsx # Dual-axis try-ons / conversion over time
│   │   ├── CategoryPage.tsx     # Apparel → design → SKU → variation
│   │   ├── SkuPerformanceTable.tsx
│   │   ├── Kpi.tsx
│   │   └── RatingBar.tsx
│   ├── CartItemSelection.tsx    # Kiosk cart list (rate / skip / done)
│   ├── CartWaiting.tsx          # Waiting for attendant assignment
│   ├── ItemSelection.tsx        # Static picker (Survey A/B)
│   ├── ProductHeader.tsx
│   ├── ScaleAxisPanel.tsx
│   ├── RecommenderScreen.tsx
│   ├── ResponsePreview.tsx
│   └── SaveStatus.tsx
├── lib/
│   ├── persistSurvey.ts         # Flat inserts for A / B / C
│   ├── itemRequests.ts          # Fitting-room item request inserts
│   ├── attendantQueue.ts        # Attendant RPCs + Realtime/polling
│   ├── carts.ts                 # Fitting-room cart RPCs + idle helpers
│   ├── catalogItems.ts          # Catalog list for check-in
│   ├── useFittingRoomCart.ts    # Kiosk cart subscription hook
│   ├── realtimeSubscription.ts  # Shared Realtime + polling fallback
│   ├── fittingRoom.ts           # Room number parse (default 2)
│   ├── motion.ts                # Shared spring presets + reduced-motion hook
│   ├── fetchSurveyCInsights.ts  # Insights RPC fetch
│   ├── surveyCInsights.ts       # Rating aggregates
│   ├── storeInsights.ts         # Revenue, drivers, volume-over-time, actions
│   ├── catalogTaxonomy.ts       # Full catalog hierarchy (69 variation leaves)
│   ├── recommendItem.ts         # Recommender API client
│   ├── session.ts               # Ephemeral anonymous session UUID
│   └── supabase.ts
├── surveys/
│   ├── SurveyC.tsx              # Active survey (privacy gate + C)
│   ├── SurveyScaleMulti.tsx     # Cart-driven C layout/logic
│   ├── SurveyA.tsx              # Kept, not routed
│   └── SurveyB.tsx              # Kept, not routed
└── types/survey.ts

supabase/
├── schema.sql                   # Survey response schema + RLS
├── add-survey-c-table.sql       # Incremental C table only
├── add-survey-c-insights-rpc.sql # Dashboard read RPC
├── seed-survey-c.sql            # Synthetic Survey C rows
├── add-item-requests-table.sql  # Fitting-room item requests
├── add-size-options-rpc.sql     # Size chips for the recommender screen
├── add-attendant-queue.sql      # Attendant RPCs + Realtime
├── add-fitting-room-carts.sql   # Carts, check-in RPCs, 10-min idle expiry
├── seed-attendant-demo.sql      # Demo requests + room-2 cart
├── add-retention-policy.sql     # 24h session null / 1d requests / cart cleanup
├── recommender-schema.sql       # Catalog, inventory, pgvector + HNSW
├── recommender-seed.sql         # 21 styles / 23 colourways / 69 SKUs
├── recommender-rpc.sql          # Stage 1 rule engine + vector search
├── fix-rls.sql
└── migrate-intent-yes-no.sql

backend/                         # FastAPI recommender — see backend/README.md
├── app/
│   ├── main.py                  # CORS, /health, POST /recommend
│   ├── rules.py                 # Stage 1 driver + relaxation ladder + reasons
│   ├── vector_search.py         # pgvector query steering
│   ├── ranker.py                # Stage 2 Gemini ranking + fallback
│   ├── embeddings.py            # One-off catalog embedding backfill
│   ├── gemini_client.py
│   ├── supabase_client.py
│   ├── catalog_text.py
│   ├── config.py
│   └── schemas.py
├── tests/
└── render.yaml
```

## iPad / kiosk tips

- Use Safari on iPad in landscape or portrait — layouts use `100dvh` and safe-area padding.
- In desktop Chrome DevTools, try iPad dimensions (e.g. 1024×768).
- Add to Home Screen for a more kiosk-like experience.
- Open DevTools → Console to inspect submitted `survey_c_response` objects.
- Target interaction time is under ~20 seconds per item.

## Packaging for Google Drive

When creating a zip to share:

**Include:** source (`src/`, `index.html`, `package.json`, `package-lock.json`, configs), `Survey Specification Sheet.md`, `README.md`

**Exclude:** `node_modules/`, `dist/`, `.DS_Store`

```bash
zip -r mse401-fitting-room-surveys.zip mse401 \
  -x "mse401/node_modules/*" \
  -x "mse401/dist/*" \
  -x "mse401/.DS_Store"
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `npm install` fails | Confirm Node.js 18+; delete `node_modules` and retry |
| Port 5173 in use | Vite picks the next free port, or stop the other process |
| Could not save to database | Run `supabase/schema.sql` or `add-survey-c-table.sql`; confirm anon RLS insert policy; check browser console |
| Insights dashboard fails to load | Run `supabase/add-survey-c-insights-rpc.sql`; confirm Supabase env vars; check browser console |
| "Recommendations are not configured" | `VITE_RECOMMENDER_API_URL` is unset at build time. Set it in `.env.local` locally, or as a GitHub Actions secret for Pages |
| "Could not reach the recommendation service" | API is down or the origin is not in its `CORS_ORIGINS`. Check `GET <api>/health` |
| First recommendation is slow, later ones fast | Render's free plan sleeps when idle. The client waits up to 25s and shows a loading state |
| Recommendations ignore style similarity | `item_embeddings` is empty — run `python -m app.embeddings`. `GET <api>/health` reports the count |
| Blank page on GitHub Pages | Pages **Source** is still “Deploy from branch → main”. Change to **GitHub Actions**, then re-run the deploy workflow. View source: if you see `/src/main.tsx`, `dist/` is not being served. |
| Blank page after local build | Run `npm run build && npm run preview` and open `http://localhost:4173/mse401/` |
| iPad can't reach dev server | Use `npm run dev -- --host` and allow the port through your firewall |

## Privacy note

This prototype uses an in-memory anonymous session UUID only (adopted from the cart when one is assigned). It does not collect names, emails, or other PII. Session linkage on stored survey rows is purged after 24 hours; item requests after 1 day; cleared carts after 24 hours (see `supabase/add-retention-policy.sql`). A footer on each screen states: *"Anonymous session — no personal data collected."* See [PRIVACY.md](PRIVACY.md) for the full notice.

## Tech stack

- React 19 + TypeScript
- Vite 7
- React Router 7
- Supabase (Postgres)
