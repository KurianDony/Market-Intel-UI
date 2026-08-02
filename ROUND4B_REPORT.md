# ROUND 4B REPORT — Suburb Explorer Iteration 3

Issued after executing `ROUND4B_UI_BRIEF.md`. Suburb page only; area page untouched.

## Precondition

`docs/phase4/G3_DATA_CONTRACT.md` is **v4** and lists `dash_suburb_movement_x` (plus range-keyed `_x` tables, DOM p25/p75). Proceeded.

## What shipped

### Bedroom range slider
- Dual-thumb range over six UI positions: **1, 2, 3, 4, 5, 6+**.
- Full range = `(bed_min, bed_max) = ('1','6plus')` (All). Single-value ranges work (e.g. 6+ only = `('6plus','6plus')`).
- Bare `'6'` is a legacy contiguous-scale key in `_x` tables — **UI never references it** (thumbs, chips, or queries). Fetches also exclude `bed_min/bed_max = '6'`.
- Tier toggle unchanged; combines freely with the range via `_x`.

### Movement filter fix (director gap)
- Composition chart, strip, DOM, reprice behaviour, and turnover all read **`dash_suburb_movement_x`** for the active `(bed_min, bed_max, tier)`.
- Nothing on the movement block ignores the filter. Banner rent/supply/seekers and price/supply/cohorts remain `_x`-aware as in Round 3B.

### Movement upgrades
- **Reprice expander:** table shows last 3 observed weeks (this / last / week before).
- **DOM card:** median plus `p25-p75` band from `dom_median` / `dom_p25` / `dom_p75`.
- **Composition chart:** numerics table to the right (legend-box style) with carried, repriced (up/down), new, lost for the selected week.

### Cosmetics
- G2-listing-data sub-labels removed from section headers (standalone G2 freshness banner retained).
- Sections re-lettered: **A Movement, B Price, C Supply, D Demand, E Confidence, F Geography**.
- Visible card-code chips (A1, D24, …) removed from UI and DashboardCard titles.
- Em-dashes / double hyphens in suburb-page visible copy replaced with `-` or `:`.

### Data layer
- Types migrated from `bed_bucket` → `bed_min`/`bed_max`; added `DashSuburbMovementX`.
- `_x` tables paginated past PostgREST’s **1000-row max** (Strathfield `movement_x` is 1107 rows; without paging the latest week was silently dropped).

## Name → old card-code map

| UI label (Round 4B) | Old code |
|---|---|
| Days on market (median) | D24 |
| Reprice behaviour | D21 |
| Turnover - share cleared | D17 |
| Liquidity by price band | D20 |
| Typical rent (p50) | A1 |
| Percentile band | A2 |
| Percentile bands over time | A4 |
| Supply level | B7 |
| New-supply inflow | B9 |
| Supply by type | B8 |
| Weekly net supply | B10 |
| Demand ratio | C12 |
| Implied seekers | C11 |
| Demand ratio range | C12 chart |
| Confidence | E25 |
| Sample size trend | E— |
| Area & supply rank | G27 |
| Area coverage this week | G— |

Section letters (old → new): Movement D→A, Price A→B, Supply B→C, Demand C→D, Confidence E→E, Geography G→F.

## QA evidence

Harness: `scripts/round4b-screens.mjs` @ `http://localhost:3000`

| Viewport | Targets | Result |
|---|---|---|
| 1440×1000 | Strathfield, Strathfield w/c 2026-07-13, Mayfield West | clean |
| 390×844 | same three | clean |

Checks: dual-thumb range 2–4 + premium moves strip/numerics/DOM/reprice/banner/supply/rent; composition numerics match `movement_x` for w/c 2026-07-27 (`Carried 0 / Repriced 14 / up 3 / down 5 / New 7 / Lost 0`); 6+-only shows Strathfield ~30-listing segment (`Repriced 26 / New 4`); reprice expander ≥3 weeks; letters A–F; no G2 section sub-labels; no card-code chips; no em-dashes; no console/page errors; no horizontal overflow.

Screenshots (gitignored): `assets/screenshots/_round4b-{desktop,phone}-*.png`

Also: `npm run lint` (0 errors), `npx tsc --noEmit` clean, `npm run verify` (prod build) clean.

## Deploy

`dev` → `main` after green QA (`3191c27`). Production READY:

- Commit: `3191c27`
- Vercel Production: deployment `5712470991` (success)
- Alias: **marketmeerkat.guru**
- Prod harness re-run: Round 4B visual pass clean at 1440/390 (Strathfield, gap-adjacent week, Mayfield West).
