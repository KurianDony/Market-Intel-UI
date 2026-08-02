# ROUND 5 REPORT — Suburb Explorer Iteration 4 + Area Liquidity

Issued after executing `ROUND5_UI_BRIEF.md` (incl. ADDENDUM). Suburb + Area pages.

## Precondition

`docs/phase4/G3_DATA_CONTRACT.md` is **v5** and lists `dash_area_movement_x` (plus `dash_area_cohorts_x`, `dash_area_movement_leaderboard`, `movement_rank`). Proceeded.

## What shipped

### 1. Range slider tuning
- Discrete detents only (`Math.round` on change); label and `data-bed-min/max` always resolve from the same indices.
- Detent ticks on the track; active-thumb z-index while dragging so thumbs don't steal each other.
- Snap verified at every detent (1,2,3,4,5,6+, All, 2-4) in the QA harness.

### 2. Banner composition strip — REMOVED
- Deleted the Round 3B weekly composition numbers strip under the typical-rent banner.
- Composition chart + side numerics table (Round 4B) retained.

### 3. Property-type selector (supply-scoped)
- Third control on `TypeFilterBar`: Type = All / Share houses / Studios / 1-bed apartments / Whole properties / Student accommodation / Granny flats / Homestays.
- Source: `dash_suburb_supply_by_type` (`type_dim=listing_category`, public SELECT) — no raw tables.
- Drives only the Supply-by-type table. When active, other sections get the tag: *category filter applies to supply - listing-level analytics cover rooms data*.

### 4. Percentile band chart — absolute labels
- Legend and tooltips show absolute price levels (e.g. `P20–P40: $250–$310`).
- Stack heights remain deltas for correct stacked rendering; white separators unchanged.

### 5. Movement rank (addendum verdict)
- Banner card retitled **Movement rank**; reads `dash_suburb_weekly.movement_rank` at the movement basis week.
- Tooltip: ranked by listings disappeared within the area that week - 1 = most movement.
- NULL → "no movement data"; stale weeks get the standard stale/basis label.
- Expander table ranks peers by `movement_rank` with gone / new / stock.

### 6. Geography — REMOVED
- Section F deleted entirely. Section order is now A–E (Movement → Price → Supply → Demand → Confidence).

### Area Liquidity (addendum)
- New **Liquidity** section first on the area page (`AreaAnalyticsClient`).
- Composition chart + numerics from `dash_area_movement_x`.
- Cards: DOM (median + p25-p75), reprice (3-week expander), turnover.
- What-moved / what-added from `dash_area_cohorts_x` with p25-p75 bands.
- Suburb movement leaderboard from `dash_area_movement_leaderboard` (top 10, expand to full); rows link to suburb pages.
- Bed × tier filter bar scoped to Liquidity only; other area sections get a one-line scope tag when active.
- One section-level basis-week label: latest movement-complete week (`gone_count > 0`) — currently **2026-06-29**.

## QA evidence

Harness: `scripts/round5-screens.mjs` @ `http://localhost:3000`

| Viewport | Targets | Result |
|---|---|---|
| 1440×1000 | Strathfield, Strathfield w/c 2026-07-13, Mayfield West, Inner West | clean |
| 390×844 | same four | clean |

Checks: slider snap at every detent; composition strip absent; category selector + scope tags; Movement rank present / Rank in area gone; Geography absent; composition numerics retained; area liquidity on basis `2026-06-29` with basis label; leaderboard gone counts match `dash_suburb_movement` (Concord West 14, Burwood 11, Campsie 9, Rhodes 9, Homebush 8); 2-4 + premium moves liquidity DOM/turnover/numerics; suburb links work; no console/page errors.

Screenshots (gitignored): `assets/screenshots/_round5-{desktop,phone}-*.png`

Also: `npx tsc --noEmit` clean, `npm run verify` (prod build) clean.

## Deploy

`dev` → `main` after green QA. Production READY on marketmeerkat.guru after push to `origin/main`.
