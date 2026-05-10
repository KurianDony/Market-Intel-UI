"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { AREA_COLOR_BY_NAME } from "./areaPalette";

// ── Stable baseline ──────────────────────────────────────────────────────────
// Area colours: `components/motion/areaPalette.ts` — single source of truth.
//
// See docs/MOTION_PROTOTYPE_HANDOFF.md for rendering session history.

// ── Frames ───────────────────────────────────────────────────────────────────

export const NSW_STATE_BBOX: mapboxgl.LngLatBoundsLike = [150.50, -34.55, 151.95, -32.80];

const SUBURB_PITCH = 35;
const FLAT_PITCH = 0;

// Suburb paint expressions — swapped between area and suburb-focused modes.
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

// Bbox-center point for a feature — one label per feature regardless of
// Polygon vs MultiPolygon structure. Good enough at this zoom.
function bboxCenter(geom: GeoJSON.Geometry): [number, number] {
  const [w, s, e, n] = geomBbox(geom);
  return [(w + e) / 2, (s + n) / 2];
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  if (Number.isNaN(r + g + b)) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

// ── Component ────────────────────────────────────────────────────────────────

export const MapboxScene = forwardRef<MapboxSceneHandle, Props>(
  function MapboxScene({ onAreaClick, onSuburbClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [areaHoverTooltip, setAreaHoverTooltip] = useState<{
      pageX: number;
      pageY: number;
      name: string;
      color: string;
      count: number;
    } | null>(null);
    const dismissAreaHoverTooltip = useRef(() => {});
    dismissAreaHoverTooltip.current = () => setAreaHoverTooltip(null);

    const mapRef = useRef<mapboxgl.Map | null>(null);
    const levelRef = useRef<"state" | "area" | "suburb">("state");
    const activeAreaNameRef = useRef<string | null>(null);
    const activeSuburbSlugRef = useRef<string | null>(null);
    const areaCountsRef = useRef<Record<string, number>>({});
    // The loaded GeoJSON lives here so navigation doesn't depend on
    // Mapbox's undocumented `_data` internal — that property is unreliable
    // across versions and was the cause of the "Eastern Suburbs flies to
    // London" bug earlier in the session.
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

      map.on("load", () => {
        // KEEP THIS — the saved Mapbox Studio style ships with
        // `projection: globe` and a London-Greenwich `center`. Globe
        // projection breaks fill polygon paint, and the saved center
        // hijacks failed camera fallbacks. Force mercator unconditionally.
        map.setProjection("mercator");

        Promise.all([
          fetch("/areas_smooth.geojson").then(r => r.json()),
          fetch("/suburbs.geojson").then(r => r.json()),
        ]).then(([areasData, suburbsData]: [GeoJSON.FeatureCollection, GeoJSON.FeatureCollection]) => {
          areasFCRef.current = areasData;
          suburbsFCRef.current = suburbsData;

          // Suburb counts per NSW area — exposed via getAreaCounts()
          const counts: Record<string, number> = {};
          (suburbsData.features as GeoJSON.Feature[]).forEach(f => {
            const p = f.properties as { area: string; state: string };
            if (p.state === "NSW") counts[p.area] = (counts[p.area] || 0) + 1;
          });
          areaCountsRef.current = counts;

          // Pre-computed centroids: one label per suburb regardless of
          // Polygon vs MultiPolygon structure.
          const suburbCentroids: GeoJSON.FeatureCollection = {
            type: "FeatureCollection",
            features: suburbsData.features.map(f => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: bboxCenter(f.geometry as GeoJSON.Geometry) },
              properties: f.properties,
            })),
          };

          // Paint expression: name → palette colour. Used for fill + outline.
          const colorPairs = Object.entries(AREA_COLOR_BY_NAME).flatMap(([n, c]) => [n, c]);
          const tileColorExpr: mapboxgl.Expression =
            ["match", ["get", "name"], ...colorPairs, "#888888"] as mapboxgl.Expression;
          const suburbColorExpr: mapboxgl.Expression =
            ["match", ["get", "area"], ...colorPairs, "#888888"] as mapboxgl.Expression;

          // ── Areas: faint fill + coloured outline. No glow, no dim overlay.
          map.addSource("areas", { type: "geojson", data: areasData, promoteId: "name" });
          map.addLayer({
            id: "areas-fill",
            type: "fill",
            source: "areas",
            paint: {
              "fill-color": tileColorExpr,
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.20, 0.22],
            },
          });
          map.addLayer({
            id: "areas-outline",
            type: "line",
            source: "areas",
            paint: {
              "line-color": tileColorExpr,
              "line-width": 3,
              "line-opacity": 1.0,
            },
          });
          // Dashed outline shown only when drilled into a single area.
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

          // ── Suburbs ──
          map.addSource("suburbs", { type: "geojson", data: suburbsData, promoteId: "slug" });
          map.addSource("suburbs-centroids", { type: "geojson", data: suburbCentroids });
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

          // ── Hover: areas (state level) — feature-state + cursor banner + suburb count
          let hoveredAreaId: string | null = null;
          const countSuburbsForArea = (areaName: string) =>
            (suburbsData.features as GeoJSON.Feature[]).filter(
              sf => (sf.properties as { area: string }).area === areaName
            ).length;
          const applyAreaFillHover = (e: mapboxgl.MapLayerMouseEvent) => {
            if (levelRef.current !== "state") {
              map.getCanvas().style.cursor = "";
              setAreaHoverTooltip(null);
              return;
            }
            map.getCanvas().style.cursor = "pointer";
            if (!e.features?.length) return;
            const f = e.features[0];
            const id = String(f.id ?? "");
            if (id && id !== hoveredAreaId) {
              if (hoveredAreaId) map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
              hoveredAreaId = id;
              map.setFeatureState({ source: "areas", id }, { hover: true });
            }
            const areaName = (f.properties as { name: string }).name;
            const color = AREA_COLOR_BY_NAME[areaName] ?? "#888888";
            const oe = e.originalEvent as MouseEvent;
            setAreaHoverTooltip({
              pageX: oe.pageX + 14,
              pageY: oe.pageY - 12,
              name: areaName,
              color,
              count: countSuburbsForArea(areaName),
            });
          };
          map.on("mouseenter", "areas-fill", applyAreaFillHover);
          map.on("mousemove", "areas-fill", applyAreaFillHover);
          map.on("mouseleave", "areas-fill", () => {
            map.getCanvas().style.cursor = "";
            if (hoveredAreaId) map.setFeatureState({ source: "areas", id: hoveredAreaId }, { hover: false });
            hoveredAreaId = null;
            setAreaHoverTooltip(null);
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
            onAreaClick({ name, slug });
          });
          map.on("click", "suburbs-fill", e => {
            if (levelRef.current === "state") return;
            const f = e.features?.[0];
            if (!f) return;
            const { name, slug, postcode, area, state } = f.properties as Suburb;
            onSuburbClick({ name, slug, postcode, area, state });
          });

          // Initial camera — Sydney metro framing, flat top-down.
          map.fitBounds(NSW_STATE_BBOX, { padding: 10, duration: 0, essential: true });
          map.setPitch(FLAT_PITCH);
          map.setBearing(0);
        }).catch(err => console.error("[MapboxScene] GeoJSON error:", err));
      });

      mapRef.current = map;
      return () => {
        dismissAreaHoverTooltip.current();
        map.remove();
        mapRef.current = null;
        levelRef.current = "state";
        activeAreaNameRef.current = null;
        activeSuburbSlugRef.current = null;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Layer toggle helpers ────────────────────────────────────────────────

    function setLayerVis(map: mapboxgl.Map, id: string, visible: boolean) {
      if (!map.getLayer(id)) return;
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
    }
    function setAreasVisible(map: mapboxgl.Map, visible: boolean) {
      ["areas-fill", "areas-outline"].forEach(id => setLayerVis(map, id, visible));
    }
    function setSuburbsVisible(map: mapboxgl.Map, visible: boolean) {
      ["suburbs-fill", "suburbs-outline", "suburbs-label"].forEach(id => setLayerVis(map, id, visible));
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

    // cameraForBounds + flyTo so pitch is honoured (fitBounds may ignore pitch
    // on some Mapbox versions). Bbox passed in `[[sw], [ne]]` form for
    // unambiguous interpretation across Mapbox versions.
    function flyToBbox(
      map: mapboxgl.Map,
      bbox: [number, number, number, number],
      opts: { padding: number; pitch: number; duration: number }
    ) {
      const [w, s, e, n] = bbox;
      if (w < -180 || e > 180 || s < -90 || n > 90 || w > e || s > n) {
        console.error("[MapboxScene] flyToBbox: invalid bbox", bbox);
        return;
      }
      const bounds: mapboxgl.LngLatBoundsLike = [[w, s], [e, n]];
      const cam = map.cameraForBounds(bounds, {
        padding: opts.padding, pitch: opts.pitch, bearing: 0,
      });
      if (!cam) {
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

    // Belt-and-braces pitch enforcement: try at moveend, idle, and after a
    // fixed delay. Prevents Mapbox from snapping back to flat at suburb level.
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
        dismissAreaHoverTooltip.current();
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

        flyToBbox(map, NSW_STATE_BBOX as [number, number, number, number], {
          padding: 10, pitch: FLAT_PITCH, duration: 1400,
        });

        map.once("moveend", () => {
          setSuburbsVisible(map, false);
          setActiveAreaDashed(map, null);
          setAreasVisible(map, true);
        });
      },

      drillToArea(area) {
        const map = mapRef.current;
        if (!map) return;
        dismissAreaHoverTooltip.current();
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

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        flyToBbox(map, bbox, { padding: 60, pitch: FLAT_PITCH, duration: 1400 });

        map.once("moveend", () => {
          setAreasVisible(map, false);
          setActiveAreaDashed(map, area.name);
          setSuburbFilter(map, ["==", ["get", "area"], area.name]);
          setSuburbsPaintMode(map, "area");
          setSuburbsVisible(map, true);
        });
      },

      focusSuburb(suburb) {
        const map = mapRef.current;
        if (!map) return;
        dismissAreaHoverTooltip.current();
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
        }
        setSuburbsPaintMode(map, "suburb");

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        flyToBbox(map, bbox, { padding: 120, pitch: SUBURB_PITCH, duration: 1200 });
        enforcePitch(map, SUBURB_PITCH);
      },

      upToArea(area) {
        const map = mapRef.current;
        if (!map) return;
        dismissAreaHoverTooltip.current();
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
        flyToBbox(map, bbox, { padding: 60, pitch: FLAT_PITCH, duration: 1200 });
      },

      // QLD / TAS — single suburb showcase, basemap visible, no NSW chrome.
      showSingleStateSuburb(suburb) {
        const map = mapRef.current;
        if (!map) return;
        dismissAreaHoverTooltip.current();
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

        setAreasVisible(map, false);
        setActiveAreaDashed(map, null);

        setSuburbFilter(map, ["==", ["get", "slug"], suburb.slug]);
        setSuburbsPaintMode(map, "suburb");
        setSuburbsVisible(map, true);

        const bbox = geomBbox(feature.geometry as GeoJSON.Geometry);
        flyToBbox(map, bbox, { padding: 120, pitch: SUBURB_PITCH, duration: 1400 });
        enforcePitch(map, SUBURB_PITCH);
      },
    }));

    return (
      <>
        <div ref={containerRef} className="absolute inset-0" />
        {areaHoverTooltip != null ? (
          <div
            className="font-sans"
            style={{
              position: "fixed",
              left: areaHoverTooltip.pageX,
              top: areaHoverTooltip.pageY,
              zIndex: 1500,
              pointerEvents: "none",
              background: "rgba(10, 10, 18, 0.96)",
              border: `1px solid ${areaHoverTooltip.color}`,
              borderRadius: 8,
              padding: "8px 14px",
              boxShadow: `0 0 20px ${hexToRgba(areaHoverTooltip.color, 0.4)}`,
            }}
          >
            <div
              style={{
                color: areaHoverTooltip.color,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.5px",
                textTransform: "uppercase",
              }}
            >
              {areaHoverTooltip.name}
            </div>
            <span
              style={{
                display: "block",
                fontSize: 10,
                fontWeight: 500,
                color: "#7a8aae",
                letterSpacing: "0.3px",
                marginTop: 2,
              }}
            >
              {areaHoverTooltip.count} suburbs · click to drill in
            </span>
          </div>
        ) : null}
      </>
    );
  }
);
