# ROUND 2 UI BRIEF - Suburb Explorer Rework (market-intel-ui repo)
Issued by master chat, 2026-08-01. DEPENDS ON ROUND 1 (new tables + contract v2 in docs/phase4/G3_DATA_CONTRACT.md - confirm it mentions dash_suburb_cohorts before starting; if absent, STOP and report). Suburb page only this round; area page untouched. Write ROUND2_REPORT.md when done.

## Global
- Keep the existing brutalist B and W theme. Every delta chip: strict WoW when present, else the vs-last-data-point value labeled with its basis week (columns from Round 1).
- LISTING-TYPE FILTER: one filter control (all / per supported type from contract v2 support matrix) governing sections A(price), B(supply), D(movement). C is G1 suburb-level - keep its existing never-split note.
- Gap weeks stay breaks. Expanders keep all detail on click.

## Part A - top strip
Each of: typical rent, supply, seekers, demand ratio, rank in area gets a plus expander with a 6-week mini trend. Rank-in-area expander additionally shows the full ranked table of every suburb in the area for the selected week (dash_suburb_weekly.rank_in_area across the area).

## Section A - price
- A1 typical rent: number + delta vs last week + delta vs 4 weeks. No chart on the card; 6-week trend lives in the expander (8-week volatility moves inside this expander as: typical weekly move plus-minus N dollars - pending director keep/kill).
- Percentile band card: larger; 250-495 style with vs-last-week and vs-4-weeks comparisons. Dispersion card: same two comparisons (director said minus 1 wk and minus 7 wks - implement 1w and 4w for consistency and note the 7 in the report for his confirmation). Expanders retain full detail.
- REMOVE: all-bills-included card; all-time price change card.
- A4 percentile chart rework: stacked band chart, bands p20/p40/p60/p80/p100 in gradient greys showing change over time; hover a band highlights it and dims the rest (if hover proves janky, ship the gradient version without hover).
- Price section gains the type filter (tables from Round 1 task 3).

## Section B - supply (short section)
- B7 chart stays, type-filterable. B8 becomes a table (supply by type). B9 rework: new supply inflow - count of new listings + the prices they entered at (from dash_suburb_cohorts added), type-filterable. B10: weekly net supply bar chart, positive above axis, negative below; clicking a bar reveals the exact delta; keep and make the click behaviour consistent everywhere.
- MOVE the supply-trend weekly chart from section C into B.

## Section C - demand (short section)
- C12 demand ratio FIRST. Ratio range shown as a high-low band chart (upper and lower bounds per week, forex-style) not bars.
- Replace seekers card with IMPLIED SEEKERS (implied_seekers from Round 1) + trend; label the basis week when stale. DELETE C13 listings-per-seeker. C14 becomes ratio-based change (Round 1 task 2 columns).

## Section D - movement / liquidity (the flagship section, biggest on page with A)
- Lead block: weekly composition bar chart - carried old stock at the bottom, repriced above it, new supply on top; disappeared listings as a negative bar below the axis. Data: dash_suburb_movement (stock, new_count, repriced_count, gone_count).
- Then two side-by-side panels: WHAT MOVED (removed cohort) and WHAT WAS ADDED (added cohort), each showing cohort price trend (median with p25-p75 band over weeks), DOM of removed, repriced share, weeks on market - from dash_suburb_cohorts, type-filterable.

## Sections E / F
E unchanged. REMOVE section F entirely.

## QA gate
Existing screens harness at 1440 and 390 plus: filter switching on A/B/D, expander open states, the composition chart on a gap week, cohort panels on a thin suburb, no console errors. dev to main only after green; report with evidence.
