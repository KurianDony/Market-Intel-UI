# PHASE 4 REPORT — Analytics UI (Suburb Explorer + Area Analytics)

Executed against `PHASE4_HANDOFF.md` (issued 2026-08-01) and `docs/phase4/G3_DATA_CONTRACT.md`.
Branch `dev` → `main`, 6 commits from `bd811e2` to `49dab58`.

---

## 1. What changed

Both target pages were rebuilt on the Phase-3 ISO-week tables. The shell, palette,
typography, nav and auth are untouched — every new surface reuses the existing
brutalist B&W chrome (`lib/palette/v2.ts`, `chart-theme.ts`, `DashboardCard`).

### Pages

| Path | Change |
|---|---|
| `app/(app)/[state]/[area]/[suburb]/SuburbDashboardContent.tsx` | Rebuilt to sections A–G per `suburb_explorer_2026-07-01.html`. 31 metric cards, 12 charts, confidence badge, week nav, no-market-data state. |
| `app/(app)/[state]/[area]/AreaDashboardContent.tsx` | Rebuilt to mirror the suburb structure. 22 metric cards, 23 charts, vs-Sydney strip, leaderboard with WoW movement. |
| `app/(app)/[state]/[area]/[suburb]/page.tsx`, `app/(app)/[state]/[area]/page.tsx` | Thread `searchParams` through so `?week=` drives the view. |

### New components

`MetricCard` (expandable card: value, sparkline, source, explanation, weekly
breakdown, optional table, caveat), `SectionHeading`, `ConfidenceBadge` +
`CoverageBadge`, `WeekNav`, and three charts — `Sparkline`, `WeeklyLineChart`,
`BandLiquidityChart`.

### Modified components

`AreaLeaderboardTable` gained WoW rent and WoW listing columns plus sorting on
them. `StatStrip` was made wrap-capable (see QA item g).

### New data layer

`lib/types/dash-phase3.ts` (types for the 10 ISO-week tables),
`lib/dash/iso-week.ts` (week axis, gap detection, series alignment),
`lib/dash/explorer-queries.ts` (`fetchSuburbExplorerData`, `fetchAreaAnalyticsData`),
`lib/dash/metrics.ts` (client-side derivations).

All reads go through the existing server Supabase client on the publishable/anon
key. No service key is referenced anywhere in the repo; no schema changes and no
writes were made.

---

## 2. Deviations from the contract

Five, all deliberate and all surfaced in the UI rather than hidden.

**1. G2 blocks resolve to the newest week at or before the selected week.**
The contract maps price stats, movement, band liquidity and coverage to the
selected `iso_week`. In the live data the G1 demand spine runs to w/c 2026-07-27
but only four suburbs carry G2 listing rows that recently. Joining strictly on the
selected week would blank most of the page. The pages instead resolve those blocks
to the latest available week ≤ the selection and label it — the section subtitle
reads `G2 listing data as at w/c <date>`, and when it trails the demand spine the
label appends `· N wk behind the demand spine`.

**2. `no-market-data` keys off all four Phase-3 tables, not the G1 spine.**
Keying it off `dash_suburb_weekly` alone would have thrown away real price,
movement and coverage weeks for suburbs outside the capable set. A suburb now only
renders the empty state when it has no row in any of the four. Suburbs that are
`g1_capable=false` but do carry G2 rows render normally, with a banner explaining
that G1-derived metrics (seekers, demand ratio, rank) are absent by design.

**3. The 14-band ladder is backfilled client-side.** The database persists
occupied bands only, which gave the liquidity chart and histogram a ragged axis
that shifted week to week. `fillBandLadder` pads the gaps to zero from
`dash_band_definitions` so the ladder is stable and comparable across weeks.

**4. Split-fetch weeks are marked, not merged silently.** For the four weeks where
the legacy tables hold two `snapshot_date` rows (w/c 04-27, 05-04, 05-25, 06-15),
the Phase-3 row is the single source and `WeekNav` marks the week with an asterisk,
footnoted under the nav.

**5. Contract §6 partials are marked, never faked.**

| §6 limitation | Treatment |
|---|---|
| Cohort profiles (D18) | Medians shown; card carries "per-cohort p10/p90 and top-bedroom breakdown are not persisted". |
| Reprice-on-disappeared (D22) | Shown as an aggregate gap with the caveat "not a cut count". |
| Bills premium (A6) | Rendered when present; null weeks carry "point-in-time only — populated on the latest ISO week per suburb". |
| 2-month horizon (F26) | Value reads `Not available`, explanation "a fixed 2-month horizon is not persisted by the data layer". 1M and 3M render normally. |

---

## 3. QA evidence

Two harnesses, both committed. `scripts/phase4-qa.mjs` walks the data path against
the live project with the anon key. `scripts/phase4-screens.mjs` signs in with
Playwright and drives the gate pages at 1440px and 390px, asserting HTTP status,
heading, card and chart counts, zero page/console errors, and zero horizontal
overflow. Screenshots land in `assets/screenshots/_phase4-*` (gitignored).

| Gate item | Evidence |
|---|---|
| **(a) Strathfield — rich data** | 200 · `STRATHFIELD` · 31 metric cards · 12 charts at both widths. Spine 15 weeks, price stats 13, movement 13, band liquidity 12 bands backfilled to 14. AMBER badge, n=93. |
| **(b) Thin suburb** | Two picked. `mayfield-west` (lowest sample_n, RED n=0) and `north-st-marys` (`g1_capable=false`, 0 spine weeks but 10 price/movement/coverage weeks) both render 31 cards · 12 charts with the limitation banner. `point-piper` (0 weeks in all four tables) renders the explicit no-market-data state. |
| **(c) Area page** | `/nsw/inner-west` 200 · 22 cards · 23 charts. Coverage 16/16 G1 · 100%. vs-Sydney resolves: area $325 vs Sydney $332. Leaderboard returns 16 suburbs, all 16 carrying a WoW rent delta. |
| **(d) Week nav across the 4 split-fetch weeks** | Harness asserts exactly one point per `iso_week`: "4 split weeks present, 0 doubled". Verified visually at `?week=2026-05-04`. |
| **(e) Gap weeks in trend charts** | `alignToAxis` emits `null` (never `0`) for missing weeks; Recharts breaks the line and `WeeklyLineChart` shades the band. Harness: "gap weeks align to null, never zero — gaps: 2026-04-13, 2026-04-20, 2026-07-06, 2026-07-20". Verified visually at `?week=2026-06-29`, the week before the 07-06 gap. |
| **(f) Prod build** | `npm run verify` (`next build`) exits 0. `npx tsc --noEmit` clean. `npm run lint` 0 errors (3 pre-existing warnings in `motion-v2`/`motion`, untouched by this phase). |
| **(g) Mobile** | Every page overflow-free at 390px. See "Bugs found and fixed" below. |

Full harness output: `node scripts/phase4-qa.mjs` → `ALL CHECKS PASSED`;
`node scripts/phase4-screens.mjs` → `Visual pass clean.`

### Bugs found and fixed during the gate

**Every metric card crashed at hydration.** `MetricCard` is a client component
rendered from two server pages, and it took a `seriesFormat` formatter function.
Functions can't cross the server/client boundary, so React threw on each card and
both pages fell back to "This page couldn't load". This passed `tsc` and `next
build` — only the browser pass caught it. Fixed by replacing the prop with a
serializable format token resolved inside the card (`298581b`).

**Both pages overflowed a phone viewport by 172–235px.** `StatStrip` used
`repeat(N, 1fr)` with no `min-width: 0`, so grid items couldn't shrink below their
content and pushed the document sideways. Rebuilt on auto-fit tracks with dividers
drawn by a `gap-px` backdrop, which wraps to two columns at 390px and leaves the
desktop layout pixel-identical (`9a333f8`). The component is used only by these
two pages, so nothing else is affected. An overflow assertion is now part of the
screens harness so this can't regress silently.

### Known issue, out of scope

The `DashboardShell` header renders as `DASHBOARDSNAPSHOT 27 JULY 2026 · G3` at
phone widths — the "dashboard · G3" and snapshot labels collide when they wrap.
This is pre-existing on `main` and lives in the shell, which the handoff puts
off-limits. Flagged for a follow-up rather than fixed here.

---

## 4. Deployment

`dev` merged to `main` as `80f8ff0` (no-fast-forward) and pushed; Vercel Production
auto-deployed.

| | |
|---|---|
| Deployment | `dpl_8guBBazemmdsdJkJCDPR9Lfq318m` |
| Commit | `80f8ff0d31fc121332c3c3bcc3b1f99cef5a0b44` on `main` |
| State | `READY` · target `production` · region `iad1` · built in 58s |
| Inspector | https://vercel.com/kuriandonyku-2996s-projects/market-intel-ui/8guBBazemmdsdJkJCDPR9Lfq318m |
| Live | https://marketmeerkat.guru |

### Prod verification

The screens harness was re-run against `https://marketmeerkat.guru` after the
deployment went `READY`. All eight target URLs returned 200 with the expected
heading, card and chart counts at 1440px and 390px, no page or console errors, and
no horizontal overflow — `Visual pass clean.`

| URL | Result |
|---|---|
| `/nsw/inner-west/strathfield` | 200 · 31 cards · 12 charts |
| `/nsw/inner-west/strathfield?week=2026-05-04` | 200 · split-fetch week, single point |
| `/nsw/inner-west/strathfield?week=2026-06-29` | 200 · week before the 07-06 gap |
| `/nsw/newcastle/mayfield-west` | 200 · RED badge, n=0 |
| `/nsw/west/north-st-marys` | 200 · `g1_capable=false` with limitation banner |
| `/nsw/eastern-suburbs/point-piper` | 200 · no-market-data state |
| `/nsw/inner-west` | 200 · 22 cards · 23 charts |
| `/nsw/inner-west?week=2026-06-15` | 200 · split-fetch week, single point |

Card counts read one lower on prod than locally because the Next.js dev-overlay
button also carries `aria-expanded`; the prod figures are the true counts.
