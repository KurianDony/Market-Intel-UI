"use client";

import { useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import mapboxgl from "mapbox-gl";

// ── Cyberpunk palette ────────────────────────────────────────────────────────

export const CYBERPUNK_PALETTE = [
  "#00ffff", "#00e5ff", "#00b8d4", "#29b6f6", "#2196f3",
  "#3f51b5", "#5c6bc0", "#7e57c2", "#9c27b0", "#d500f9",
  "#e040fb", "#ff4081", "#f50057", "#ff1744",
];

// NSW-only — exclude algorithmic boundary boxes
export const EXCLUDED_AREA_NAMES = ["Newcastle", "Wollongong", "North North", "Queensland", "Tasmania"];

// ── Frames ───────────────────────────────────────────────────────────────────

export const NSW_STATE_BBOX: mapboxgl.LngLatBoundsLike = [150.50, -34.55, 151.95, -32.80];

const SUBURB_PITCH = 35;
const FLAT_PITCH = 0;
const PAGE_BG = "#05050a";

// State-level dim factor — basemap is rendered at full strength but masked by
// a `background` layer at this opacity. 0.94 → ~6% of basemap leaks through —
// Sydney coastline silhouette readable, Newcastle/Bathurst labels not.
// (v7=0.88, v8=0.44 too weak, v12=0.94 per Director.)
const STATE_DIM_OPACITY = 0.94;

// ── Types ────────────────────────────────────────────────────────────────────

export type Area = { name: string; slug: string };
export type Suburb = { name: string; slug: string; postcode: string; area: string; state: string };

export interface MapboxSceneHandle {
  goToNswState: () => void;
  drillToArea: (area: Area) => void;
  focusSuburb: (suburb: Suburb) => void;
  upToArea: (area: Area) => void;
  showSingleStateSuburb: (suburb: Suburb) => void;
  getAreaCounts: () => Record<string, number>;
}

interface Props {
  onAreaClick: (area: Area) => void;
  onSuburbClick: (suburb: Suburb) => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function geomBbox(geom: GeoJSON.Geometry): [number, number, number, number] {
  const pts: [number, number][] = [];
  function collect(a: unknown[]): void {
    if (typeof (a as number[])[0] === "number") { pts.push(a as [number, number]); return; }
    (a as unknown[][]).forEach(collect);
  }
  if (geom.type === "Polygon") collect(geom.coordinates as unknown[]);
  else if (geom.type === "MultiPolygon") (geom.coordinates as unknown[][]).forEach(p => collect(p as unknown[]));
  return [
    Math.min(...pts.map(c => c[0])),
    Math.min(...pts.map(c => c[1])),
    Math.max(...pts.map(c => c[0])),
    Math.max(...pts.map(c => c[1])),
  ];
}

/** Bbox-center label point for a feature — one label per feature regardless of
 *  Polygon vs MultiPolygon structure. Good enough at this zoom. */
function bboxCenter(geom: GeoJSON.Geometry): [number, number] {
  const [w, s, e, n] = geomBbox(geom);
  return [(w + e) / 2, (s + n) / 2];
}

// Explicit name → colour mapping. Lock-step with CYBERPUNK_PALETTE order so
// the legend dots in the side panel match the map polygons. All 14 areas are
// listed (NSW + algorithmic) so the same expression works for any source.
// v14.1 — North/South/West shifted to more distinct, higher-pop colours
// per Director feedback (was indigo cluster, now spreads to purple/magenta/pink).
export const AREA_COLOR_BY_NAME: Record<string, string> = {
  "City":             "#00ffff",
  "Eastern Suburbs":  "#00e5ff",
  "Inner Inner West": "#00b8d4",
  "Inner North":      "#29b6f6",
  "Inner South":      "#2196f3",
  "Inner West":       "#3f51b5",
  "North":            "#7e57c2",
  "South":            "#d500f9",
  "West":             "#ff4081",
  "Newcastle":        "#e040fb",
  "Wollongong":       "#9c27b0",
  "North North":      "#5c6bc0",
  "Queensland":       "#f50057",
  "Tasmania":         "#ff1744",
};

// Suburb paint expressions — swapped between area and suburb-focused modes
// v12: bumped fills so polygons read as solid swatches at area level (per
// Director: previously rendering as faint dashed lines only).
const SUBURB_FILL_AREA_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "hover"], false], 0.55, 0.25,
];
const SUBURB_FILL_SUBURB_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "selected"], false], 0.45, 0.08,
];
const SUBURB_LINE_AREA_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "hover"], false], 2.6, 1.8,
];
const SUBURB_LINE_SUBURB_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "selected"], false], 2.4, 1.0,
];
const SUBURB_LINE_OPACITY_SUBURB_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "selected"], false], 0.95, 0.4,
];

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Small helper: turn "#rrggbb" → "rgba(r,g,b,a)" for inline shadows.
function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Component ────────────────────────────────────────────────────────────────

export const MapboxScene = forwardRef<MapboxSceneHandle, Props>(
  function MapboxScene({ onAreaClick, onSuburbClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    // v14.1 — custom cursor-following tooltip (replaced mapboxgl.Popup so we
    // can do per-tile coloured borders + shadows. Mapbox Popup CSS is global,
    // a vanilla DOM node lets us inline the area's palette colour cleanly.)
    const tooltipRef = useRef<HTMLDivElement | null>(null);
    const levelRef = useRef<"state" | "area" | "suburb">("state");
    const activeAreaNameRef = useRef<string | null>(null);
    const activeSuburbSlugRef = useRef<string | null>(null);
    const areaCountsRef = useRef<Record<string, number>>({});
    const areaColorMapRef = useRef<Record<string, string>>({});
    // Store the loaded GeoJSON in refs so navigation doesn't depend on
    // Mapbox's undocumented `_data` internal — that property is unreliable
    // across versions and was causing flyTo to compute wrong bounds.
    const areasFCRef = useRef<GeoJSON.FeatureCollection | null>(null);
    const suburbsFCRef = useRef<GeoJSON.FeatureCollection | null>(null);

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const style = process.env.NEXT_PUBLIC_MAPBOX_STYLE;
      if (!token || !style) { console.error("[MapboxScene] missing env vars"); return; }

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style,
        attributionControl: false,
        logoPosition: "bottom-left",
      });

      map.on("error", e => console.error("[MapboxScene]", e.error));
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

      // ── v14.1 cursor-following tooltip (vanilla DOM, append once) ──
      // Position is updated to (e.point.x + 14, e.point.y - 12) on every
      // mousemove over an area tile. Border + glow shadow take the area's
      // palette colour. Hidden by default; shown only on state-level hover.
      const tooltip = document.createElement("div");
      tooltip.style.cssText = [
        "position:absolute",
        "z-index:1000",
        "pointer-events:none",
        "background:rgba(10,10,18,0.96)",
        "border:1px solid #00e5ff",
        "border-radius:8px",
        "padding:8px 14px",
        "color:#fff",
        "font-size:12px",
        "font-weight:700",
        "letter-spacing:0.5px",
        "white-space:nowrap",
        "backdrop-filter:blur(8px)",
        "box-shadow:0 0 20px rgba(0,229,255,0.4)",
        "display:none",
        "left:0",
        "top:0",
        "font-family:var(--font-geist-sans),system-ui,sans-serif",
      ].join(";");
      containerRef.current.appendChild(tooltip);
      tooltipRef.current = tooltip;

      map.on("load", () => {
        console.log("[DIAG]", performance.now().toFixed(1), "map.on(load) fired");

        // ── v14 SMOKING-GUN FIX ─────────────────────────────────────────────
        // The saved Mapbox Studio style ships with `projection: globe` and a
        // London-Greenwich `center`. Globe projection rendered fill polygons
        // weirdly (dark blobs) and the saved center hijacked failed camera
        // fallbacks. Force mercator unconditionally — this is the single
        // change that unblocks every prior rendering symptom.
        map.setProjection("mercator");
        console.log("[v14] forced projection → mercator. Now reads:",
          map.getProjection()?.name);

        // CHECK 3: any saved center/zoom in the Mapbox style itself?
        const styleSpec = map.getStyle();
        console.log("[DIAG] Style center:", styleSpec?.center);
        console.log("[DIAG] Style zoom:", styleSpec?.zoom);
        console.log("[DIAG] Style bearing/pitch:", styleSpec?.bearing, styleSpec?.pitch);
        console.log("[DIAG] Style projection:", (styleSpec as unknown as { projection?: unknown })?.projection);
        console.log("[DIAG] Map current center BEFORE fit:", map.getCenter().toArray());
        console.log("[DIAG] Map current zoom BEFORE fit:", map.getZoom());

        Promise.all([
          fetch("/areas_smooth.geojson").then(r => r.json()),
          fetch("/suburbs.geojson").then(r => r.json()),
          fetch("/nsw_outline.geojson").then(r => r.json()),
        ]).then(([areasData, suburbsData, nswData]: [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection, GeoJSON.FeatureCollection]) => {

          // NSW-only area names, sorted
          const nswAreaNames = areasData.features
            .map(f => (f.properties as { name: string }).name)
            .filter(n => !EXCLUDED_AREA_NAMES.includes(n))
            .sort();

          const colorMap: Record<string, string> = {};
          nswAreaNames.forEach((n, i) => { colorMap[n] = CYBERPUNK_PALETTE[i % CYBERPUNK_PALETTE.length]; });
          areaColorMapRef.current = colorMap;

          // Suburb counts per NSW area
          const counts: Record<string, number> = {};
          (suburbsData.features as GeoJSON.Feature[]).forEach(f => {
            const p = f.properties as { area: string; state: string };
            if (p.state === "NSW") counts[p.area] = (counts[p.area] || 0) + 1;
          });
          areaCountsRef.current = counts;

          // ── Pre-bake colour + nsw flag into each feature's properties ──
          // Underscore-prefixed property names DO get accessed correctly by
          // Mapbox `["get", "_color"]`, but multiple Mapbox versions treat
          // certain underscore properties specially. Use plain names to be
          // unambiguously safe: tileColor (string) + tileNsw (bool).
          const enrichedAreas: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: areasData.features.map(f => {
              const p = (f.properties ?? {}) as { name: string; origin?: string };
              return {
                ...f,
                properties: {
                  ...p,
                  tileColor: AREA_COLOR_BY_NAME[p.name] ?? "#888888",
                  tileNsw: !EXCLUDED_AREA_NAMES.includes(p.name),
                },
              };
            }),
          };
          const enrichedSuburbs: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: suburbsData.features.map(f => {
              const p = (f.properties ?? {}) as { area: string; state: string };
              return {
                ...f,
                properties: {
                  ...p,
                  tileColor: AREA_COLOR_BY_NAME[p.area] ?? "#888888",
                },
              };
            }),
          };

          areasFCRef.current = enrichedAreas;
          suburbsFCRef.current = enrichedSuburbs;
          console.log("[DIAG]", performance.now().toFixed(1), "data fetch resolved, refs populated");
          console.log("[DIAG] areasFCRef.current.features.length:", areasFCRef.current.features.length);
          console.log("[DIAG] suburbsFCRef.current.features.length:", suburbsFCRef.current.features.length);

          const nswCount = enrichedAreas.features.filter(f =>
            (f.properties as { tileNsw: boolean }).tileNsw
          ).length;
          console.log(`[MapboxScene] enriched features: ${enrichedAreas.features.length} areas (${nswCount} NSW), ${enrichedSuburbs.features.length} suburbs`);

          // ── Pre-compute one centroid per NSW area for the active-area label
          const areaCentroids: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: enrichedAreas.features
              .filter(f => (f.properties as { tileNsw: boolean }).tileNsw)
              .map(f => ({
                type: "Feature",
                geometry: { type: "Point", coordinates: bboxCenter(f.geometry as GeoJSON.Geometry) },
                properties: f.properties,
              })),
          };

          console.log(`[MapboxScene] loaded ✓ (NSW areas: ${nswAreaNames.length}, suburbs: ${suburbsData.features.length})`);

          // ── v14 — FULL STATE-LEVEL STACK RESTORED (post projection fix) ──
          // 1. State-level dim overlay — basemap visible as faint silhouette
          map.addLayer({
            id: "state-dim-overlay",
            type: "background",
            paint: { "background-color": PAGE_BG, "background-opacity": STATE_DIM_OPACITY },
          });

          // 2. NSW outline (faint shape under tiles)
          map.addSource("nsw", { type: "geojson", data: nswData });
          map.addLayer({
            id: "nsw-fill",
            type: "fill",
            source: "nsw",
            paint: { "fill-color": "#0d0d18", "fill-opacity": 0.4 },
          });
          map.addLayer({
            id: "nsw-line",
            type: "line",
            source: "nsw",
            paint: { "line-color": "#2a2a3e", "line-width": 1.5, "line-opacity": 0.9 },
          });

          // 3. Areas: 3-layer cyberpunk stack with LIGHT TINT (not solid plate)
          const colorPairs = Object.entries(AREA_COLOR_BY_NAME)
            .flatMap(([n, c]) => [n, c]);
          const tileColorExpr: mapboxgl.Expression =
            ["match", ["get", "name"], ...colorPairs, "#888888"] as mapboxgl.Expression;
          const suburbColorExpr: mapboxgl.Expression =
            ["match", ["get", "area"], ...colorPairs, "#888888"] as mapboxgl.Expression;
          const NSW_FILTER: mapboxgl.FilterSpecification = [
            "all",
            ["!=", ["get", "name"], "Newcastle"],
            ["!=", ["get", "name"], "Wollongong"],
            ["!=", ["get", "name"], "North North"],
            ["!=", ["get", "name"], "Queensland"],
            ["!=", ["get", "name"], "Tasmania"],
          ];

          map.addSource("areas", { type: "geojson", data: areasData, promoteId: "name" });

          // 3a. Glow halo (sits BELOW fill — bleeds outside edges)
          // v14.1 — Director spec: blur 6, width 14, opacity 0.5 (boosted on hover)
          map.addLayer({
            id: "areas-glow",
            type: "line",
            source: "areas",
            filter: NSW_FILTER,
            paint: {
              "line-color": tileColorExpr,
              "line-blur": ["case", ["boolean", ["feature-state", "hover"], false], 12, 6],
              "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 22, 14],
              "line-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.9, 0.5],
            },
          });
          // 3b. LIGHT TINT fill (no solid plate — basemap silhouette shows through)
          // v14.1 — opacity 0.30 default / 0.50 hover per Director spec
          map.addLayer({
            id: "areas-fill",
            type: "fill",
            source: "areas",
            filter: NSW_FILTER,
            paint: {
              "fill-color": tileColorExpr,
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.50, 0.30],
            },
          });
          // 3c. Bright outline — width 4 default / 6 hover
          map.addLayer({
            id: "areas-outline",
            type: "line",
            source: "areas",
            filter: NSW_FILTER,
            paint: {
              "line-color": tileColorExpr,
              "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 6, 4],
              "line-opacity": 1,
            },
          });
          // 3d. Dashed outline (drilled-in mode, hidden by default)
          map.addLayer({
            id: "areas-outline-active",
            type: "line",
            source: "areas",
            layout: { visibility: "none" },
            paint: {
              "line-color": tileColorExpr,
              "line-width": 2,
              "line-opacity": 0.7,
              "line-dasharray": [2, 2],
            },
          });
          // 3e. Active-area label (one per area at centroid; visible only when drilled in)
          map.addSource("areas-centroids", { type: "geojson", data: areaCentroids });
          map.addLayer({
            id: "areas-label-active",
            type: "symbol",
            source: "areas-centroids",
            layout: {
              visibility: "none",
              "text-field": ["upcase", ["get", "name"]],
              "text-size": 18,
              "text-font": ["DIN Offc Pro Bold", "Arial Unicode MS Bold"],
              "text-letter-spacing": 0.15,
              "text-allow-overlap": true,
              "text-ignore-placement": true,
            },
            paint: {
              "text-color": tileColorExpr,
              "text-halo-color": "#000000",
              "text-halo-width": 2,
              "text-opacity": 0.95,
            },
          });

          console.log("[v14] state-level stack added. Layers:",
            ["state-dim-overlay", "nsw-fill", "nsw-line",
             "areas-glow", "areas-fill", "areas-outline",
             "areas-outline-active", "areas-label-active"]
              .map(id => ({ id, exists: !!map.getLayer(id) })));
          setTimeout(() => {
            const rendered = map.queryRenderedFeatures(undefined, { layers: ["areas-fill"] });
            console.log(`[v14] queryRenderedFeatures(areas-fill) → ${rendered.length} feature(s)`);
          }, 1500);

          // ── 4. Suburbs ──
          // Recompute centroids from enriched data so labels carry _color too
          const enrichedSuburbCentroids: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: enrichedSuburbs.features.map(f => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: bboxCenter(f.geometry as GeoJSON.Geometry) },
              properties: f.properties,
            })),
          };
          map.addSource("suburbs", { type: "geojson", data: enrichedSuburbs, promoteId: "slug" });
          map.addSource("suburbs-centroids", { type: "geojson", data: enrichedSuburbCentroids });
          map.addLayer({
            id: "suburbs-fill",
            type: "fill",
            source: "suburbs",
            layout: { visibility: "none" },
            paint: { "fill-color": suburbColorExpr, "fill-opacity": SUBURB_FILL_AREA_MODE },
          });
          map.addLayer({
            id: "suburbs-outline",
            type: "line",
            source: "suburbs",
            layout: { visibility: "none" },
            paint: { "line-color": suburbColorExpr, "line-width": SUBURB_LINE_AREA_MODE, "line-opacity": 0.9 },
          });
          // One label per suburb feature, positioned at its bbox centroid
          map.addLayer({
            id: "suburbs-label",
            type: "symbol",
            source: "suburbs-centroids",
            layout: {
              visibility: "none",
              "text-field": ["get", "name"],
              "text-size": 11,
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
              "text-anchor": "center",
              "text-allow-overlap": false,
              "text-ignore-placement": false,
              "symbol-placement": "point",
            },
            paint: {
              "text-color": suburbColorExpr,
              "text-halo-color": "#000000",
              "text-halo-width": 1.6,
            },
          });

          // ── Hover: areas (state level only) — feature-state + cursor banner ──
          let hoveredAreaId: string | null = null;
          map.on("mousemove", "areas-fill", e => {
            if (levelRef.current !== "state") return;
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const id = String(e.features[0].id ?? "");
            if (id && id !== hoveredAreaId) {
              if (hoveredAreaId) map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
              hoveredAreaId = id;
              map.setFeatureState({ source: "areas", id }, { hover: true });
            }
            const props = e.features[0].properties as { name: string };
            const color = AREA_COLOR_BY_NAME[props.name] ?? areaColorMapRef.current[props.name] ?? "#00e5ff";
            const count = areaCountsRef.current[props.name] ?? 0;
            // Per-tile coloured border + glow shadow on the cursor banner
            tooltip.style.border = `1px solid ${color}`;
            tooltip.style.boxShadow = `0 0 20px ${hexToRgba(color, 0.4)}`;
            tooltip.innerHTML = `
              <div style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.5px;text-shadow:0 0 6px ${color}">${props.name}</div>
              <div style="color:#7a8aae;font-size:10px;font-weight:500;letter-spacing:0.4px;margin-top:2px">${count} suburbs · click to drill in</div>
            `;
            tooltip.style.left = `${e.point.x + 14}px`;
            tooltip.style.top = `${e.point.y - 12}px`;
            tooltip.style.display = "block";
          });
          map.on("mouseleave", "areas-fill", () => {
            map.getCanvas().style.cursor = "";
            if (hoveredAreaId) map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
            hoveredAreaId = null;
            tooltip.style.display = "none";
          });

          // ── Hover: suburbs ──
          let hoveredSuburbId: string | null = null;
          map.on("mousemove", "suburbs-fill", e => {
            if (levelRef.current === "state") return;
            if (!e.features?.length) return;
            map.getCanvas().style.cursor = "pointer";
            const id = String(e.features[0].id ?? "");
            if (id && id !== hoveredSuburbId) {
              if (hoveredSuburbId) map.setFeatureState({ source: "suburbs", id: hoveredSuburbId }, { hover: false });
              hoveredSuburbId = id;
              map.setFeatureState({ source: "suburbs", id }, { hover: true });
            }
          });
          map.on("mouseleave", "suburbs-fill", () => {
            map.getCanvas().style.cursor = "";
            if (hoveredSuburbId) map.setFeatureState({ source: "suburbs", id: hoveredSuburbId }, { hover: false });
            hoveredSuburbId = null;
          });

          // ── Click handlers ──
          map.on("click", "areas-fill", e => {
            if (levelRef.current !== "state") return;
            const f = e.features?.[0];
            if (!f) return;
            const { name, slug } = f.properties as { name: string; slug: string };
            if (tooltipRef.current) tooltipRef.current.style.display = "none";
            onAreaClick({ name, slug });
          });
          map.on("click", "suburbs-fill", e => {
            if (levelRef.current === "state") return;
            const f = e.features?.[0];
            if (!f) return;
            const { name, slug, postcode, area, state } = f.properties as Suburb;
            onSuburbClick({ name, slug, postcode, area, state });
          });

          // Initial camera (snap to NSW state bounds, pitch flat)
          map.fitBounds(NSW_STATE_BBOX, { padding: 10, duration: 0, essential: true });
          map.setPitch(FLAT_PITCH);
          map.setBearing(0);
        }).catch(err => console.error("[MapboxScene] GeoJSON error:", err));
      });

      mapRef.current = map;
      return () => {
        map.remove();
        mapRef.current = null;
        levelRef.current = "state";
        activeAreaNameRef.current = null;
        activeSuburbSlugRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Layer toggles ──────────────────────────────────────────────────────
    // v13: helpers are safe — if a layer was stripped, the call is a no-op.
    // Drill handlers continue to call them; they just have no effect for
    // stripped layers. (Will be re-instated as we rebuild state-level.)

    function setLayerVis(map: mapboxgl.Map, id: string, visible: boolean) {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
    function setOverlayVisible(map: mapboxgl.Map, visible: boolean) {
      setLayerVis(map, "state-dim-overlay", visible);
    }
    function setActiveAreaLabel(map: mapboxgl.Map, areaName: string | null) {
      if (!map.getLayer("areas-label-active")) return;
      if (!areaName) { setLayerVis(map, "areas-label-active", false); return; }
      map.setFilter("areas-label-active", ["==", ["get", "name"], areaName]);
      setLayerVis(map, "areas-label-active", true);
    }
    function setNswVisible(map: mapboxgl.Map, visible: boolean) {
      ["nsw-fill", "nsw-line"].forEach(id => setLayerVis(map, id, visible));
    }
    function setAreasVisible(map: mapboxgl.Map, visible: boolean) {
      ["areas-glow", "areas-fill", "areas-outline"].forEach(id =>
        setLayerVis(map, id, visible)
      );
    }
    function setSuburbsVisible(map: mapboxgl.Map, visible: boolean) {
      ["suburbs-fill", "suburbs-outline", "suburbs-label"].forEach(id =>
        setLayerVis(map, id, visible)
      );
    }
    function setActiveAreaDashed(map: mapboxgl.Map, areaName: string | null) {
      if (!map.getLayer("areas-outline-active")) return;
      if (!areaName) { setLayerVis(map, "areas-outline-active", false); return; }
      map.setFilter("areas-outline-active", ["==", ["get", "name"], areaName]);
      setLayerVis(map, "areas-outline-active", true);
    }
    function setSuburbFilter(map: mapboxgl.Map, predicate: mapboxgl.FilterSpecification) {
      ["suburbs-fill", "suburbs-outline", "suburbs-label"].forEach(id => map.setFilter(id, predicate));
    }
    function setSuburbsPaintMode(map: mapboxgl.Map, mode: "area" | "suburb") {
      if (mode === "area") {
        map.setPaintProperty("suburbs-fill", "fill-opacity", SUBURB_FILL_AREA_MODE);
        map.setPaintProperty("suburbs-outline", "line-width", SUBURB_LINE_AREA_MODE);
        map.setPaintProperty("suburbs-outline", "line-opacity", 0.9);
      } else {
        map.setPaintProperty("suburbs-fill", "fill-opacity", SUBURB_FILL_SUBURB_MODE);
        map.setPaintProperty("suburbs-outline", "line-width", SUBURB_LINE_SUBURB_MODE);
        map.setPaintProperty("suburbs-outline", "line-opacity", SUBURB_LINE_OPACITY_SUBURB_MODE);
      }
    }
    function clearSuburbSelection(map: mapboxgl.Map) {
      const slug = activeSuburbSlugRef.current;
      if (slug) map.setFeatureState({ source: "suburbs", id: slug }, { selected: false });
      activeSuburbSlugRef.current = null;
    }

    /** cameraForBounds + flyTo so pitch is honoured (fitBounds may ignore pitch
     *  on some Mapbox versions). Bbox passed in `[[sw], [ne]]` form for
     *  unambiguous interpretation across Mapbox versions. */
    function flyToBbox(
      map: mapboxgl.Map,
      bbox: [number, number, number, number],
      opts: { padding: number; pitch: number; duration: number }
    ) {
      const [w, s, e, n] = bbox;
      // Sanity check: Sydney metro is roughly lng 150-152, lat -34 to -33.
      // If we get something wildly off, log it loudly so the bug is obvious.
      if (w < -180 || e > 180 || s < -90 || n > 90 || w > e || s > n) {
        console.error("[MapboxScene] flyToBbox: invalid bbox", bbox);
        return;
      }
      const bounds: mapboxgl.LngLatBoundsLike = [[w, s], [e, n]];
      const cam = map.cameraForBounds(bounds, {
        padding: opts.padding, pitch: opts.pitch, bearing: 0,
      });
      if (!cam) {
        console.warn("[MapboxScene] cameraForBounds returned null, fallback to fitBounds");
        map.fitBounds(bounds, { padding: opts.padding, duration: opts.duration, essential: true, pitch: opts.pitch, bearing: 0 });
        return;
      }
      map.flyTo({
        center: cam.center,
        zoom: cam.zoom,
        pitch: opts.pitch,
        bearing: 0,
        duration: opts.duration,
        essential: true,
        easing: easeInOutCubic,
      });
    }

    /** Belt-and-braces pitch enforcement: try at moveend, idle, and after a
     *  fixed delay. Prevents Mapbox from snapping back to flat. */
    function enforcePitch(map: mapboxgl.Map, pitch: number) {
      const apply = () => { if (Math.abs(map.getPitch() - pitch) > 0.5) map.setPitch(pitch); };
      map.once("moveend", apply);
      map.once("idle", apply);
      setTimeout(apply, 1400);
    }

    useImperativeHandle(ref, () => ({
      getAreaCounts: () => ({ ...areaCountsRef.current }),

      goToNswState() {
        const map = mapRef.current;
        if (!map) return;
        levelRef.current = "state";
        activeAreaNameRef.current = null;
        clearSuburbSelection(map);
        // Clear stale hover feature-state on areas
        const fc = areasFCRef.current;
        if (fc && map.getSource("areas")) {
          fc.features.forEach(f => {
            const name = (f.properties as { name: string }).name;
            map.setFeatureState({ source: "areas", id: name }, { hover: false });
          });
        }
        if (tooltipRef.current) tooltipRef.current.style.display = "none";

        flyToBbox(map, NSW_STATE_BBOX as [number, number, number, number], {
          padding: 10, pitch: FLAT_PITCH, duration: 1400,
        });

        map.once("moveend", () => {
          setSuburbsVisible(map, false);
          setActiveAreaDashed(map, null);
          setActiveAreaLabel(map, null);
          setOverlayVisible(map, true);   // dim basemap
          setNswVisible(map, true);
          setAreasVisible(map, true);
        });
      },

      drillToArea(area) {
        // CHECK 1: ref freshness at click time
        console.log("[DIAG]", performance.now().toFixed(1), "drillToArea called:", area.name);
        console.log("[DIAG] areasFCRef.current is null?", areasFCRef.current === null);
        console.log("[DIAG] areasFCRef.current.features.length:", areasFCRef.current?.features?.length);
        const matched = areasFCRef.current?.features?.find(
          f => (f.properties as { name: string }).name === area.name
        );
        console.log("[DIAG] Lookup match name:", (matched?.properties as { name?: string } | undefined)?.name);
        console.log("[DIAG] Lookup match geom type:", matched?.geometry?.type);
        console.log("[DIAG] Lookup match first coord:",
          matched ? (matched.geometry.type === "Polygon"
            ? (matched.geometry.coordinates as number[][][])[0][0]
            : (matched.geometry as GeoJSON.MultiPolygon).coordinates[0][0][0]) : null
        );

        const map = mapRef.current;
        if (!map) return;
        const fc = areasFCRef.current;
        const feature = fc?.features.find(
          f => (f.properties as { name: string }).name === area.name
        );
        if (!feature) {
          console.warn("[MapboxScene] area not found:", area.name, "loaded?", !!fc);
          return;
        }

        levelRef.current = "area";
        activeAreaNameRef.current = area.name;
        clearSuburbSelection(map);
        if (tooltipRef.current) tooltipRef.current.style.display = "none";

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        console.log(`[DIAG] computed bbox for ${area.name}:`, bbox);
        console.log("[DIAG] map center BEFORE flyTo:", map.getCenter().toArray());
        flyToBbox(map, bbox, { padding: 60, pitch: FLAT_PITCH, duration: 1400 });
        console.log("[DIAG] map center AFTER flyTo (instant, pre-animation):", map.getCenter().toArray());

        map.once("moveend", () => {
          setOverlayVisible(map, false);  // reveal basemap
          setNswVisible(map, false);
          setAreasVisible(map, false);
          setActiveAreaDashed(map, area.name);
          setActiveAreaLabel(map, area.name);
          setSuburbFilter(map, ["==", ["get", "area"], area.name]);
          setSuburbsPaintMode(map, "area");
          setSuburbsVisible(map, true);
        });
      },

      focusSuburb(suburb) {
        const map = mapRef.current;
        if (!map) return;
        const fc = suburbsFCRef.current;
        const feature = fc?.features.find(
          f => (f.properties as { slug: string }).slug === suburb.slug
        );
        if (!feature) {
          console.warn("[MapboxScene] suburb not found:", suburb.slug, "loaded?", !!fc);
          return;
        }

        levelRef.current = "suburb";
        activeAreaNameRef.current = suburb.area;
        clearSuburbSelection(map);
        activeSuburbSlugRef.current = suburb.slug;
        map.setFeatureState({ source: "suburbs", id: suburb.slug }, { selected: true });

        if (suburb.state === "NSW") {
          setSuburbFilter(map, ["==", ["get", "area"], suburb.area]);
          setActiveAreaDashed(map, suburb.area);
          setActiveAreaLabel(map, suburb.area);
        }
        setSuburbsPaintMode(map, "suburb");

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        console.log(`[MapboxScene] focusSuburb ${suburb.name} → bbox:`, bbox);
        flyToBbox(map, bbox, { padding: 120, pitch: SUBURB_PITCH, duration: 1200 });
        enforcePitch(map, SUBURB_PITCH);
      },

      upToArea(area) {
        const map = mapRef.current;
        if (!map) return;
        const fc = areasFCRef.current;
        const feature = fc?.features.find(
          f => (f.properties as { name: string }).name === area.name
        );
        if (!feature) {
          console.warn("[MapboxScene] upToArea: area not found:", area.name);
          return;
        }

        levelRef.current = "area";
        clearSuburbSelection(map);
        setSuburbsPaintMode(map, "area");

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        console.log(`[MapboxScene] upToArea ${area.name} → bbox:`, bbox);
        flyToBbox(map, bbox, { padding: 60, pitch: FLAT_PITCH, duration: 1200 });
      },

      // QLD / TAS — single suburb showcase, basemap visible, no NSW chrome
      showSingleStateSuburb(suburb) {
        const map = mapRef.current;
        if (!map) return;
        const fc = suburbsFCRef.current;
        const feature = fc?.features.find(
          f => (f.properties as { slug: string }).slug === suburb.slug
        );
        if (!feature) {
          console.warn("[MapboxScene] showcase suburb not found:", suburb.slug, "loaded?", !!fc);
          return;
        }

        levelRef.current = "suburb";
        activeAreaNameRef.current = suburb.area;
        clearSuburbSelection(map);
        activeSuburbSlugRef.current = suburb.slug;
        map.setFeatureState({ source: "suburbs", id: suburb.slug }, { selected: true });
        if (tooltipRef.current) tooltipRef.current.style.display = "none";

        // Hide all NSW chrome, show basemap (overlay off)
        setOverlayVisible(map, false);
        setNswVisible(map, false);
        setAreasVisible(map, false);
        setActiveAreaDashed(map, null);
        setActiveAreaLabel(map, null);

        // Filter suburbs to this one slug, then make it visible
        setSuburbFilter(map, ["==", ["get", "slug"], suburb.slug]);
        setSuburbsPaintMode(map, "suburb");
        setSuburbsVisible(map, true);

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        flyToBbox(map, bbox, { padding: 120, pitch: SUBURB_PITCH, duration: 1400 });
        enforcePitch(map, SUBURB_PITCH);
      },
    }));

    return <div ref={containerRef} className="absolute inset-0 bg-[#05050a]" />;
  }
);
