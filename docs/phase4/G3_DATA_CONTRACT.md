# G3 Data Contract — Suburb Explorer + Area Analytics (for Phase 4 UI)

Self-contained reference for a frontend dev building the dashboard. Every table
the UI reads, its columns/types/keys/grain, and an example query per page
section. All tables are in the **Market-Intel** Supabase project
(`lyurcephjxokyhiclmgm`), schema `public`, **RLS on with a public SELECT policy**
(anon key can read all of them). Nothing here is written by the UI — read only.

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

## 1. Table catalogue

### Phase-3 tables (new — ISO-week keyed)

| Table | Grain / key | What it holds |
|---|---|---|
| `dash_suburb_weekly` | (suburb_id, iso_week) | Rent/demand/supply/seekers spine + WoW/MoM/QoQ, all-time delta, 8-wk volatility, in-area rank |
| `dash_suburb_price_stats` | (suburb_id, iso_week) | Live-rent percentiles p10/p25/p50/p75/p90, dispersion, IQR, mean, bills premium |
| `dash_suburb_movement` | (suburb_id, iso_week) | new/gone/repriced/net stock flow, reprice up/down, turnover, DOM, weeks-on-market, closing rent |
| `dash_suburb_band_liquidity` | (suburb_id, iso_week, band_ord) | Per price band: standing vs moved, pct_moved |
| `dash_suburb_coverage` | (suburb_id, iso_week) | g1_capable, g1/g2 presence, sample_n, weeks_present_4, confidence badge |
| `dash_area_weekly` | (area_slug, iso_week) | Area rollup of the suburb spine + WoW/MoM/QoQ + volatility |
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

## 2. Column reference (Phase-3 tables)

**dash_suburb_weekly** — `suburb_id bigint`, `suburb_slug text`, `suburb text`,
`area_slug text`, `iso_week date`, `avg_rent numeric`, `p50_bars int` (median from
g1 histogram), `demand_ratio numeric`, `seekers int` (g1 people_looking),
`rooms_offered int`, `total_listings int` (g2 carry-forward), `live_listings int`
(distinct live listings that week), `listings_per_seeker numeric`,
`rank_in_area int` (1 = most supply), `wow_avg_rent numeric`, `mom_avg_rent numeric`
(−28d), `qoq_avg_rent numeric` (−91d), `wow_demand_ratio numeric`, `wow_seekers int`,
`wow_total_listings int`, `alltime_avg_rent_delta numeric`, `avg_rent_vol_8w numeric`
(stddev of avg_rent over trailing 8 rows), `computed_at timestamptz`.

**dash_suburb_price_stats** — `suburb_id`, `suburb_slug`, `area_slug`, `iso_week`,
`sample_n int` (live listings priced), `p10 p25 p50 p75 p90 int`, `mean_rent numeric`,
`dispersion_9010 int` (p90−p10), `iqr_7525 int` (p75−p25), `bills_incl_premium int`
(median bills-incl − median not; **latest iso_week only**, null elsewhere),
`computed_at`.

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
`total_seekers int`, `total_rooms int`, `total_listings int`,
`wow_median_avg_rent numeric`, `mom_median_avg_rent numeric`,
`qoq_median_avg_rent numeric`, `median_avg_rent_vol_8w numeric`, `computed_at`.

**dash_area_price_stats** — `area_slug`, `iso_week`, `sample_n`, `p10..p90`,
`mean_rent`, `dispersion_9010`, `iqr_7525`, `computed_at`.

**dash_area_movement** — `area_slug`, `iso_week`, `stock`, `new_count`,
`gone_count`, `repriced_count`, `net_flow`, `turnover`, `dom_median_days`,
`computed_at`.

**dash_area_coverage** — `area_slug`, `iso_week`, `capable_suburbs int`,
`g1_captured int`, `g2_captured int`, `coverage_pct numeric`, `computed_at`.

**dash_city_weekly** — `iso_week`, `suburb_count`, `capable_ceiling int` (226),
`median_avg_rent`, `median_p50`, `mean_demand_ratio`, `total_seekers`,
`total_listings`, `capable_captured int`, `coverage_pct numeric`,
`wow_median_avg_rent numeric`, `computed_at`.

## 3. Suburb Explorer — element → table.column mapping (zero unmapped)

Sections A–G per the approved `suburb_explorer_2026-07-01.html`. "T" = table.

| # | UI element (section) | Source table.column |
|---|---|---|
| A1 | Typical rent p50 | `dash_suburb_price_stats.p50` |
| A2 | Percentile band p10/p50/p90 | `dash_suburb_price_stats.p10,p50,p90` |
| A3 | Dispersion (p90−p10) | `dash_suburb_price_stats.dispersion_9010` |
| A4 | Price trend (weekly) | `dash_suburb_weekly.avg_rent` series + `dash_suburb_price_stats.p50` series (order by iso_week) |
| A5 | All-time price change | `dash_suburb_weekly.alltime_avg_rent_delta` (latest row) |
| A6 | Bills-included premium | `dash_suburb_price_stats.bills_incl_premium` (latest iso_week) |
| B7 | Supply level (+ area avg) | `dash_suburb_weekly.live_listings` / `.total_listings`; area ctx `dash_area_weekly.total_listings`, `dash_city_weekly.total_listings` |
| B8 | Share of supply (by type) | `dash_area_listing_mix_by_suburb.<type>` ÷ that row's total_listings |
| B9 | New-supply inflow + price | `dash_suburb_movement.new_count`, `.new_median_rent` |
| B10 | All-time supply change | first vs latest `dash_suburb_weekly.live_listings` (order by iso_week) |
| C11 | Seekers (+area/Sydney) | `dash_suburb_weekly.seekers`; area `dash_area_weekly.total_seekers`; city `dash_city_weekly.total_seekers` |
| C12 | G1 demand ratio (band) | `dash_suburb_weekly.demand_ratio` (band = [r−0.5, r+0.4] computed client-side) |
| C13 | Listings per seeker | `dash_suburb_weekly.listings_per_seeker` |
| C14 | All-time demand change | first vs latest `dash_suburb_weekly.seekers` |
| D15 | Weekly movement new/gone/repriced/net/stock | `dash_suburb_movement.new_count,gone_count,repriced_count,net_flow,stock` |
| D16 | Flow (new/rented/standing) | `dash_suburb_movement.new_count` (new), `.gone_count` (rented≈gone), `.stock` (standing) |
| D17 | Turnover — share cleared | `dash_suburb_movement.turnover` |
| D18 | Cohort profiles (what rents) | `dash_suburb_movement.new_median_rent`, `.gone_median_rent` (**partial** — per-cohort p10/p90/top-bed not persisted; see §6) |
| D19 | Weeks on market | `dash_suburb_movement.weeks_on_market_median` |
| D20 | Liquidity by price band | `dash_suburb_band_liquidity` (standing, moved, pct_moved per band_ord) |
| D21 | Reprice behaviour | `dash_suburb_movement.reprice_up,reprice_down,repriced_count` |
| D22 | Reprice on disappeared (cuts) | `dash_suburb_movement.gone_median_rent` vs new; reprice up/down (**partial**, §6) |
| D23 | Closing rent (achieved) | `dash_suburb_movement.closing_rent` |
| D24 | Days on market (median) | `dash_suburb_movement.dom_median_days` |
| E25 | Confidence + checks | `dash_suburb_coverage.confidence,sample_n,weeks_present_4,g1_capable` |
| F26 | Time horizons (1M/2M/3M) | `dash_suburb_weekly.mom_avg_rent` (~1M), `.qoq_avg_rent` (~3M); weekly series for the spark. 2M not persisted (§6) |
| G27 | Area & supply rank | `suburbs.area` + `dash_suburb_weekly.rank_in_area` (or `dash_area_leaderboard.rank_in_area`) |

Legacy equivalents still available if preferred for the point-in-time strip:
`dash_suburb_summary` (avg_listing, demand_ratio, min/max_price, total_listings,
active_rooms + WoW) and `dash_suburb_listing_histogram` (14-band ladder).

## 4. Example queries — per Suburb Explorer section

All examples for Strathfield (`suburb_id = 1`, `suburb_slug = 'strathfield'`).

**Header strip / latest snapshot (A1–A3, C12, E25):**
```sql
select w.avg_rent, w.demand_ratio, w.seekers, w.total_listings, w.live_listings, w.rank_in_area,
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
select iso_week, avg_rent, p50_bars, demand_ratio, seekers, total_listings, live_listings,
       wow_avg_rent, mom_avg_rent, qoq_avg_rent, avg_rent_vol_8w
from dash_suburb_weekly
where suburb_id = 1
order by iso_week;
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
select iso_week, median_avg_rent, total_seekers, total_listings, coverage_pct
from dash_city_weekly order by iso_week desc limit 1;
```

## 5. Area Analytics — element → table + example queries

The area view mirrors the suburb explorer at the `area_slug` level.

| Area UI element | Source |
|---|---|
| Summary strip (median rent, rooms, listings, suburb count) | `dash_area_weekly` (+ legacy `dash_area_summary`) |
| Rent trend + WoW/MoM/QoQ + volatility | `dash_area_weekly.median_avg_rent, wow_/mom_/qoq_median_avg_rent, median_avg_rent_vol_8w` |
| Price percentiles / dispersion | `dash_area_price_stats` |
| Demand / supply / seekers trend | `dash_area_weekly.mean_demand_ratio, total_seekers, total_listings` |
| Leaderboard (suburbs ranked) | `dash_area_leaderboard` (rank_in_area, avg_listing, demand, classification) |
| Listing mix by type | `dash_area_listing_mix` (+ per-suburb `dash_area_listing_mix_by_suburb`) |
| Price histogram (14 bands) | `dash_area_listing_histogram` |
| Movement / turnover / DOM | `dash_area_movement` |
| Supply percentile (g1 bars) | `dash_area_supply_percentile_weekly` |
| Coverage badge (captured vs capable) | `dash_area_coverage.coverage_pct, g1_captured, capable_suburbs` |

```sql
-- Area trend (Inner West)
select iso_week, suburb_count, median_avg_rent, mean_demand_ratio, total_listings,
       wow_median_avg_rent, mom_median_avg_rent, qoq_median_avg_rent, median_avg_rent_vol_8w
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

- **Cohort profiles (D18) and reprice-on-disappeared detail (D22).** The
  aggregate flows (new/gone counts + medians, reprice up/down) are persisted in
  `dash_suburb_movement`; the pilot's *per-cohort* p10/p90/top-bedroom breakdown
  is computed live and is **not** persisted. If the UI needs it, either compute
  from `g2_listings_current`/`g2_listings_history` client-side or request a
  `dash_suburb_cohorts` table in a follow-up.
- **Bills premium (A6)** is populated on the **latest `iso_week` only** per
  suburb (point-in-time); earlier weeks are null.
- **2-month horizon (F26)** is not persisted (only ~1M via `mom_avg_rent` and ~3M
  via `qoq_avg_rent`). The weekly series supports any client-side horizon.
- **Movement `gone`/turnover** depend on `last_seen_week`; the current ISO week is
  never counted as "gone" (a listing can't have disappeared in the live week), so
  the latest week shows `gone_count`≈0 by design.
- **Legacy vs Phase-3 grain.** For the 4 split-fetch weeks (w/c 2026-04-27,
  05-04, 05-25, 06-15) the legacy tables have two `snapshot_date` rows; the
  Phase-3 tables have one `iso_week` row. Use Phase-3 for anything week-indexed.
