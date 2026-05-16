"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { INK_0, INK_100, INK_60 } from "@/lib/palette/v2";

// ── Stable baseline ──────────────────────────────────────────────────────────
// Area colours: `lib/palette/v2.ts` (passthrough) — seam for brutalist fork.
//
// See docs/MOTION_PROTOTYPE_HANDOFF.md for rendering session history.

// ── Frames ───────────────────────────────────────────────────────────────────

export const NSW_STATE_BBOX: mapboxgl.LngLatBoundsLike = [150.50, -34.55, 151.95, -32.80];

const SUBURB_PITCH = 35;
const FLAT_PITCH = 0;

// Suburb paint expressions — clicked suburb gets the only fill.
const SUBURB_FILL_MODE: mapboxgl.Expression = [
  "case", ["boolean", ["feature-state", "selected"], false], 0.30, 0,
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

// ── Component ────────────────────────────────────────────────────────────────

export const MapboxSceneV2 = forwardRef<MapboxSceneHandle, Props>(
  function MapboxSceneV2({ onAreaClick, onSuburbClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [areaHoverTooltip, setAreaHoverTooltip] = useState<{
      pageX: number;
      pageY: number;
      name: string;
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
      if (!token || !style) { console.error("[MapboxSceneV2] missing env vars"); return; }

      mapboxgl.accessToken = token;
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style,
        attributionControl: false,
        logoPosition: "bottom-left",
      });

      map.on("error", e => console.error("[MapboxSceneV2]", e.error));
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

          // ── Areas: B&W inks only — brightness changes on hover, no hue shift.
          map.addSource("areas", { type: "geojson", data: areasData, promoteId: "name" });
          map.addLayer({
            id: "areas-fill",
            type: "fill",
            source: "areas",
            paint: {
              "fill-color": INK_100,
              "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.10, 0.03],
            },
          });
          map.addLayer({
            id: "areas-outline-glow",
            type: "line",
            source: "areas",
            paint: {
              "line-color": INK_100,
              "line-width": 6,
              "line-opacity": 0.3,
              "line-blur": 3,
            },
          });
          map.addLayer({
            id: "areas-outline",
            type: "line",
            source: "areas",
            paint: {
              "line-color": INK_100,
              "line-width": 1.5,
              "line-opacity": 0.9,
            },
          });
          // Dashed outline shown only when drilled into a single area.
          map.addLayer({
            id: "areas-outline-active",
            type: "line",
            source: "areas",
            layout: { visibility: "none" },
            paint: {
              "line-color": INK_100,
              "line-width": 1,
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
            paint: {
              "fill-color": INK_100,
              "fill-opacity": SUBURB_FILL_MODE,
            },
          });
          map.addLayer({
            id: "suburbs-outline-glow",
            type: "line",
            source: "suburbs",
            layout: { visibility: "none" },
            paint: {
              "line-color": INK_100,
              "line-width": 18,
              "line-opacity": 0.3,
              "line-blur": 9,
            },
          });
          map.addLayer({
            id: "suburbs-outline",
            type: "line",
            source: "suburbs",
            layout: { visibility: "none" },
            paint: {
              "line-color": INK_100,
              "line-width": 4.5,
              "line-opacity": 0.9,
            },
          });
          map.addLayer({
            id: "suburbs-label",
            type: "symbol",
            source: "suburbs-centroids",
            layout: {
              visibility: "none",
              "text-field": ["get", "name"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 11, 11, 13, 22],
              "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Regular"],
              "text-anchor": "center",
              "text-allow-overlap": false,
              "text-ignore-placement": false,
              "symbol-placement": "point",
            },
            paint: {
              "text-color": INK_100,
              "text-halo-color": INK_0,
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
            const oe = e.originalEvent as MouseEvent;
            setAreaHoverTooltip({
              pageX: oe.pageX + 14,
              pageY: oe.pageY - 12,
              name: areaName,
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
        }).catch(err => console.error("[MapboxSceneV2] GeoJSON error:", err));
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
      ["areas-fill", "areas-outline-glow", "areas-outline"].forEach(id => setLayerVis(map, id, visible));
    }
    function setSuburbsVisible(map: mapboxgl.Map, visible: boolean) {
      ["suburbs-fill", "suburbs-outline-glow", "suburbs-outline", "suburbs-label"].forEach(id =>
        setLayerVis(map, id, visible),
      );
    }
    function setActiveAreaDashed(map: mapboxgl.Map, areaName: string | null) {
      if (!map.getLayer("areas-outline-active")) return;
      if (!areaName) { setLayerVis(map, "areas-outline-active", false); return; }
      map.setFilter("areas-outline-active", ["==", ["get", "name"], areaName]);
      setLayerVis(map, "areas-outline-active", true);
    }
    function setSuburbFilter(map: mapboxgl.Map, predicate: mapboxgl.FilterSpecification) {
      ["suburbs-fill", "suburbs-outline-glow", "suburbs-outline", "suburbs-label"].forEach(id =>
        map.setFilter(id, predicate),
      );
    }
    function setSuburbsPaintMode(map: mapboxgl.Map, mode: "area" | "suburb") {
      if (mode === "area") {
        map.setPaintProperty("suburbs-fill", "fill-opacity", SUBURB_FILL_MODE);
        map.setPaintProperty("suburbs-outline", "line-width", 4.5);
        map.setPaintProperty("suburbs-outline", "line-opacity", 0.9);
      } else {
        map.setPaintProperty("suburbs-fill", "fill-opacity", SUBURB_FILL_MODE);
        map.setPaintProperty("suburbs-outline", "line-width", 4.5);
        map.setPaintProperty("suburbs-outline", "line-opacity", 0.9);
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
        console.error("[MapboxSceneV2] flyToBbox: invalid bbox", bbox);
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
          console.warn("[MapboxSceneV2] area not found:", area.name, "loaded?", !!fc);
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
          console.warn("[MapboxSceneV2] suburb not found:", suburb.slug, "loaded?", !!fc);
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
          console.warn("[MapboxSceneV2] upToArea: area not found:", area.name);
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
          console.warn("[MapboxSceneV2] showcase suburb not found:", suburb.slug, "loaded?", !!fc);
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
              background: INK_0,
              border: `1px solid ${INK_100}`,
              borderRadius: 8,
              padding: "8px 14px",
            }}
          >
            <div
              style={{
                color: INK_100,
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
                color: INK_60,
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
