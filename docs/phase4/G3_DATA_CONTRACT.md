# G3 Data Contract v2 — Suburb Explorer + Area Analytics (for Phase 4 UI)

Self-contained reference for a frontend dev building the dashboard. Every table
the UI reads, its columns/types/keys/grain, and an example query per page
section. All tables are in the **Market-Intel** Supabase project
(`lyurcephjxokyhiclmgm`), schema `public`, **RLS on with a public SELECT policy**
(anon key can read all of them). Nothing here is written by the UI — read only.

> **v2 (2026-08-02, Round 1).** Three things changed in ways the UI must handle.
> 1. **Deltas are strict.** `wow_/mom_/qoq_` are NULL unless the exact prior week
>    exists. Read §0.1 before rendering any "vs last week" figure.
> 2. **Seeker counts are gone.** `seekers`, `rooms_offered`, `wow_seekers`,
>    `listings_per_seeker`, `total_seekers`, `total_rooms` are now always NULL.
>    Use `implied_seekers`. Read §0.2 — this is a correctness fix, not a rename.
> 3. **Three new tables**: `dash_suburb_price_stats_by_type`,
>    `dash_suburb_supply_by_type`, `dash_suburb_cohorts`. The type-filter list the
>    UI can actually offer is in §7 — it is not the list you would guess.
>
> Nothing was dropped. Deprecated columns still exist and still return rows; they
> just return NULL.

## 0. Conventions you must know

- **Two week keys.**
  - *Legacy* `dash_*` tables key on **`snapshot_date`** = the exact
    `g1_weekly.week_date` (the fetch date). One row per suburb per fetch date.
  - *Phase-3* tables (this contract's new ones) key on **`iso_week`** = the
    **Monday** of the ISO week (`date_trunc('week', d)`). One row per suburb per
    ISO week. **Prefer the Phase-3 tables** for trends/deltas — they collapse the
    4 split-fetch weeks into one point and carry correct WoW/MoM/QoQ.
- **"Latest week"** = `max(iso_week)` (Phase-3) — currently **2026-07-27**.
- **Capable ceiling = 226** (253 roster − 27 `suburbs.g1_capable=false`). Use 226
  as the denominator for completeness, never 253. Skip list:
  `data/g1_capable_skip.csv` / `suburbs.g1_capable`.
- **Slugs.** `suburb_slug` = name-based (`lower`, spaces→`-`, apostrophes dropped),
  e.g. `strathfield`. The postcode slug (e.g. `strathfield-2135`) lives on
  `suburbs.slug` and legacy `suburb_slug_pc`. Join on `suburb_id` when possible.
- **Rents** are clipped to `[50, 2000]` $/week before percentiles.
- **Rooms are shared-house rooms**, so rents ($200–$700) are per room, not per
  dwelling.

### 0.1 Delta semantics — read this before rendering "vs last week"

The weekly series has holes. Some weeks were never fetched at all (there is no
G1 week for 2026-04-20 or 2026-07-06), and individual suburbs drop out of
individual weeks. Until v2, `wow_avg_rent` was computed against the previous
*available* row, so 552 of 2156 populated values were labelled "week on week"
while actually spanning two to four weeks.

From v2 there are two families of delta, and the UI should use both:

| Column family | Meaning | When NULL |
|---|---|---|
| `wow_*` / `mom_*` / `qoq_*` | **Strict.** Difference against the row at exactly −7 / −28 / −91 days. | Whenever that exact week has no row for this suburb. |
| `delta_vs_prev_obs`, `prev_obs_week`, `prev_obs_gap_weeks` | **Honest fallback.** Difference against the previous week this suburb was actually observed, whatever the gap. | Only on a suburb's very first row. |

Recommended rendering:

```ts
if (row.wow_avg_rent != null) {
  show(`${sign(row.wow_avg_rent)} vs last week`);
} else if (row.delta_vs_prev_obs != null) {
  show(`${sign(row.delta_vs_prev_obs)} vs ${row.prev_obs_gap_weeks} weeks ago`);
  // prev_obs_week tells you the exact date if you want a tooltip
} else {
  show("no prior reading");
}
```

When `prev_obs_gap_weeks = 1` the two numbers are identical by construction, so
you can branch on the strict column alone without double-counting. The same
three companion columns exist on `dash_area_weekly` and `dash_city_weekly`.

Current shape of the data: 1604 of 2382 suburb-weeks have a strict WoW; the
other 552 populated deltas moved to `delta_vs_prev_obs` with a gap of 2+ weeks;
226 are first observations with neither.

### 0.2 The demand model — why there is no seeker count

Flatmates renders the "people looking / rooms offered" pair in **two different
display modes** and gives no flag saying which one you are looking at:

- a **reduced ratio**, e.g. `3 : 1`
- **absolute counts**, e.g. `382 : 89`

`g1_weekly.people_looking` and `g1_weekly.rooms_offered` store whatever was on
the page, so the same suburb can read `3` one week and `382` the next with no
real-world change. 143 of 226 suburbs swing by more than 10x across their
history for this reason. Any chart, delta, or ratio built on those numbers as
absolutes is wrong, which is why they are now NULL in every `dash_*` table.

**`demand_ratio` is the one quantity that survives**, because it is identical in
both modes (3/1 = 382/89 ≈ 4.3). Everything demand-side is now derived from it:

```
implied_seekers = round(demand_ratio × live_listings at implied_seekers_basis_week)
```

`live_listings` is our own count of distinct live G2 listings, so it is a true
absolute. Multiplying a mode-invariant ratio by a trustworthy denominator gives a
seeker count that is comparable across suburbs and weeks.

Two companion columns keep it honest during a **G2 block** (a week where the
listing fetch was blocked — currently 2026-07-13, 07-20 and 07-27 have almost no
G2 coverage):

- `implied_seekers_basis_week` — the week the listing count actually came from.
- `implied_seekers_stale_weeks` — `0` when fresh; anything higher means the
  denominator was carried forward and the UI should say so.

Current shape: 1908 of 2382 rows have `implied_seekers`; 514 of those are carried
forward by 1+ weeks (max 11). The 474 NULLs are weeks before G2 coverage began
(2026-04-06 and 04-13) or suburbs with no live listings yet — there is no basis
to imply from, and inventing one would repeat the original mistake.

**All-time demand change** is likewise ratio-based now: `alltime_first_ratio`,
`alltime_latest_ratio`, `alltime_ratio_delta` (read them off the latest row).

## 1. Table catalogue

### Phase-3 tables (ISO-week keyed)

| Table | Grain / key | What it holds |
|---|---|---|
| `dash_suburb_weekly` | (suburb_id, iso_week) | Rent/demand/supply spine + strict WoW/MoM/QoQ + prev-obs companions, implied seekers, all-time deltas, 8-wk volatility, in-area rank |
| `dash_suburb_price_stats` | (suburb_id, iso_week) | Live-rent percentiles p10/p25/p50/p75/p90, dispersion, IQR, mean, bills premium |
| `dash_suburb_price_stats_by_type` | (suburb_id, iso_week, type_dim, type_key) | **v2** The same percentiles split by listing type |
| `dash_suburb_supply_by_type` | (suburb_id, iso_week, type_dim, type_key) | **v2** Listing counts split by listing type, incl. the count-only Flatmates categories |
| `dash_suburb_cohorts` | (suburb_id, iso_week, cohort, type_dim, type_key) | **v2** What was added / what was removed, with its own price distribution |
| `dash_suburb_movement` | (suburb_id, iso_week) | new/gone/repriced/net stock flow, reprice up/down, turnover, DOM, weeks-on-market, closing rent |
| `dash_suburb_band_liquidity` | (suburb_id, iso_week, band_ord) | Per price band: standing vs moved, pct_moved |
| `dash_suburb_coverage` | (suburb_id, iso_week) | g1_capable, g1/g2 presence, sample_n, weeks_present_4, confidence badge |
| `dash_area_weekly` | (area_slug, iso_week) | Area rollup + strict deltas + prev-obs companions + implied seekers + volatility |
| `dash_area_price_stats` | (area_slug, iso_week) | Area-wide live-rent percentiles |
| `dash_area_movement` | (area_slug, iso_week) | Area rollup of movement |
| `dash_area_coverage` | (area_slug, iso_week) | Capable suburbs vs captured, coverage_pct |
| `dash_city_weekly` | (iso_week) | Sydney-wide medians + coverage vs 226 (for vs-Sydney compares) |

### Legacy tables (kept; snapshot_date keyed)

| Table | Grain / key | What it holds |
|---|---|---|
| `dash_suburb_summary` | (suburb_id, snapshot_date) | avg_listing (=g1 avg_rent), demand_ratio, min/max_price, total_listings, active_rooms + WoW |
| `dash_suburb_listing_histogram` | (suburb_id, snapshot_date, band_ord) | 14-band live-rent histogram |
| `dash_suburb_listing_longevity` | (suburb_id, listing_id) | Per-listing first_seen/last_seen/weeks_seen/current_rent/status (rebuilt each week) |
| `dash_area_summary` | (area_slug, snapshot_date) | Area median avg_listing, rooms, total_listings + WoW |
| `dash_area_leaderboard` | (area_slug, suburb_id, snapshot_date) | Per-suburb rank_in_area, avg_listing, demand, classification |
| `dash_area_listing_mix` | (area_slug, snapshot_date) | Area listing counts by type |
| `dash_area_listing_mix_by_suburb` | (area_slug, suburb_id, snapshot_date) | Per-suburb listing counts by type |
| `dash_area_listing_histogram` | (area_slug, snapshot_date, band_ord) | Area 14-band histogram |
| `dash_area_supply_percentile_weekly` | (area_slug, snapshot_date) | Area supply percentiles p10/p30/p50/p70 from g1 bars |
| `dash_band_definitions` | (band_ord) | The 14 price bands: band_ord, band_label, band_low, band_high |

> The legacy tables were **not** re-cut for v2. `dash_suburb_summary.demand_ratio`
> is safe (mode-invariant); its `active_rooms` carries the same raw-count problem
> as the deprecated columns above and should not be charted.

## 2. Column reference (Phase-3 tables)

**dash_suburb_weekly** — `suburb_id bigint`, `suburb_slug text`, `suburb text`,
`area_slug text`, `iso_week date`, `avg_rent numeric`, `p50_bars int` (median from
g1 histogram), `demand_ratio numeric`, `total_listings int` (g2 carry-forward),
`live_listings int` (distinct live listings that week), `rank_in_area int`
(1 = most supply), `wow_avg_rent numeric`, `mom_avg_rent numeric` (−28d),
`qoq_avg_rent numeric` (−91d), `wow_demand_ratio numeric`,
`wow_total_listings int`, `alltime_avg_rent_delta numeric`,
`avg_rent_vol_8w numeric` (stddev of avg_rent over trailing 8 rows),
`computed_at timestamptz`.

*v2 additions* — `delta_vs_prev_obs numeric`, `prev_obs_week date`,
`prev_obs_gap_weeks int` (§0.1); `implied_seekers int`,
`implied_seekers_basis_week date`, `implied_seekers_stale_weeks int`,
`alltime_first_ratio numeric`, `alltime_latest_ratio numeric`,
`alltime_ratio_delta numeric` (§0.2).

*v2 deprecated, always NULL* — `seekers`, `rooms_offered`, `wow_seekers`,
`listings_per_seeker`.

**dash_suburb_price_stats** — `suburb_id`, `suburb_slug`, `area_slug`, `iso_week`,
`sample_n int` (live listings priced), `p10 p25 p50 p75 p90 int`, `mean_rent numeric`,
`dispersion_9010 int` (p90−p10), `iqr_7525 int` (p75−p25), `bills_incl_premium int`
(median bills-incl − median not; **latest iso_week only**, null elsewhere),
`computed_at`.

**dash_suburb_price_stats_by_type** *(v2)* — `suburb_id`, `suburb_slug`,
`area_slug`, `iso_week`, `type_dim text`, `type_key text`, `sample_n int`,
`p10 p25 p50 p75 p90 int`, `mean_rent numeric`, `dispersion_9010 int`,
`iqr_7525 int`, `computed_at`. `type_dim` ∈ `all | bedrooms | tile_kind`; the
`('all','all')` row is identical to `dash_suburb_price_stats` for the same
suburb-week. See §7 for what these dimensions actually mean.

**dash_suburb_supply_by_type** *(v2)* — `suburb_id`, `suburb_slug`, `area_slug`,
`iso_week`, `type_dim text`, `type_key text`, `listings int`,
`share_of_suburb numeric` (of that suburb-week's total for the same `type_dim`),
`source text` (`g2_listings` | `g2_counts`), `basis_week date`, `stale_weeks int`,
`computed_at`. `type_dim` ∈ `all | bedrooms | tile_kind | listing_category`.
Rows with `source='g2_counts'` are count-only and may be carried forward —
check `stale_weeks`.

**dash_suburb_cohorts** *(v2)* — `suburb_id`, `suburb_slug`, `area_slug`,
`iso_week`, `cohort text` (`added` | `removed`), `type_dim text`, `type_key text`,
`count int`, `median_rent int`, `p25 int`, `p75 int`, `dom_median int`
(**removed cohort only**; median days activated_at→last_seen, capped 120),
`repriced_share numeric` (share of the cohort whose rent changed at least once),
`median_weeks_on_market numeric`, `computed_at`.
`added` is priced at each listing's **first** observed rent, `removed` at its
**last** — so the two answer "what came on, at what price" and "what left, at
what price". `count` at `type_dim='all'` reconciles exactly with
`dash_suburb_movement.new_count` / `.gone_count`.

**dash_suburb_movement** — `suburb_id`, `suburb_slug`, `area_slug`, `iso_week`,
`stock int` (live that week), `new_count int` (first_seen in week), `gone_count int`
(last_seen in week & not the current week), `repriced_count int`, `net_flow int`
(new−gone), `reprice_up int`, `reprice_down int`, `new_median_rent int`,
`gone_median_rent int`, `turnover numeric` (gone/stock), `dom_median_days int`
(median days-on-market of live, capped 120), `weeks_on_market_median numeric`
(median (last_seen−first_seen)/7 of gone), `closing_rent int` (0.95×gone median),
`computed_at`.

**dash_suburb_band_liquidity** — `suburb_id`, `suburb_slug`, `area_slug`,
`iso_week`, `band_ord int` (1..14, FK dash_band_definitions), `band_label text`,
`standing int` (live in band), `moved int` (gone in band that week),
`pct_moved numeric`, `computed_at`.

**dash_suburb_coverage** — `suburb_id`, `suburb_slug`, `area_slug`, `iso_week`,
`g1_capable bool`, `g1_present bool`, `g2_present bool`, `sample_n int`,
`weeks_present_4 int` (distinct g2 weeks in trailing 28d), `confidence text`
(GREEN/AMBER/RED; RED <3 listings, AMBER <8, else GREEN, downgraded to AMBER when
weeks_present_4<4), `computed_at`.

**dash_area_weekly** — `area_slug`, `area`, `iso_week`, `suburb_count int`,
`median_avg_rent numeric`, `median_p50 int`, `mean_demand_ratio numeric`,
`total_listings int`, `wow_median_avg_rent numeric`, `mom_median_avg_rent numeric`,
`qoq_median_avg_rent numeric`, `median_avg_rent_vol_8w numeric`, `computed_at`.
*v2 additions* — `delta_vs_prev_obs`, `prev_obs_week`, `prev_obs_gap_weeks`,
`total_implied_seekers int`. *v2 deprecated, always NULL* — `total_seekers`,
`total_rooms`.

**dash_area_price_stats** — `area_slug`, `iso_week`, `sample_n`, `p10..p90`,
`mean_rent`, `dispersion_9010`, `iqr_7525`, `computed_at`.

**dash_area_movement** — `area_slug`, `iso_week`, `stock`, `new_count`,
`gone_count`, `repriced_count`, `net_flow`, `turnover`, `dom_median_days`,
`computed_at`.

**dash_area_coverage** — `area_slug`, `iso_week`, `capable_suburbs int`,
`g1_captured int`, `g2_captured int`, `coverage_pct numeric`, `computed_at`.

**dash_city_weekly** — `iso_week`, `suburb_count`, `capable_ceiling int` (226),
`median_avg_rent`, `median_p50`, `mean_demand_ratio`, `total_listings`,
`capable_captured int`, `coverage_pct numeric`, `wow_median_avg_rent numeric`,
`computed_at`. *v2 additions* — `delta_vs_prev_obs`, `prev_obs_week`,
`prev_obs_gap_weeks`, `total_implied_seekers int`. *v2 deprecated, always NULL* —
`total_seekers`.

## 3. Suburb Explorer — element → table.column mapping (zero unmapped)

Sections A–G per the approved `suburb_explorer_2026-07-01.html`.

| # | UI element (section) | Source table.column |
|---|---|---|
| A1 | Typical rent p50 | `dash_suburb_price_stats.p50` |
| A2 | Percentile band p10/p50/p90 | `dash_suburb_price_stats.p10,p50,p90` |
| A3 | Dispersion (p90−p10) | `dash_suburb_price_stats.dispersion_9010` |
| A4 | Price trend (weekly) | `dash_suburb_weekly.avg_rent` series + `dash_suburb_price_stats.p50` series (order by iso_week) |
| A5 | All-time price change | `dash_suburb_weekly.alltime_avg_rent_delta` (latest row) |
| A6 | Bills-included premium | `dash_suburb_price_stats.bills_incl_premium` (latest iso_week) |
| B7 | Supply level (+ area avg) | `dash_suburb_weekly.live_listings` / `.total_listings`; area ctx `dash_area_weekly.total_listings`, `dash_city_weekly.total_listings` |
| B8 | Share of supply (by type) | **v2** `dash_suburb_supply_by_type.listings, .share_of_suburb` (legacy `dash_area_listing_mix_by_suburb` still available) |
| B9 | New-supply inflow + price | `dash_suburb_movement.new_count`, `.new_median_rent` |
| B10 | All-time supply change | first vs latest `dash_suburb_weekly.live_listings` (order by iso_week) |
| C11 | Seekers (+area/Sydney) | **v2** `dash_suburb_weekly.implied_seekers` (+ `.implied_seekers_stale_weeks` badge); area `dash_area_weekly.total_implied_seekers`; city `dash_city_weekly.total_implied_seekers` |
| C12 | G1 demand ratio (band) | `dash_suburb_weekly.demand_ratio` (band = [r−0.5, r+0.4] computed client-side) |
| C13 | Listings per seeker | **v2 REMOVED** — `listings_per_seeker` is NULL. Show `demand_ratio` (C12) instead; it is the mode-invariant equivalent |
| C14 | All-time demand change | **v2** `dash_suburb_weekly.alltime_first_ratio`, `.alltime_latest_ratio`, `.alltime_ratio_delta` (latest row) |
| D15 | Weekly movement new/gone/repriced/net/stock | `dash_suburb_movement.new_count,gone_count,repriced_count,net_flow,stock` |
| D16 | Flow (new/rented/standing) | `dash_suburb_movement.new_count` (new), `.gone_count` (rented≈gone), `.stock` (standing) |
| D17 | Turnover — share cleared | `dash_suburb_movement.turnover` |
| D18 | Cohort profiles (what rents) | **v2 now full** — `dash_suburb_cohorts` (count, median_rent, p25, p75 per cohort per type) |
| D19 | Weeks on market | `dash_suburb_movement.weeks_on_market_median` (per cohort: `dash_suburb_cohorts.median_weeks_on_market`) |
| D20 | Liquidity by price band | `dash_suburb_band_liquidity` (standing, moved, pct_moved per band_ord) |
| D21 | Reprice behaviour | `dash_suburb_movement.reprice_up,reprice_down,repriced_count` |
| D22 | Reprice on disappeared (cuts) | **v2 now full** — `dash_suburb_cohorts.repriced_share` where `cohort='removed'` |
| D23 | Closing rent (achieved) | `dash_suburb_movement.closing_rent` |
| D24 | Days on market (median) | `dash_suburb_movement.dom_median_days` (per cohort: `dash_suburb_cohorts.dom_median`) |
| E25 | Confidence + checks | `dash_suburb_coverage.confidence,sample_n,weeks_present_4,g1_capable` |
| F26 | Time horizons (1M/2M/3M) | `dash_suburb_weekly.mom_avg_rent` (~1M), `.qoq_avg_rent` (~3M) — **both strict, see §0.1**; weekly series for the spark. 2M not persisted (§6) |
| G27 | Area & supply rank | `suburbs.area` + `dash_suburb_weekly.rank_in_area` (or `dash_area_leaderboard.rank_in_area`) |
| **NEW** | Price by listing type | `dash_suburb_price_stats_by_type` — see §7 for the supportable filter list |
| **NEW** | Movement panels ("what was added" / "what moved") | `dash_suburb_cohorts` split by `cohort` |

## 4. Example queries — per Suburb Explorer section

All examples for Strathfield (`suburb_id = 1`, `suburb_slug = 'strathfield'`).

**Header strip / latest snapshot (A1–A3, C11–C12, E25):**
```sql
select w.avg_rent, w.demand_ratio, w.implied_seekers, w.implied_seekers_stale_weeks,
       w.total_listings, w.live_listings, w.rank_in_area,
       w.wow_avg_rent, w.delta_vs_prev_obs, w.prev_obs_gap_weeks,
       ps.p10, ps.p50, ps.p90, ps.dispersion_9010, ps.bills_incl_premium,
       cov.confidence, cov.sample_n, cov.weeks_present_4
from dash_suburb_weekly w
left join dash_suburb_price_stats ps using (suburb_id, iso_week)
left join dash_suburb_coverage    cov using (suburb_id, iso_week)
where w.suburb_id = 1
order by w.iso_week desc
limit 1;
```

**Price / demand / supply trend lines (A4, B7, C11, F26):**
```sql
select iso_week, avg_rent, p50_bars, demand_ratio, implied_seekers,
       total_listings, live_listings,
       wow_avg_rent, mom_avg_rent, qoq_avg_rent,       -- strict, may be null
       delta_vs_prev_obs, prev_obs_week, prev_obs_gap_weeks,
       avg_rent_vol_8w
from dash_suburb_weekly
where suburb_id = 1
order by iso_week;
```

**Price by listing type (new):**
```sql
select type_dim, type_key, sample_n, p25, p50, p75
from dash_suburb_price_stats_by_type
where suburb_id = 1
  and iso_week = (select max(iso_week) from dash_suburb_price_stats_by_type where suburb_id = 1)
  and type_dim = 'bedrooms'
order by type_key;
```

**Supply by listing type, including the count-only categories (new):**
```sql
select type_dim, type_key, listings, share_of_suburb, source, stale_weeks
from dash_suburb_supply_by_type
where suburb_id = 1
  and iso_week = (select max(iso_week) from dash_suburb_supply_by_type where suburb_id = 1)
order by type_dim, type_key;
```

**Movement panels — what was added / what moved (new, D18/D22):**
```sql
select cohort, type_key, count, median_rent, p25, p75,
       dom_median, repriced_share, median_weeks_on_market
from dash_suburb_cohorts
where suburb_id = 1
  and iso_week = (select max(iso_week) from dash_suburb_cohorts where suburb_id = 1)
  and type_dim = 'all'
order by cohort;
```

**Price ladder / histogram (14 bands):**
```sql
select band_ord, band_label, listing_count
from dash_suburb_listing_histogram
where suburb_id = 1 and snapshot_date = (select max(snapshot_date) from dash_suburb_listing_histogram)
order by band_ord;
```

**Movement + liquidity (D15–D24):**
```sql
select * from dash_suburb_movement where suburb_id = 1 order by iso_week desc limit 1;

select band_ord, band_label, standing, moved, pct_moved
from dash_suburb_band_liquidity
where suburb_id = 1 and iso_week = (select max(iso_week) from dash_suburb_band_liquidity)
order by band_ord;
```

**Percentile weekly series (A2 trend):**
```sql
select iso_week, sample_n, p10, p25, p50, p75, p90, dispersion_9010
from dash_suburb_price_stats where suburb_id = 1 order by iso_week;
```

**vs-Sydney context (C11):**
```sql
select iso_week, median_avg_rent, total_implied_seekers, total_listings, coverage_pct
from dash_city_weekly order by iso_week desc limit 1;
```

## 5. Area Analytics — element → table + example queries

The area view mirrors the suburb explorer at the `area_slug` level.

| Area UI element | Source |
|---|---|
| Summary strip (median rent, listings, suburb count) | `dash_area_weekly` (+ legacy `dash_area_summary`) |
| Rent trend + WoW/MoM/QoQ + volatility | `dash_area_weekly.median_avg_rent, wow_/mom_/qoq_median_avg_rent, delta_vs_prev_obs, median_avg_rent_vol_8w` |
| Price percentiles / dispersion | `dash_area_price_stats` |
| Demand / supply / seekers trend | `dash_area_weekly.mean_demand_ratio, total_implied_seekers, total_listings` |
| Leaderboard (suburbs ranked) | `dash_area_leaderboard` (rank_in_area, avg_listing, demand, classification) |
| Listing mix by type | `dash_area_listing_mix` (+ per-suburb `dash_suburb_supply_by_type`) |
| Price histogram (14 bands) | `dash_area_listing_histogram` |
| Movement / turnover / DOM | `dash_area_movement` |
| Supply percentile (g1 bars) | `dash_area_supply_percentile_weekly` |
| Coverage badge (captured vs capable) | `dash_area_coverage.coverage_pct, g1_captured, capable_suburbs` |

```sql
-- Area trend (Inner West)
select iso_week, suburb_count, median_avg_rent, mean_demand_ratio, total_listings,
       total_implied_seekers, wow_median_avg_rent, mom_median_avg_rent,
       qoq_median_avg_rent, delta_vs_prev_obs, prev_obs_gap_weeks,
       median_avg_rent_vol_8w
from dash_area_weekly where area_slug = 'inner-west' order by iso_week;

-- Area leaderboard latest
select suburb, rank_in_area, avg_listing, demand_ratio, classification, total_listings
from dash_area_leaderboard
where area_slug='inner-west' and snapshot_date=(select max(snapshot_date) from dash_area_leaderboard)
order by rank_in_area;

-- Area coverage latest
select area_slug, capable_suburbs, g1_captured, coverage_pct
from dash_area_coverage where iso_week=(select max(iso_week) from dash_area_coverage)
order by coverage_pct desc;
```

## 6. Known limitations / partial coverage

- **Bills premium (A6)** is populated on the **latest `iso_week` only** per
  suburb (point-in-time); earlier weeks are null.
- **2-month horizon (F26)** is not persisted (only ~1M via `mom_avg_rent` and ~3M
  via `qoq_avg_rent`). The weekly series supports any client-side horizon.
- **Movement `gone`/turnover** depend on `last_seen_week`; the current ISO week is
  never counted as "gone" (a listing can't have disappeared in the live week), so
  the latest week shows `gone_count`≈0 by design. `dash_suburb_cohorts` inherits
  this — the `removed` cohort is empty in the current week.
- **Legacy vs Phase-3 grain.** For the 4 split-fetch weeks (w/c 2026-04-27,
  05-04, 05-25, 06-15) the legacy tables have two `snapshot_date` rows; the
  Phase-3 tables have one `iso_week` row. Use Phase-3 for anything week-indexed.
- **The ISO-week spine is anchored on G1.** Weeks with G2 data but no G1 fetch
  (2026-04-20 and 2026-07-06) have no row in any Phase-3 table. Their listings are
  still counted, but against the nearest G1 week. This is why the strict WoW at
  2026-07-13 is NULL for every suburb: 07-06 is not in the spine.
- **G2-block weeks are real, not a bug.** 2026-07-13 / 07-20 / 07-27 have almost
  no live G2 listings. `total_listings` and the `listing_category` supply rows
  carry forward from the last good week — check `stale_weeks` and
  `implied_seekers_stale_weeks` and badge the UI accordingly.
- **Rent source split is by design.** `dash_suburb_weekly.avg_rent` is the G1
  model's average; `dash_suburb_price_stats.p50` is the median of live G2
  listings. They are different measurements of different populations and will not
  agree exactly.
- **`dash_suburb_cohorts.median_weeks_on_market`** is the observed lifetime to
  date, so for `cohort='added'` it reports how long those listings ended up
  staying, not how long they had been listed at the time they appeared.

## 7. Type-filter support matrix

The UI filter list is **not** the list of Flatmates property categories. Here is
what the data actually supports, and why.

| `type_dim` | `type_key` values | Supports supply counts | Supports prices | Source |
|---|---|---|---|---|
| `all` | `all` | yes | yes | live G2 listings |
| `bedrooms` | `1` `2` `3` `4` `5` `6` | yes | **yes** | live G2 listings (`bedrooms` on every listing) |
| `tile_kind` | `premium` `basic` | yes | **yes** | live G2 listings |
| `listing_category` | `share_houses` `granny_flats` `studios` `one_beds` `whole_properties` `student_accommodation` `homestays` | yes | **no** | `g2_counts` aggregate |

Two things to be careful about:

**`tile_kind` is an ad tier, not a property type.** Across all 31,183 history
rows it takes exactly two values, `premium` and `basic`, which is Flatmates'
listing-promotion level. It is genuinely useful — premium listings in Strathfield
run a median $295 against $355 for basic — but do not label it "property type" in
the UI.

**Whole properties, granny flats, studios, student accommodation and homestays
are count-only.** These seven categories exist solely as per-suburb-week integers
on `g2_counts`; the per-listing scrape does not carry a category field, so there
are no individual rents to take percentiles of. `dash_suburb_supply_by_type`
serves them with `source='g2_counts'`, and `dash_suburb_price_stats_by_type` will
never have a `listing_category` row. A "filter by whole property" control can
therefore change a supply chart but cannot change a price chart. If price-by-
category is wanted, it needs a G2 fetcher change to capture the category per
listing — a Round-2+ scope item, not a data-layer fix.

`bedrooms` is complete: all 31,183 history rows carry a value in 1–6, so no
`unknown` bucket appears in practice (the pipeline would emit one if a null ever
arrived).

## 8. Rebuild, audit, and freshness

- **Rebuild:** `.venv/bin/python scripts/run_g3.py` (see `docs/runbook.md`).
  Truncate-and-rebuild, idempotent — `--check` proves it by hashing twice.
- **Audit:** `.venv/bin/python scripts/audit_g3.py` runs 32 invariants
  (structure, strict deltas, demand model, type reconciliation, cohort
  reconciliation) and exits non-zero if any is violated. Run it after every
  rebuild; a green audit is the contract's guarantee that the rules in §0.1 and
  §0.2 actually hold in the data.
- **Freshness:** every date-keyed `dash_*` table should report the current ISO
  week. Query in `docs/runbook.md`.
