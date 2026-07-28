# Privacy Notice

This fitting-room survey prototype is designed to collect **no personally identifiable information (PII)**. It aims to follow the spirit of Canada's *Personal Information Protection and Electronic Documents Act* (PIPEDA): collect only what is needed, state the purpose, safeguard the data, and limit retention.

If this work is run as university research rather than commercial activity, REB / Tri-Council Policy Statement requirements may apply instead of (or in addition to) PIPEDA. The technical safeguards below remain the same.

## What we collect

Per survey completion:

| Field | Purpose |
|-------|---------|
| Anonymous session UUID (`session_token`) | Link ratings and item requests within one kiosk visit |
| Selected garment ID | Know which product was tried on |
| Fabric, fit, colour, and price ratings (1–5) | Measure product feedback |
| Purchase intent (YES / NO) | Measure conversion vs. leave-for-alternatives |
| Item-request rows (alternate size / recommendation) | Help staff fulfill a request on the floor |
| Coarse timestamp (hour precision for analytics) | Trend analysis |

## What we do **not** collect

- Names, emails, phone numbers, or account credentials from shoppers
- Demographics (age, gender, ethnicity, income)
- Height, weight, body measurements, or biometrics
- Free-text comments
- Photos, camera access, or device fingerprints
- Cookies or durable device storage of survey answers

The shopper session token lives in the browser's JavaScript memory only. It is cleared on **Start Over** or when the page is reloaded. Nothing participant-related is written to `localStorage` or IndexedDB.

## Purpose

Anonymous product feedback from physical fitting-room try-ons, so retailers can see which attributes drive purchase intent and which create friction. When a shopper declines purchase, ratings are used to suggest in-stock alternatives.

## Processors and cross-border transfer

| Processor | Role | Region |
|-----------|------|--------|
| **Supabase** | Stores survey responses and catalog data | Per your Supabase project region |
| **Render** | Hosts the recommender API | Per your Render region |
| **Google Gemini** | Optional embeddings and ranking when a shopper asks for alternatives | United States (Google AI) |

When recommendations are requested, **four attribute ratings and catalog metadata** are sent to Google Gemini as prompt text. No session token, name, or contact information is included. This is a cross-border transfer that PIPEDA requires disclosing.

## Retention

- **Session linkage** (`session_token` on survey rows) is nullified after **24 hours**. Ratings and intent remain for aggregate analytics.
- **Item requests** are deleted after **7 days** (operational fulfillment window).
- The in-memory kiosk token ends when the session resets.

See `supabase/add-retention-policy.sql`.

## Access and deletion

Because responses are anonymous, **we cannot fulfill individual access or deletion requests**: there is no reliable way to prove which row belongs to a given person. Aggregate insights (and CSV export) expose only counts, averages, and rates — never per-response rows or session tokens.

## Safeguards

- Survey tables allow anonymous **insert only** (no public table SELECT).
- The retailer insights dashboard is public for this demo, but the read RPC
  returns **aggregates only** (one row per UTC day × item × intent with
  counts/sums). Individual survey responses and session tokens never leave
  Postgres via that path.
- Writes use short timeouts and in-memory retries so flaky networks do not
  silently drop responses without offering Retry.
- Production builds do not log full survey payloads (including session tokens)
  to the browser console.

## Contact

For questions about this prototype's privacy design, contact the project maintainers for your deployment.
