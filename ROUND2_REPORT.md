# ROUND 2 REPORT — Suburb Explorer Rework

Issued after executing `ROUND2_UI_BRIEF.md` (incl. 2026-08-02 amendment). Suburb page only; area page untouched.

## Precondition

`docs/phase4/G3_DATA_CONTRACT.md` v2 already lists `dash_suburb_cohorts` (catalogue §1, columns §2, mapping §3, queries §4, support matrix §7). Proceeded.

## What shipped

### Global
- Strict WoW via `wow_*` when present; else `delta_vs_prev_obs` labelled with gap / basis week (`lib/dash/deltas.ts`).
- Bedroom-primary filter (1–6 + all) with ad-tier secondary facet (premium/basic, only when bedrooms = all). `listing_category` appears only on B8 (g2_counts, count-only).
- Gap weeks remain breaks. Expanders keep detail on click.

### Part A — top strip
- Each KPI (typical rent, supply, implied seekers, demand ratio, rank) is an expandable cell with a 6-week mini trend.
- Rank expander includes the full area peer table (`dash_suburb_weekly.rank_in_area` for the selected week).

### Section A — price
- A1: number + 1w/4w deltas; no on-card spark; 6-week series + 8-week volatility note in expander (pending director keep/kill).
- A2/A3 enlarged with 1w + 4w comparisons. **Note for director:** brief mentioned −7w for dispersion; shipped −1w/−4w for consistency with A1/A2 — confirm.
- Removed: bills-included card, all-time price change card.
- A4: stacked percentile band chart (p20…p100 greys) with hover-dim.
- Type filter governs A.

### Section B — supply
- B7 type-filterable. B8 = listing_category table. B9 = added cohort inflow + entry prices. B10 = net supply bar chart (click → exact delta).
- Supply-trend weekly chart moved from C → B.

### Section C — demand
- C12 demand ratio first + forex-style high/low band chart.
- Implied seekers (with stale/basis badge). C13 deleted. C14 = ratio-based all-time change.
- Suburb-level only — never split by type.

### Section D — movement (flagship)
- Weekly composition chart: carried / repriced / new above axis; disappeared below; click reveals counts.
- Side-by-side What moved / What was added cohort panels (median + p25–p75 band, DOM, repriced share, weeks on market) from `dash_suburb_cohorts`, type-filterable.
- Supporting D17/D21/D23/D24 + D20 liquidity + price ladder retained.

### Sections E / F
- E unchanged. **F removed entirely.**

## QA evidence

Harness: `scripts/round2-screens.mjs` @ `http://localhost:3000`

| Viewport | Targets | Result |
|---|---|---|
| 1440×1000 | Strathfield, Strathfield w/c 2026-07-13 (gap-adjacent), Mayfield West | clean |
| 390×844 | same three | clean |

Checks exercised: filter switch (2-bed → all beds), expander open, composition present, cohort panels present, section F absent, no horizontal overflow, no console/page errors.

Screenshots (gitignored): `assets/screenshots/_round2-{desktop,phone}-*.png`

Also: `npm run lint` (0 errors), `npm run verify` (prod build) clean.

## Deploy

`dev` → `main` after green QA (`edbf4b8`). Production READY:

- Deployment: `dpl_A5L2BTtJxP2jL5k9xZFfHcYbk2c8`
- Alias: **marketmeerkat.guru**
- Prod harness re-run: Round 2 visual pass clean at 1440/390 (Strathfield, gap-adjacent week, Mayfield West).

## Open items for director

1. Dispersion comparisons: shipped **1w + 4w**; brief also mentioned **−7w** — keep 4w or switch?
2. A1 expander volatility line (“typical weekly move ±N”) — keep or kill?
3. Bedroom × ad-tier cross-product does not exist in the tables; tier facet is disabled when a bedroom is selected.
