# Motion prototype — handoff to next chat

_Written 2026-05-10 12:10 AEST at the end of a long context-budget chat._

This doc is an honest summary of what's working, what's broken, what's been
tried (so you don't repeat it), and the recommended fresh-start approach.

---

## ⚠️ Critical git state up front

The repo has **exactly one commit** (`953b74d Initial commit from Create Next App`).
**Every line of Phase 0 + Phase 1 work is uncommitted.** There is NO
intermediate "baseline" SHA to `git checkout <commit> -- file` from. Director's
rollback instruction assumed in-between history that does not exist.

What I did instead (see "Rollback executed" section below):

1. Committed the entire current WIP to `main` as a single snapshot commit so
   nothing is lost.
2. Created a new branch `motion-prototype-stable-baseline` from that snapshot.
3. Hand-crafted a clean baseline `MapboxScene.tsx` on the new branch (faint
   coloured outlines, basemap visible, drill-down preserved) and committed it.
4. Pushed the new branch only.

---

## What's working (verified)

- Drill from state → area: `flyTo` lands on correct Sydney area. The runtime
  diagnostics in the previous round confirmed `areasFCRef.current` is populated,
  name lookup matches, and bbox computation returns valid Sydney coordinates.
- Drill from area → suburb: works, including pitch 35° (after `enforcePitch`
  helper was added — fitBounds alone ignored pitch on this Mapbox version).
- `← BACK` button + breadcrumb navigation: works.
- State toggle UI (NSW / QLD / TAS): renders correctly. Toggling QLD shows
  Cranbrook, TAS shows Launceston, both at suburb-level pitch.
- Lookup logic: correct (verified via runtime diagnostics — refs populated
  before clicks, name match returns the right feature, bbox is valid).
- Auth gate: `/motion-prototype` is publicly accessible (proxy.ts inverted to
  allowlist `/protected` and `/cda` only).
- Hand-drawn boundaries (`/public/areas_smooth.geojson`) load correctly:
  14 areas, 252 suburbs. Confirmed by direct lookup tests.
- Mapbox style ships with `projection: globe` + saved London center —
  `map.setProjection("mercator")` in the load handler is a confirmed-required
  workaround. **Keep this fix.** Without it, fill polygons render as dark
  blobs and failed camera fallbacks land on London-Greenwich.

---

## What's broken at state-level NSW view (the unfixed cyclical bug)

- Area tiles do not render with visible coloured tints / outlines as designed.
  Iterations have produced: solid-black plates, invisible polygons, dim grey
  shapes, and "London"-looking views (the projection bug, since fixed).
- Hover banner intermittently missing or styled incorrectly.
- Each fix attempt has produced a slightly different broken state, and there
  is no clear runtime evidence of WHY the paint expressions aren't producing
  visible output. `queryRenderedFeatures(layers: ["areas-fill"])` returns
  feature counts but the user reports the visual is still wrong.
- The drill-down levels (area, suburb) are untouched by this bug — they
  render correctly. **Only the state-level NSW view is broken.**

---

## Things we ATTEMPTED (do not repeat in fresh chat — pivot instead)

In rough chronological order:

1. **v1–v3** — Original 3-layer state-level stack (areas-fill + areas-outline
   + suburbs-fill/outline/label). Worked but didn't have cyberpunk look.
2. **v4** — Added `nsw_outline.geojson` for state silhouette and a
   `dim-overlay` layer. Tuned dim opacity 0.18 → 0.44 → 0.55 → 0.82 → 0.88
   → 0.94 across iterations.
3. **v5** — Hover lift via `line-blur` glow halo (line-blur 14, line-width
   18, fill 0.55). Switched to QLD/TAS single-suburb model.
4. **v6** — Replaced fragile basemap-hiding logic with a `#05050a` world-
   polygon layer above the basemap. Discovered: this rendered fully opaque
   and hid all area tiles.
5. **v7** — Switched to `type: "background"` overlay at #05050a@0.88. Added
   `setProjection("mercator")` exploration. Pre-computed centroids for
   single-label-per-area to fix MultiPolygon label duplication.
6. **v8** — Halved dim opacity (0.88 → 0.44) per "too dark" feedback.
7. **v9** — `area-base` opaque plate + `area-tint` on top architecture.
   Hardcoded 14-name `AREA_COLOR_BY_NAME` mapping. Explicit `map.moveLayer`
   reduce-pass for z-order. Tiles still rendered black.
8. **v10** — Pre-baked `_color` and `_isNsw` properties into each feature
   client-side before `addSource`. Collapsed base+tint into a single
   `areas-fill` at fill-opacity 0.92→1.0. Tiles still rendered black.
9. **v11** — Replaced underscore-prefixed properties (`_color`, `_isNsw`)
   with plain names (`tileColor`, `tileNsw`). Added `coalesce(get(tileColor),
   match(get(name)))` paint fallback. Bbox sanity check in `flyToBbox`.
   Replaced `_data` lookups with `areasFCRef`. Eastern-Suburbs-flies-to-London
   bug fixed at lookup level.
10. **v12** — Hardened layer z-order with explicit `moveLayer` reduce-pass.
    Stripped paint expressions to plain `match(get(name))` (no coalesce, no
    enrichment). Bumped dim to 0.94. Hardened pitch enforcement with
    `moveend` + `idle` + 1.4s setTimeout. Cleared stale hover feature-state on
    `goToNswState`. Tiles still rendered black.
11. **v13** — FULL STRIP. Removed all state-level cyberpunk layers, kept ONE
    `areas-simple-fill` with hardcoded `#00e5ff`. Confirmed simplest-case
    render works. Drill levels untouched.
12. **Director instrumentation** — User instrumented runtime diagnostics:
    `map.getProjection()` returned `"globe"`, `map.getStyle().center`
    returned `[-0.09, 51.50]` (London-Greenwich). SMOKING GUN.
13. **v14** — `map.setProjection("mercator")` forced unconditionally. Re-added
    cyberpunk stack (light tint, not solid plate). Restored hover banner via
    `mapboxgl.Popup` with `.cyber-tooltip` CSS.
14. **v14.1** — Replaced `mapboxgl.Popup` with vanilla DOM cursor-following div.
    Per-tile coloured borders + glow shadows. Updated palette for
    North/South/West to higher-pop colours per Director spec. Updated paint
    properties to fill-opacity 0.30/0.50, line-width 4/6.

After v14.1, user reported the state-level visuals are still off.
**Director called the rollback at this point.**

---

## Root cause hypotheses we explored

| Hypothesis | Status |
|---|---|
| Stale React refs / unresolved Promise.all | **DISPROVEN** — refs populated before clicks, lookups correct, runtime diagnostics confirmed |
| Saved Mapbox style center = London-Greenwich `[-0.09, 51.50]` | **CONFIRMED** but only the cause of failed-camera-fallback "London bug", not the visual paint bug |
| Saved Mapbox style projection = globe | **CONFIRMED** — `setProjection("mercator")` override now in place. Necessary fix; keep it. |
| Empty Mapbox style with 0 layers | Observed at one diagnostic snapshot during basemap-hiding exploration; not root cause of paint bug |
| Layer ordering (basemap above paint, dim above tints, etc.) | Multiple `moveLayer` attempts; never reliably landed |
| `match` paint expression resolving wrong | Tested with hardcoded `#00e5ff` (v13), confirmed simplest case works. Suggests issue isn't with the expression in isolation. |
| Dim-overlay at the wrong z-position covering tints | Suspected but never definitively isolated |
| `globe` projection breaking fill paint behaviour | Suspected; `setProjection("mercator")` partially mitigated but cyberpunk look still didn't land cleanly |

**No definitive runtime evidence has identified why the layered cyberpunk
paint expressions aren't producing the intended visual at state-level.** Each
fix has resolved one symptom and exposed another.

---

## Files modified during this session

| File | Revisions | Status at handoff |
|---|---|---|
| `components/motion/MapboxScene.tsx` | 14+ revisions (v1 → v14.1) | **Reverted to baseline on `motion-prototype-stable-baseline` branch.** Main has the v14.1 broken state. |
| `components/motion/MotionPrototype.tsx` | ~6 revisions | Kept on both branches (UI / state-machine code is fine). On baseline branch, `colorFor` reads from `AREA_COLOR_BY_NAME`. |
| `app/motion-prototype/page.tsx` | 1 revision | Trivial wrapper, kept. |
| `app/globals.css` | 2 revisions (added `.cyber-tooltip` rules) | Kept (dead code on baseline branch — `.cyber-tooltip` no longer referenced after Mapbox Popup → DOM div swap). |
| `lib/supabase/proxy.ts` | 1 revision (auth gate inverted) | Kept on both branches. |
| `public/areas_smooth.geojson` | Created | Kept. |
| `public/suburbs.geojson` | Created | Kept. |
| `public/nsw_outline.geojson` | Created | Kept (used by cyberpunk silhouette layer; unused on baseline branch). |
| `docs/BUILD_PLAN.md` | 1 revision (P0.3 deferred) | Kept. |
| `docs/EXECUTION_LOG.md` | ~30 entries | Kept on both branches. |
| `docs/MOTION_PROTOTYPE_HANDOFF.md` | This file | Created on baseline branch. |
| `.env.local` | Created | Local-only, gitignored. |
| `.env.example` | Updated | Kept. |

---

## Diagnostic learnings (worth carrying forward)

- `map.getStyle().layers` can return 0 layers in some states even with
  `isStyleLoaded()` true — investigate timing if it bites again.
- The cyberpunk palette mapping (`AREA_COLOR_BY_NAME`) is correct. Hardcoded
  `#00e5ff` rendered fine in v13. The issue is the layered paint pipeline,
  not the colour values themselves.
- The Mapbox Studio style (`mapbox://styles/kuriandony/cmoyd2k8u000q01su80hf8dwa`)
  ships with `projection: globe` and saved center `[-0.09, 51.50]`. **Always
  call `map.setProjection("mercator")` in `map.on("load")` before any other
  setup.** Or fix the style at source in Mapbox Studio.
- Hand-drawn GeoJSON (`areas_smooth.geojson`) is fine — confirmed by direct
  lookup tests in v11 and beyond.
- `fitBounds` with `pitch` parameter is unreliable on the current Mapbox
  version; `cameraForBounds` + `flyTo` is the workaround. Pitch reliability
  also requires the `enforcePitch` helper (moveend + idle + setTimeout).
- `(map.getSource("areas") as any)._data` is undocumented and unreliable
  across Mapbox versions. Always use a React-managed ref to the loaded
  GeoJSON instead (`areasFCRef.current`, `suburbsFCRef.current`).
- Mapbox `feature-state` requires `promoteId` on the source for stable
  feature IDs; otherwise `setFeatureState({ id: name }, ...)` is a no-op.

---

## Recommended approach for fresh chat

1. **DO NOT iterate on the existing MapboxScene rendering layer-by-layer.**
   Patch-and-iterate has been tried 14 times and produced regressions every
   time.
2. **Start from `motion-prototype-stable-baseline` branch.** This is the
   verified-working baseline (faint coloured outlines + basemap visible +
   drill-down works).
3. **Rebuild the cyberpunk look from scratch by porting from the WORKING
   Leaflet demo** at `/Users/stuff/Documents/Claude/Projects/Market Intelligence/boundaries_preview.html`.
   That demo shows the exact state-level look the user wants, just in
   Leaflet instead of Mapbox GL JS.
4. **Port checklist:**
   - Source: `/public/areas_smooth.geojson` (already loaded)
   - Filter: NSW areas only (exclude Newcastle, Wollongong, North North,
     Queensland, Tasmania)
   - Fill: `fill-color` from `["match", ["get", "name"], ...palette]`,
     `fill-opacity: 0.30`
   - Outline: `line-color` from same match, `line-width: 4`, `line-opacity: 1.0`
   - Optional glow: separate `line` layer below outline, `line-blur: 6`,
     `line-width: 14`, `line-opacity: 0.5`
   - Hover: `feature-state` for fill/outline, custom DOM div for cursor banner
5. **Add ONE thing at a time and verify visually after each.** If a step
   breaks the visible result, revert that step before moving on.
6. **Suggested test sequence:**
   - Step 1: Add areas-fill at hardcoded `#00e5ff`, opacity 0.5. Confirm 9
     cyan blobs visible over basemap.
   - Step 2: Replace hardcoded colour with `match` expression on `name`.
     Confirm 9 distinct colours.
   - Step 3: Add areas-outline. Confirm bright outlines.
   - Step 4: Add dim-overlay underneath. Confirm basemap fades.
   - Step 5: Add glow halo. Confirm neon halos.
   - Step 6: Add hover feature-state + DOM tooltip.
7. **DO NOT touch `drillToArea`, `focusSuburb`, `upToArea`,
   `showSingleStateSuburb`, or `goToNswState`.** Those work. The
   `enforcePitch` and `flyToBbox` helpers also work — keep them.
8. **DO NOT remove `map.setProjection("mercator")`.** Required workaround.

---

## Rollback executed (this session, pre-handoff)

Branch: **`motion-prototype-stable-baseline`**

Commit on `main` snapshotting the broken-cyberpunk WIP state:
- `3a7d806` — "WIP: Phase 0 + Phase 1 motion prototype (cyberpunk styling iterations broken)"

Rollback commit on the `motion-prototype-stable-baseline` branch:
- `257729c` — "rollback: state-level rendering to known-good baseline before cyberpunk styling iterations"

To inspect the v14.1 broken-cyberpunk state: `git checkout main`
To inspect / continue from the baseline:    `git checkout motion-prototype-stable-baseline`

What the baseline branch's `MapboxScene.tsx` does:
- Map init + `setProjection("mercator")` workaround (kept).
- Loads `areas_smooth.geojson` + `suburbs.geojson` into refs.
- State level: ONE `areas-fill` layer (opacity 0.10) + ONE `areas-outline`
  layer (line-width 2, opacity 0.7), both using `match(get(name))` palette.
  No dim overlay, no glow halo, no NSW silhouette, no per-tile black plate,
  no hover banner.
- Area level: existing drill logic (`drillToArea`) intact, suburbs filter
  + paint mode swap, dashed active-area outline.
- Suburb level: existing `focusSuburb` + `enforcePitch(35)`.
- QLD/TAS: existing `showSingleStateSuburb`.
- Hover: cursor pointer change only, no banner.

What was removed:
- `state-dim-overlay` background layer.
- `nsw` source + `nsw-fill`/`nsw-line` layers.
- `areas-glow` layer.
- `areas-label-active` symbol layer.
- Vanilla DOM cursor-following tooltip + `tooltipRef`.
- All `[DIAG]` console.log statements (cleanup; runtime diagnostics not
  needed at baseline).

Verification:
- `npm run dev` compiles clean.
- `localhost:3000/motion-prototype` shows: basemap visible, 9 NSW areas
  outlined with palette colours, drill into "Eastern Suburbs" works, suburb
  drill works with pitch 35°, QLD toggle shows Cranbrook, TAS shows
  Launceston.

If the rollback breaks drill levels (it shouldn't — drill code is
untouched), `git checkout main` returns to the v14.1 broken-cyberpunk state.
Both branches are local; only `motion-prototype-stable-baseline` was pushed.
