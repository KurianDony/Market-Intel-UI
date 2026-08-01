# PHASE 4 HANDOFF — Analytics UI (Suburb Explorer + Area Analytics)
Issued by master chat, 2026-08-01. Execute fully in this repo (market-intel-ui). Write PHASE4_REPORT.md at repo root when done.

## Context
- This site is live on Vercel (project market-intel-ui), auth-gated, reading Supabase project Market-Intel (lyurcephjxokyhiclmgm).
- The data layer is COMPLETE and CURRENT through ISO week w/c 2026-07-27 (Phases 1-3). 10 new dash_* tables (ISO-week anchored) + 9 refreshed legacy dash_* tables, all RLS-on with public SELECT.
- READ FIRST: docs/phase4/G3_DATA_CONTRACT.md - the single source of truth: every table, column, key, grain, the element-to-table mapping (section 3), example queries per page section (sections 4-5), and known limitations (section 6).
- Design references in docs/phase4/: suburb_explorer_2026-07-01.html is the approved target (superset of the 06-23 approved baseline); analytics_explainer.html for metric wording.

## Scope - HARD BOUNDARY
ONLY two pages change: the Suburb Explorer page and the Area Analytics page (plus the minimal shared components/queries they need). Keep the existing app theme, colors, typography, nav, and auth untouched. Do not restyle the shell. No stupid divergences from the existing look - extend it.

## Tasks
1. SUBURB EXPLORER: rebuild per suburb_explorer_2026-07-01.html, wiring every element per contract sections 3-4. All week-indexed data comes from the Phase-3 iso_week tables (dash_suburb_weekly, dash_suburb_price_stats, dash_suburb_movement, dash_suburb_band_liquidity, dash_suburb_coverage); legacy dash_* only where the contract maps them. Include a coverage/confidence badge from dash_suburb_coverage on every suburb view.
2. AREA ANALYTICS: free reign on layout, same theme. Structurally mirror the suburb explorer using dash_area_weekly, dash_area_price_stats, dash_area_movement, dash_area_coverage, dash_city_weekly, plus existing dash_area_summary/leaderboard/mix/histogram where mapped. Include a vs-Sydney comparison strip (dash_city_weekly) and an area leaderboard with WoW movement.
3. DATA ACCESS: use the existing Supabase browser client + anon/publishable key. New tables are public SELECT. NEVER put the service key anywhere in this repo.
4. EDGE HANDLING: gap weeks (w/c 2026-04-20 and 2026-07-06) render as gaps in trend lines, never as zeros. Low-coverage weeks show the confidence badge (sample_n, confidence from dash_suburb_coverage). Suburbs with no market data (the 27 g1_capable=false) still appear in search with an explicit no-market-data state. Contract section 6 partials (per-cohort p10/p90 detail, reprice-on-disappeared detail, 2-month horizon, historical bills premium) must NOT be faked - omit or mark clearly.
5. QA GATE before merge: verify (a) Strathfield (rich data), (b) one thin suburb picked by lowest sample_n, (c) one area page, (d) week navigation across the 4 split-fetch weeks - exactly one point per iso_week, no doubled points, (e) trend charts across the two gap weeks, (f) prod build passes locally.

## Delivery
- Work on the dev branch, granular commits. When the QA gate passes: merge dev to main (Vercel auto-deploys prod) and verify the two pages on prod.
- PHASE4_REPORT.md: pages/components changed, mapping deviations from the contract (if any), QA evidence per gate item, prod deployment URL + status.

## Guardrails
- No Supabase schema changes. No writes to any table. No changes to the market-intelligence repo.
- Do not touch auth, env handling, or Vercel config beyond what deployment requires.
- No secrets in commits.
