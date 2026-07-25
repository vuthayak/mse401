# Fitting Room Sample Surveys

Lo-fi iPad kiosk prototype for collecting per-item fitting-room feedback.

## What's included

| Route | Screen |
|-------|--------|
| `/` | Landing — survey or insights |
| `/survey-c` | Survey C: item picker → 2×2 grid of 5-point scales → purchase intent |
| `/insights` | Retailer dashboard home — executive KPIs + SKU performance |
| `/insights/c/:apparel/:design/:sku/:variation` | Category drill-down pages (each segment optional) |

**Survey C flow**
1. Pick one of five items
2. Rate Fabric, Fit, Colour, and Price on a 5-point scale (all on one screen)
3. Answer purchase intent (`YES` / `NO`)
4. On `NO`, a mock recommender suggests an alternative item

On completion the response is saved to `survey_c_responses` in **Supabase** (when configured), shown on screen, and logged to the console as `survey_c_response`.

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
| Realized / unrealized revenue | Each try-on counts as one potential unit at the SKU list price in `src/lib/catalogTaxonomy.ts`. `YES` intent → realized, `NO` → unrealized (lost). **Prices are placeholders — replace them with real catalog pricing.** |
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

Then run [`supabase/add-survey-c-insights-rpc.sql`](supabase/add-survey-c-insights-rpc.sql) so the `/insights` dashboard can load rows (without exposing `session_token`).

### 2. Seed Survey C (optional)

To load ~60 synthetic rows for analysis / demos, run [`supabase/seed-survey-c.sql`](supabase/seed-survey-c.sql) after the table exists. Safe to re-run only if you clear existing seed rows first (see comments in that file).

### 3. Get your API keys

Supabase → **Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 4. Local development

```bash
cp .env.example .env.local
```

Fill in your values, then `npm run dev`. Without `.env.local`, surveys still work but only log to the console.

### 5. GitHub Pages (production)

Add repository secrets (**Settings** → **Secrets and variables** → **Actions**):

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon public key |

Push to `main` to redeploy with database support baked into the build.

### Viewing responses

In-app: open **`/#/insights`** for the retailer dashboard.

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
| `black-zip-hoodie` | Black Zip-Up Hoodie |
| `chevrolet-jersey` | Chevrolet Racing Jersey |

**Scale:** 1 = hate it … 5 = love it (fit uses the same endpoints; underlying labels run too loose → too tight).

**Intent stem:** *Do you plan on purchasing this item, or leave and get recommendations?*

## Project structure

```
src/
├── App.tsx                      # Routes (Survey C + insights)
├── components/
│   ├── Landing.tsx
│   ├── insights/
│   │   ├── InsightsLayout.tsx   # Shared header + one-time data load
│   │   ├── InsightsHome.tsx     # Executive KPIs + volume chart + SKU performance
│   │   ├── TryOnVolumeChart.tsx # Dual-axis try-ons / conversion over time
│   │   ├── CategoryPage.tsx     # Apparel → design → SKU → variation
│   │   ├── SkuPerformanceTable.tsx
│   │   ├── Kpi.tsx
│   │   └── RatingBar.tsx
│   ├── ItemSelection.tsx
│   ├── ProductHeader.tsx
│   ├── ScaleAxisPanel.tsx
│   ├── RecommenderScreen.tsx
│   ├── ResponsePreview.tsx
│   └── SaveStatus.tsx
├── lib/
│   ├── persistSurvey.ts         # Flat inserts for A / B / C
│   ├── fetchSurveyCInsights.ts  # Insights RPC fetch
│   ├── surveyCInsights.ts       # Rating aggregates
│   ├── storeInsights.ts         # Revenue, drivers, volume-over-time, actions
│   ├── catalogTaxonomy.ts       # Category hierarchy + list prices
│   ├── recommendItem.ts         # Mock recommender
│   ├── session.ts               # Ephemeral anonymous session UUID
│   └── supabase.ts
├── surveys/
│   ├── SurveyC.tsx              # Active survey
│   ├── SurveyScaleMulti.tsx     # Shared C layout/logic
│   ├── SurveyA.tsx              # Kept, not routed
│   └── SurveyB.tsx              # Kept, not routed
└── types/survey.ts

supabase/
├── schema.sql                   # Full schema + RLS
├── add-survey-c-table.sql       # Incremental C table only
├── add-survey-c-insights-rpc.sql # Dashboard read RPC
├── seed-survey-c.sql            # Synthetic Survey C rows
├── fix-rls.sql
└── migrate-intent-yes-no.sql
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
| Blank page on GitHub Pages | Pages **Source** is still “Deploy from branch → main”. Change to **GitHub Actions**, then re-run the deploy workflow. View source: if you see `/src/main.tsx`, `dist/` is not being served. |
| Blank page after local build | Run `npm run build && npm run preview` and open `http://localhost:4173/mse401/` |
| iPad can't reach dev server | Use `npm run dev -- --host` and allow the port through your firewall |

## Privacy note

This prototype uses an in-memory anonymous session UUID only. It does not collect names, emails, or other PII. A footer on each screen states: *"Anonymous session — no personal data collected."*

## Tech stack

- React 19 + TypeScript
- Vite 7
- React Router 7
- Supabase (Postgres)
