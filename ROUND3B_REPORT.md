# ROUND 3B REPORT — Suburb Explorer Iteration 2

Issued after executing `ROUND3B_UI_BRIEF.md`. Suburb page only; area page untouched.

## Precondition

`docs/phase4/G3_DATA_CONTRACT.md` is **v3** and lists `dash_suburb_price_stats_x` (plus `dash_suburb_supply_x`, `dash_suburb_cohorts_x`, `carried_count`). Proceeded.

## What shipped

### Global filter (page-top)
- Bedrooms **slider** All → 1…5 → **6+** (default All) + independent **premium / basic / all ads** toggle.
- Bed × tier combine freely via `_x` tables; filter applies page-wide.
- Banner under filter: rent = segment `p50` tagged **listings-basis**; supply = segment `live_count`; implied seekers = `round(demand_ratio × live_count)` tagged **estimate**; demand ratio + rank stay suburb-wide tagged **suburb-wide**. Unfiltered = G1-canonical unchanged.

### Banner
- Compact weekly composition strip (numbers only): +repriced / −repriced / carried / lost / added from `dash_suburb_movement` (`carried_count` preferred).
- Evidence Strathfield w/c 2026-07-27: strip `23 / 20 / 0 / 0 / 23` matches SQL `reprice_up=23, reprice_down=20, carried_count=0, gone_count=0, new_count=23`.

### Section order
Banner → **Movement** → Price → Supply → Demand → Confidence → Geography.

### Price
- A3 dispersion **removed**. A1 / A2 / A4 retained.
- A4 stacked bands: thin **white** separators between segments.

### Supply
- B8 stale column **removed**. B7 / B9 / B10 / supply trend unchanged (now `_x`-aware).

### Demand
- C11: number-only card; expander = **line** chart.
- C14 standalone **removed**; all-time ratio change + 4w comparison merged into C12. C12 band chart kept. C expanders use line charts.

### Movement
- Composition chart: white outline separators; legend in its own lighter box.
- D23 + price ladder **removed**. **D24 promoted ahead of D17**. D20 / D21 unchanged.
- What-moved / what-added respect bed × tier via `dash_suburb_cohorts_x`.

### Data layer
- Fetches `dash_suburb_price_stats_x`, `dash_suburb_supply_x`, `dash_suburb_cohorts_x`.
- `supply_by_type` retained only for B8 `listing_category`.
- `DashSuburbMovement.carried_count` typed.

## QA evidence

Harness: `scripts/round3b-screens.mjs` @ `http://localhost:3000`

| Viewport | Targets | Result |
|---|---|---|
| 1440×1000 | Strathfield, Strathfield w/c 2026-07-13 (gap-adjacent), Mayfield West | clean |
| 390×844 | same three | clean |

Checks: bed slider + premium combined filter, banner tags (`listings-basis` / `estimate` / `suburb-wide`), section order, composition strip, A3/C14/D23/price-ladder/stale absent, D24 before D17, no horizontal overflow, no console/page errors.

Screenshots (gitignored): `assets/screenshots/_round3b-{desktop,phone}-*.png`

Also: `npm run lint` (0 errors), `npx tsc --noEmit` clean, `npm run verify` (prod build) clean.

## Deploy

`dev` → `main` after green QA. Production READY on **marketmeerkat.guru** (see deploy IDs below after push).

Prod harness re-run: Round 3B visual pass at 1440/390 (Strathfield, gap-adjacent week, Mayfield West).
