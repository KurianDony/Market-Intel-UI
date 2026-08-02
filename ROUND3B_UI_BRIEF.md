# ROUND 3B UI BRIEF - Suburb Explorer Iteration 2 (market-intel-ui repo)
Issued by master chat, 2026-08-02. DEPENDS ON ROUND 3A: confirm docs/phase4/G3_DATA_CONTRACT.md is v3 and lists dash_suburb_price_stats_x before starting; if absent STOP and report. Suburb page only. Write ROUND3B_REPORT.md when done.

## Global filter (top of page)
- Move the filters to the very top of the page as one bar: a bedrooms SLIDER 1 to 6+ (position 6 is labeled 6+; there is also an all position, default) plus an INDEPENDENT premium/basic toggle. Bed and tier combine freely (data from the _x tables). Filters apply to the ENTIRE page - every section.
- Banner under active filter: typical rent switches to segment p50 with a small listings-basis tag; supply = segment live_count; implied seekers = suburb demand_ratio x segment live_count with an estimate tag; rank-in-area and demand ratio stay suburb-wide with a suburb-wide tag. With no filter, current G1-canonical behaviour unchanged.

## Banner additions (position and existing KPIs unchanged)
- Add a compact weekly composition strip for the selected week, numbers only: positively repriced, negatively repriced, carried over, lost, added (dash_suburb_movement: reprice_up, reprice_down, carried_count, gone_count, new_count).

## Section reorder
Movement/Liquidity FIRST, then Price, then Supply, then Demand, then Confidence (E), then Geography (G). Banner stays top.

## Price section
- REMOVE A3 (dispersion card). A1, A2, A4 stay as shipped.
- A4 visual: add a thin white separator line between adjacent stacked band segments so the splits are unmistakable. Apply the same white-separator treatment to the movement composition chart segments.

## Supply section
- B8: remove the stale badge/label from the category table. B7, B9, B10, supply trend unchanged.

## Demand section
- C11 implied seekers: number only on the card; the expander opens a LINE chart (not bars).
- C14 standalone card REMOVED; its ratio-change number (for example 5 to 4) plus a 4-week comparison where applicable merge into the C12 card. C12 keeps the high-low band chart. Any expander charts in C are line charts.

## Movement section
- Composition chart: white outline separators between segments (as above); the legend/key moves into its own box with a slightly lighter background so it reads clearly.
- REMOVE D23 and the price ladder card. PROMOTE D24 into D17's slot (swap the two). D20 and D21 unchanged. What-moved / what-added panels unchanged except they now respect the combined bed x tier filter via dash_suburb_cohorts_x.

## QA gate
Screens harness at 1440 and 390 on Strathfield, a gap-adjacent week, and a thin suburb; plus: slider at 2 with premium ON (combined filter renders across all sections), section order correct, banner filtered-state tags present, composition strip numbers match dash_suburb_movement for the week, no console errors, prod build clean. dev to main only after green; verify prod; report with evidence.
