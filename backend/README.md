# Alternative Item Recommender API

FastAPI service implementing the two-stage pipeline from
`Recommender System Specification Sheet.md`.

```
POST /recommend
  │
  ├─ Stage 1  stage1_candidates() in Postgres
  │           in-stock only, size +/- 1, material NOT IN, alternate colourway,
  │           unit_price <= 0.75x current
  │
  ├─ Stage 2a pgvector HNSW cosine search over the Stage 1 pool
  │           query vector = embed(what they want) - penalty * embed(what they rejected)
  │
  └─ Stage 2b Gemini reranks and explains, restricted to that same pool
```

Every stage degrades instead of failing. No Gemini key means deterministic rule
ordering with generated copy; a Gemini outage or rate limit falls back the same
way. The tablet always gets a usable answer.

## Local development

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements-dev.txt
cp .env.example .env      # then fill in the values
.venv/bin/uvicorn app.main:app --reload --port 8000
```

`.env` needs:

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role, **not** the anon key. Bypasses RLS; never ship it to the browser. |
| `GEMINI_API_KEY` | Free tier from [Google AI Studio](https://aistudio.google.com/apikey). Blank runs the deterministic pipeline. |
| `CORS_ORIGINS` | Comma-separated browser origins allowed to call the API |

## Database setup

Run these once in Supabase → SQL Editor, in order:

1. `supabase/recommender-schema.sql` — tables, HNSW index, RLS, `pgvector`
2. `supabase/recommender-seed.sql` — 21 styles / 23 colourways / 69 SKUs
3. `supabase/recommender-rpc.sql` — `stage1_candidates`, `search_similar_variations`

Then generate embeddings (needs `GEMINI_API_KEY`):

```bash
.venv/bin/python -m app.embeddings         # only the missing ones
.venv/bin/python -m app.embeddings --all   # re-embed everything
```

`GET /health` reports `embedded_items`, so you can confirm the backfill landed.
Until it does, Stage 2a is skipped and ranking runs on rules alone.

## Tests

```bash
.venv/bin/python -m pytest
```

No network or database access required — Gemini is stubbed and the Stage 1 SQL
is exercised separately against Supabase.

## Deploying to Render

GitHub Pages only serves static files, so the API needs its own host.

1. Render → New → Blueprint, point at this repo (`render.yaml` sets everything
   except the secrets).
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` and
   `CORS_ORIGINS` in the service's environment.
3. `CORS_ORIGINS` must include the Pages origin, e.g. `https://<user>.github.io`.
4. Copy the service URL into the `VITE_RECOMMENDER_API_URL` GitHub Actions
   secret so the frontend build points at it.

The free plan sleeps after inactivity, so the first request can take ~30s. The
frontend allows for that with a long timeout and a loading state.

## Request / response

```jsonc
// POST /recommend
{
  "session_token": "anonymous-uuid",
  "selected_item_id": "nike-windbreaker",  // survey item id or variation id
  "fabric": 1, "fit": 3, "colour": 3, "price": 2,  // all optional, default 3
  "limit": 3
}
```

```jsonc
{
  "current_item": { "item_id": "nike-windrunner-black-m", "title": "…", "price": 120.0 },
  "recommendations": [
    {
      "item_id": "essential-zip-hoodie-black-m",
      "title": "Essential Full-Zip Hoodie",
      "price": 55.0,
      "image_path": "items/black-zip-hoodie.png",
      "reasons": ["Cotton fleece instead of Nylon shell", "54% less than the $120.00 you tried"],
      "matched_rules": ["fabric_pivot", "budget", "same_category"],
      "in_stock": 2
    }
  ],
  "strategy": "llm",   // llm | vector | heuristic
  "relax_level": 0,    // 0 = every triggered filter held
  "latency_ms": 812
}
```

`image_path` is relative to the frontend's base URL, so the client renders it as
`${import.meta.env.BASE_URL}${image_path}`.

## Privacy

Requests carry only an ephemeral `session_token`, and nothing from `/recommend`
is persisted. No PII is captured, stored, or logged.
