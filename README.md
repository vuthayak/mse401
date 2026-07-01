# Fitting Room Sample Surveys

Lo-fi iPad kiosk prototypes for collecting per-item fitting-room feedback. This repo contains **two sample survey UIs** built from the same methodology so your team can compare approaches before picking a direction.

Both surveys follow the flow and data schema defined in [`Survey Specification Sheet.md`](./Survey%20Specification%20Sheet.md).

## What's included

| Route | Survey | Style | Mock product |
|-------|--------|-------|--------------|
| `/` | Landing page | Pick Survey A or B | — |
| `/survey-a` | Wizard flow | One axis per screen, gray/white kiosk | Slim-Fit Linen Blazer (`STALL_03`) |
| `/survey-b` | Grid flow | 2×2 matrix + bottom sheet intent step | Relaxed Linen Midi Dress (`STALL_07`) |

On completion, each survey:
1. Saves the full JSON payload to **Supabase** (when configured)
2. Shows the serialized JSON on screen
3. Logs the same payload to the browser console (`survey_payload`)

No personal data is collected — only anonymous session tokens and product feedback.

## Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm** (included with Node.js)

Check your versions:

```bash
node -v
npm -v
```

## Installation

1. Unzip the project folder (or clone the repo).
2. Open a terminal in the project root (`mse401/`).
3. Install dependencies:

```bash
npm install
```

## Running locally

### Development server (recommended for testing)

```bash
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173/`).

To test from another device on the same network (e.g. an iPad):

```bash
npm run dev -- --host
```

Then visit `http://<your-computer-ip>:5173/` from the iPad.

### Production build + preview

```bash
npm run build
npm run preview
```

`npm run build` outputs static files to `dist/`. `npm run preview` serves that build locally for a closer-to-production check.

### GitHub Pages (iPad / production hosting)

This app is a static web app designed to be hosted on **GitHub Pages**.

**One-time GitHub setup:**

1. Push this repo to GitHub (repo name should be `mse401`, or update `base` in [`vite.config.ts`](vite.config.ts)).
2. Go to **Settings → Pages → Build and deployment**.
3. Set **Source** to **GitHub Actions** (not “Deploy from branch”).
4. If the site was previously deployed from the `main` branch, switching to GitHub Actions is required — otherwise GitHub serves the raw dev `index.html` and you will see a **blank page**.

**Deploy:** Push to the `main` branch. The workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) builds `dist/` and deploys that artifact automatically.

**Live URL:** `https://<your-github-username>.github.io/mse401/`

**Verify deployment:** View page source on the live site. You should see `/mse401/assets/index-….js`, **not** `/src/main.tsx`.

**iPad:** Open that URL in Safari → **Share → Add to Home Screen** for a kiosk-style shortcut.

> If your repo is not named `mse401`, change the `base` path in `vite.config.ts` to `/<your-repo-name>/`.

## Supabase setup

Survey responses are stored in Supabase when credentials are configured.

### 1. Create the database table

In Supabase → **SQL Editor**, run the script in [`supabase/schema.sql`](supabase/schema.sql).

This creates a `survey_responses` table and allows **anonymous inserts only** (no public reads).

### 2. Get your API keys

Supabase → **Project Settings** → **API**:

- **Project URL** → `VITE_SUPABASE_URL`
- **anon public** key → `VITE_SUPABASE_ANON_KEY`

### 3. Local development

```bash
cp .env.example .env.local
```

Fill in your values, then:

```bash
npm run dev
```

Without `.env.local`, surveys still work but only log to the console.

### 4. GitHub Pages (production)

Add repository secrets (**Settings** → **Secrets and variables** → **Actions**):

| Secret | Value |
|--------|--------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your anon public key |

Push to `main` to redeploy with database support baked into the build.

### Viewing responses

Supabase → **Table Editor** → `survey_responses`. Each row stores indexed fields plus the full `payload` JSON.

## iPad / kiosk testing tips

- Use Safari on iPad in landscape or portrait — layouts use `100dvh` and safe-area padding.
- In desktop Chrome DevTools, try iPad dimensions (e.g. 834×1194 or 1024×768).
- Add to Home Screen for a more kiosk-like experience (still runs in the browser).
- Open DevTools → Console to inspect submitted `survey_payload` JSON.
- Target interaction time is under ~20 seconds per item.

## Survey flow (both variants)

**Step 1 — Attribute matrix (forced choice, one tap per axis)**

| Axis | Options |
|------|---------|
| Size / Fit | Too Small · Perfect · Too Large |
| Color | Dislike Shade · Love Color |
| Cut / Silhouette | Uncomfortable Proportions · Flattering Cut |
| Fabric / Material | Harsh Fabric · Premium Texture |

**Step 2 — Balanced intent**

> Do you plan on purchasing this item, or leave and get recommendations?

- **I plan on purchasing** → `KEEP_AND_WEAR`, recommender not triggered
- **Leave + get recs** → `LEAVE_AND_SWAP`, mock recommender routing included in JSON

## Project structure

```
src/
├── App.tsx                 # Routes
├── components/
│   ├── Landing.tsx
│   ├── JsonPreview.tsx
│   └── ProductHeader.tsx
├── lib/
│   ├── buildPayload.ts     # JSON serializer + mock routing
│   ├── persistSurvey.ts    # Supabase insert
│   ├── session.ts          # Ephemeral anonymous session UUID
│   ├── supabase.ts         # Supabase client
│   └── valence.ts          # POSITIVE / NEGATIVE mapping
├── surveys/
│   ├── SurveyA.tsx         # Wizard variant
│   └── SurveyB.tsx         # Grid variant
└── types/survey.ts         # Shared types + axis config
```

## Packaging for Google Drive

When creating a zip to share:

**Include:**
- All source files (`src/`, `index.html`, `package.json`, `package-lock.json`, config files)
- `Survey Specification Sheet.md`
- `README.md` (this file)

**Exclude (recipients will run `npm install` themselves):**
- `node_modules/`
- `dist/` (optional — omit to keep the zip small; recipients run `npm run build` if needed)
- `.DS_Store`

Example zip command from the parent directory:

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
| Port 5173 in use | Vite will pick the next free port, or stop the other process |
| Could not save to database | Run `supabase/schema.sql`; confirm anon RLS insert policy; check browser console |
| Blank page on GitHub Pages | **Most common:** Pages **Source** is still “Deploy from branch → main”. Change to **GitHub Actions**, then re-run the deploy workflow. View source: if you see `/src/main.tsx`, the built `dist/` is not being served. |
| Blank page after local build | Run `npm run build && npm run preview` and open `http://localhost:4173/mse401/` (production base path) |
| iPad can't reach dev server | Use `npm run dev -- --host` and allow the port through your firewall |

## Privacy note

This prototype uses an in-memory anonymous session UUID only. It does not collect names, emails, or other PII. A footer on each screen states: *"Anonymous session — no personal data collected."*

## Tech stack

- React 19 + TypeScript
- Vite 7
- React Router 7
- Supabase (Postgres)
