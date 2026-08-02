# ROUND 4B UI BRIEF - Suburb Explorer Iteration 3 (market-intel-ui repo)
Issued by master chat, 2026-08-02. DEPENDS ON ROUND 4A: confirm docs/phase4/G3_DATA_CONTRACT.md is v4 and lists dash_suburb_movement_x before starting; if absent STOP and report. Suburb page only. Write ROUND4B_REPORT.md when done.

## Filters
- Bedrooms becomes a two-thumb RANGE slider over 1..6+ (any contiguous range incl. a single value, e.g. 2-4, 1-3, 6+ only; full range = all). Tier toggle unchanged and combines freely. Reads move to the range-keyed _x tables (contract v4).
- FIX the director-confirmed gap: DOM, reprice behaviour, turnover, and the weekly composition chart now read dash_suburb_movement_x and respond to the combined filter like everything else. Nothing on the page may ignore the filter.

## Movement section upgrades
- Reprice behaviour expander: table shows at least the last 3 weeks (this week, last week, week before), not just the selected week.
- DOM card: show p25-p75 alongside the median (dom_p25/dom_p75).
- Weekly composition chart: add a small numerics table to its right (in the lighter legend-box style) with the exact counts for the selected week: carried, repriced (with up/down split), new, lost.

## Cosmetics and structure
- REMOVE the G2-listing-data sub-labels under section headers (all sections).
- RE-LETTER sections to the new order: A Movement, B Price, C Supply, D Demand, E Confidence, F Geography - and REMOVE the visible card-code chips (A1, D24 etc.) from the UI entirely; keep an internal name-to-old-code map in the report so director feedback can still reference old codes.
- Punctuation sweep: replace em-dashes and double hyphens in visible UI text with a single dash or a colon (director preference). Movement header uses a single dash.

## QA gate
Harness at 1440 and 390: range slider at 2-4 with premium ON changes EVERY section including all movement cards and composition; single-value range works; reprice expander shows 3 weeks; composition numerics match dash_suburb_movement_x for the week; no G2 sub-labels remain; no em-dashes in rendered text; no console errors; prod build clean. dev to main after green; verify prod; report with evidence.
