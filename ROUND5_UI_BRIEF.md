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
