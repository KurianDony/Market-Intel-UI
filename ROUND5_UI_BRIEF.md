# ROUND 5 UI BRIEF - Suburb Explorer Iteration 4 (market-intel-ui repo)
Issued by master chat, 2026-08-02. UI-only round; no data-layer dependency. Suburb page only. Write ROUND5_REPORT.md when done.

## 1. Range slider tuning
Fix the thumb-to-value mapping and lag: the slider snaps to its six detents (1,2,3,4,5,6+), the displayed range always matches the thumb positions exactly, no drift between what is grabbed and what is applied. Controlled component, discrete steps.

## 2. Banner composition strip - REMOVE
Delete the weekly composition numbers strip under the typical-rent banner (added in Round 3B). Director reversal. The numerics table BESIDE the movement composition chart (Round 4B) STAYS.

## 3. Property-type selector (supply-scoped)
Add a third filter control - Type: All, Share houses, Studios, 1-bed apartments, Whole properties, Student accommodation, Granny flats, Homestays (use the exact category set the contract lists for g2 counts). HARD CONSTRAINT per contract: categories have supply counts only, no per-listing rents - so this selector drives ONLY the supply elements (category table and any category trend). When a category is active, other sections show one small unobtrusive tag: category filter applies to supply - listing-level analytics cover rooms data. If the contract exposes no public-SELECT source for category counts, STOP and report instead of reading raw tables.

## 4. Percentile band chart - absolute labels
Every band labels its actual price levels (e.g. P20-P40: 250-310 dollars), in segment labels and tooltips. Remove all incremental/cumulative-difference labeling; no adding deltas to reach a band. The stacked rendering with white separators stays; only the numbers shown change.

## 5. Rank card - VERDICT PENDING, apply whichever the kickoff prompt states
Option REMOVE: delete the rank-in-area card and its expander (the area ranked table moves into the demand section footer or is dropped with it - state which in the report).
Option RENAME: keep the card but retitle to Demand rank with a tooltip: ranked by demand ratio within the area - 1 = most seekers per listing; NULL when the suburb has no usable data that week.

## 6. Geography section - REMOVE entirely.

## QA gate
Harness at 1440 and 390: slider snap exactness at every detent, banner strip gone, category selector changes the supply elements and tags the rest, band labels show absolute prices, geography absent, no console errors, prod build clean. dev to main after green; verify prod; report with evidence.

## ADDENDUM (2026-08-02) - applies in the same run
### Item 5 resolved: MOVEMENT RANK (replaces both earlier options)
The rank card is retitled Movement rank and reads dash_suburb_weekly.movement_rank (contract v5). Tooltip: ranked by listings disappeared within the area that week - 1 = most movement. Show it at the movement basis week with the standard stale label; NULL renders as no movement data. The expander area table ranks by movement_rank.
DEPENDENCY: confirm docs/phase4/G3_DATA_CONTRACT.md is v5 and lists dash_area_movement_x before starting; if absent STOP and report.

### Area Analytics page: add a Liquidity section (director-delegated design, master-chat verdict)
Place it FIRST on the area page, mirroring the suburb order. Contents:
1. Composition chart + numerics table: identical pattern to the suburb section (white separators, legend box, exact counts at right), fed by dash_area_movement_x.
2. Cards: DOM (median with p25-p75), reprice behaviour (with the 3-week history expander), turnover/absorption - all area-level from dash_area_movement_x.
3. What-moved / what-added panels: area cohort medians with p25-p75 bands from dash_area_cohorts_x.
4. NEW, area-specific: a suburb movement leaderboard for the selected week - rank, suburb, disappeared, new, net, stock (top 10, expand to full list; areas run 16-53 suburbs). Rows link to the suburb page. This is the bridge between the new movement rank and the area view.
5. Filters: add the bed range + tier filter bar to the area page, scoped to this Liquidity section only this round; other area sections show the standard one-line scope tag. The whole section carries ONE basis-week label (not per card).
### QA additions
Area liquidity renders on the latest movement-complete week with the basis label; leaderboard matches dash_suburb_movement gone_counts for that week; filter at 2-4 + premium moves every liquidity element; suburb links work.
