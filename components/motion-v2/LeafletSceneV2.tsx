"use client";

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leaflet-v2.css";
import { INK_0, INK_100, INK_60 } from "@/lib/palette/v2";
import {
  EXCLUDED_NSW_AREAS,
  type Area,
  type LeafletSceneHandle,
  type Suburb,
} from "./types";

export type { Area, Suburb, LeafletSceneHandle };

export const NSW_BOUNDS: L.LatLngBoundsExpression = [
  [-34.55, 150.5],
  [-32.8, 151.95],
];

const STATE_BOUNDS = {
  NSW: L.latLngBounds([-34.55, 150.5], [-32.8, 151.95]),
  QLD: L.latLngBounds([-19.5, 146.55], [-19.1, 146.9]),
  TAS: L.latLngBounds([-41.58, 146.95], [-41.3, 147.3]),
};

const WHITE = "#ffffff";
const GLOW = "drop-shadow(0 0 6px rgba(255,255,255,0.6))";
const GLOW_HOVER = "drop-shadow(0 0 12px rgba(255,255,255,0.85))";

const AREA_BASE: L.PathOptions = {
  color: WHITE,
  weight: 3,
  opacity: 1,
  fillColor: WHITE,
  fillOpacity: 0.08,
};

const SUBURB_BASE: L.PathOptions = {
  color: WHITE,
  weight: 1.6,
  opacity: 0.9,
  fillColor: WHITE,
  fillOpacity: 0.12,
};

const HIDDEN_AREA: L.PathOptions = { opacity: 0, fillOpacity: 0, weight: 0 };

const ACTIVE_AREA_OUTLINE: L.PathOptions = {
  color: WHITE,
  weight: 2,
  opacity: 0.7,
  fillColor: WHITE,
  fillOpacity: 0.04,
  dashArray: "4 4",
};

const FOCUS_FLY_PADDING: [number, number] = [120, 120];
/** Cap focus zoom so dimmed neighbours stay in view around the focused suburb. */
const FOCUS_MAX_ZOOM = 14;

const SUBURB_DIMMED: L.PathOptions = {
  color: WHITE,
  weight: 1,
  opacity: 0.3,
  fillColor: WHITE,
  fillOpacity: 0.04,
};

const SUBURB_FOCUSED: L.PathOptions = {
  color: WHITE,
  weight: 3,
  opacity: 1,
  fillColor: WHITE,
  fillOpacity: 0.35,
};

interface Props {
  onAreaClick: (area: Area) => void;
  onSuburbClick: (suburb: Suburb) => void;
}

function applyGlow(path: SVGPathElement | null | undefined, hover: boolean) {
  if (!path) return;
  path.style.filter = hover ? GLOW_HOVER : GLOW;
  path.style.strokeWidth = hover ? "5" : "3";
}

function propsToArea(p: { name: string; slug: string }): Area {
  return { name: p.name, slug: p.slug };
}

function propsToSuburb(p: Suburb): Suburb {
  return p;
}

export const LeafletSceneV2 = forwardRef<LeafletSceneHandle, Props>(
  function LeafletSceneV2({ onAreaClick, onSuburbClick }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tileLayerRef = useRef<L.TileLayer | null>(null);
    const areaLayerRef = useRef<L.GeoJSON | null>(null);
    const suburbLayerRef = useRef<L.GeoJSON | null>(null);
    const suburbLabelLayerRef = useRef<L.LayerGroup | null>(null);
    const svgRendererRef = useRef<L.Renderer | null>(null);
    const isZoomingRef = useRef(false);
    const areasFCRef = useRef<GeoJSON.FeatureCollection | null>(null);
    const suburbsFCRef = useRef<GeoJSON.FeatureCollection | null>(null);
    const areaCountsRef = useRef<Record<string, number>>({});
    const levelRef = useRef<"state" | "area" | "suburb">("state");
    const activeAreaNameRef = useRef<string | null>(null);
    const activeSuburbSlugRef = useRef<string | null>(null);

    const onAreaClickRef = useRef(onAreaClick);
    const onSuburbClickRef = useRef(onSuburbClick);
    onAreaClickRef.current = onAreaClick;
    onSuburbClickRef.current = onSuburbClick;

    const [areaHoverTooltip, setAreaHoverTooltip] = useState<{
      pageX: number;
      pageY: number;
      name: string;
      count: number;
    } | null>(null);

    const [suburbHoverTooltip, setSuburbHoverTooltip] = useState<{
      pageX: number;
      pageY: number;
      name: string;
    } | null>(null);

    const dismissTooltips = () => {
      setAreaHoverTooltip(null);
      setSuburbHoverTooltip(null);
    };

    function setMapZooming(zooming: boolean) {
      isZoomingRef.current = zooming;
      containerRef.current?.classList.toggle("is-zooming", zooming);
    }

    function stripPathGlows() {
      containerRef.current
        ?.querySelectorAll<SVGPathElement>(".area-tile, .suburb-tile")
        .forEach(path => {
          path.style.filter = "none";
        });
    }

    function restorePathGlows() {
      refreshAreaLayers();
      refreshSuburbLayers();
    }

    function areaStyle(
      feature: GeoJSON.Feature,
      level: "state" | "area" | "suburb",
      activeArea: string | null,
    ): L.PathOptions {
      const name = (feature.properties as { name: string }).name;
      if (level === "state") return { ...AREA_BASE };
      if (name === activeArea) return { ...ACTIVE_AREA_OUTLINE };
      return { ...HIDDEN_AREA };
    }

    function suburbLabelIcon(name: string): L.DivIcon {
      return L.divIcon({
        className: "suburb-label-icon",
        html: `<div style="color:#fff;font-size:10px;font-weight:600;text-shadow:0 0 4px #000,0 0 4px #000;white-space:nowrap;text-align:center;transform:translateX(-50%);pointer-events:none">${name}</div>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
    }

    function clearSuburbLabels(map: L.Map) {
      if (suburbLabelLayerRef.current) {
        map.removeLayer(suburbLabelLayerRef.current);
        suburbLabelLayerRef.current = null;
      }
    }

    /** Persistent label — focused suburb only (not hover). */
    function setFocusedSuburbLabel(map: L.Map, feature: GeoJSON.Feature | null) {
      clearSuburbLabels(map);
      if (!feature) return;
      const name = (feature.properties as { name: string }).name;
      const center = L.geoJSON(feature).getBounds().getCenter();
      const group = L.layerGroup();
      L.marker(center, {
        icon: suburbLabelIcon(name),
        interactive: false,
      }).addTo(group);
      group.addTo(map);
      suburbLabelLayerRef.current = group;
    }

    function suburbStyle(
      feature: GeoJSON.Feature,
      level: "state" | "area" | "suburb",
      activeSlug: string | null,
      hover: boolean,
    ): L.PathOptions {
      const slug = (feature.properties as { slug: string }).slug;
      if (level === "area") {
        if (hover) {
          return {
            color: WHITE,
            weight: 2.6,
            opacity: 1,
            fillColor: WHITE,
            fillOpacity: 0.3,
          };
        }
        return { ...SUBURB_BASE };
      }
      if (level === "suburb" && slug === activeSlug) {
        return { ...SUBURB_FOCUSED };
      }
      if (level === "suburb") {
        return { ...SUBURB_DIMMED };
      }
      return { ...SUBURB_BASE };
    }

    function clearSuburbLayer(map: L.Map) {
      if (suburbLayerRef.current) {
        map.removeLayer(suburbLayerRef.current);
        suburbLayerRef.current = null;
      }
      clearSuburbLabels(map);
    }

    function showSuburbsForArea(map: L.Map, areaName: string) {
      clearSuburbLayer(map);
      const fc = suburbsFCRef.current;
      if (!fc) return;

      const filtered = fc.features.filter(
        f => (f.properties as { area: string }).area === areaName,
      );

      const geoRenderer = svgRendererRef.current ?? undefined;
      suburbLayerRef.current = L.geoJSON(
        { type: "FeatureCollection", features: filtered } as GeoJSON.FeatureCollection,
        {
          ...(geoRenderer ? ({ renderer: geoRenderer } as L.GeoJSONOptions) : {}),
          style: f =>
            suburbStyle(
              f as GeoJSON.Feature,
              levelRef.current,
              activeSuburbSlugRef.current,
              false,
            ),
          onEachFeature: (f, layer) => {
            const feat = f as GeoJSON.Feature;
            const pathLayer = layer as L.Path;
            layer.on("add", () => {
              const path = pathLayer.getElement?.() as SVGPathElement | undefined;
              if (path) {
                path.classList.add("suburb-tile");
                path.style.filter = GLOW;
              }
            });
            layer.on("mouseover", e => {
              if (levelRef.current !== "area") return;
              pathLayer.setStyle(
                suburbStyle(
                  feat,
                  "area",
                  activeSuburbSlugRef.current,
                  true,
                ),
              );
              const path = pathLayer.getElement?.() as SVGPathElement | undefined;
              applyGlow(path, true);
              const suburbName = (feat.properties as { name: string }).name;
              const oe = e.originalEvent as MouseEvent;
              setSuburbHoverTooltip({
                pageX: oe.pageX + 14,
                pageY: oe.pageY - 12,
                name: suburbName,
              });
            });
            layer.on("mousemove", e => {
              if (levelRef.current !== "area") return;
              const oe = e.originalEvent as MouseEvent;
              setSuburbHoverTooltip(prev =>
                prev
                  ? { ...prev, pageX: oe.pageX + 14, pageY: oe.pageY - 12 }
                  : null,
              );
            });
            layer.on("mouseout", () => {
              if (levelRef.current !== "area") return;
              pathLayer.setStyle(
                suburbStyle(
                  feat,
                  "area",
                  activeSuburbSlugRef.current,
                  false,
                ),
              );
              const path = pathLayer.getElement?.() as SVGPathElement | undefined;
              applyGlow(path, false);
              if (path) path.style.strokeWidth = "1.6";
              setSuburbHoverTooltip(null);
            });
            layer.on("click", () => {
              const p = feat.properties as Suburb;
              if (levelRef.current === "area") {
                onSuburbClickRef.current(propsToSuburb(p));
                return;
              }
              if (
                levelRef.current === "suburb" &&
                p.slug !== activeSuburbSlugRef.current
              ) {
                onSuburbClickRef.current(propsToSuburb(p));
              }
            });
          },
        },
      ).addTo(map);
    }

    /** Per-suburb style + glow + interactivity — dim siblings at suburb focus. */
    function refreshSuburbLayers() {
      const group = suburbLayerRef.current;
      if (!group) return;
      const level = levelRef.current;
      const activeSlug = activeSuburbSlugRef.current;

      group.eachLayer(layer => {
        const pathLayer = layer as L.Path & { feature?: GeoJSON.Feature };
        const feat = pathLayer.feature;
        if (!feat) return;
        const slug = (feat.properties as { slug: string }).slug;
        const path = pathLayer.getElement?.() as SVGPathElement | undefined;

        if (level === "area") {
          pathLayer.setStyle(suburbStyle(feat, "area", null, false));
          pathLayer.options.interactive = true;
          if (path) {
            path.style.pointerEvents = "";
            path.style.filter = isZoomingRef.current ? "none" : GLOW;
          }
          return;
        }

        if (level === "suburb" && slug === activeSlug) {
          pathLayer.setStyle({ ...SUBURB_FOCUSED });
          pathLayer.options.interactive = false;
          if (path) {
            path.style.pointerEvents = "none";
            path.style.filter = isZoomingRef.current ? "none" : GLOW_HOVER;
          }
          return;
        }

        if (level === "suburb") {
          pathLayer.setStyle({ ...SUBURB_DIMMED });
          pathLayer.options.interactive = true;
          if (path) {
            path.style.pointerEvents = "";
            path.style.filter = isZoomingRef.current ? "none" : "none";
          }
        }
      });
    }

    /** Hide non-active areas and disable their pointer events when drilled in. */
    function refreshAreaLayers() {
      const group = areaLayerRef.current;
      if (!group) return;
      const level = levelRef.current;
      const activeArea = activeAreaNameRef.current;

      group.eachLayer(layer => {
        const pathLayer = layer as L.Path & { feature?: GeoJSON.Feature };
        const feat = pathLayer.feature;
        if (!feat) return;
        const name = (feat.properties as { name: string }).name;
        const path = pathLayer.getElement?.() as SVGPathElement | undefined;

        if (level === "state") {
          pathLayer.setStyle({ ...AREA_BASE });
          pathLayer.options.interactive = true;
          if (path) {
            path.style.pointerEvents = "";
            path.style.filter = isZoomingRef.current ? "none" : GLOW;
            path.style.visibility = "";
          }
          return;
        }

        if (name === activeArea) {
          pathLayer.setStyle({ ...ACTIVE_AREA_OUTLINE });
          pathLayer.options.interactive = false;
          if (path) {
            path.style.pointerEvents = "none";
            path.style.visibility = "";
          }
          return;
        }

        pathLayer.setStyle({ ...HIDDEN_AREA });
        pathLayer.options.interactive = false;
        if (path) {
          path.style.pointerEvents = "none";
          path.style.filter = "none";
          path.style.visibility = "hidden";
          path.classList.remove("lifted");
        }
      });
    }

    useEffect(() => {
      if (!containerRef.current || mapRef.current) return;

      const svgRenderer = L.svg({ padding: 2 });
      svgRendererRef.current = svgRenderer;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        preferCanvas: false,
        zoomAnimation: true,
        zoomAnimationThreshold: 4,
        fadeAnimation: false,
      }).fitBounds(STATE_BOUNDS.NSW, { padding: [10, 10] });

      L.control.zoom({ position: "bottomright" }).addTo(map);

      const tileLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          subdomains: "abcd",
          maxZoom: 19,
          updateWhenZooming: false,
        },
      ).addTo(map);

      const onZoomStart = () => {
        setMapZooming(true);
        stripPathGlows();
      };
      const onZoomEnd = () => {
        setMapZooming(false);
        restorePathGlows();
      };
      map.on("zoomstart", onZoomStart);
      map.on("zoomend", onZoomEnd);
      map.on("moveend", onZoomEnd);

      mapRef.current = map;
      tileLayerRef.current = tileLayer;

      Promise.all([
        fetch("/areas_smooth.geojson").then(r => r.json()),
        fetch("/suburbs.geojson").then(r => r.json()),
      ])
        .then(
          ([areasData, suburbsData]: [
            GeoJSON.FeatureCollection,
            GeoJSON.FeatureCollection,
          ]) => {
            areasFCRef.current = areasData;
            suburbsFCRef.current = suburbsData;

            const counts: Record<string, number> = {};
            suburbsData.features.forEach(f => {
              const p = f.properties as { area: string; state: string };
              if (p.state === "NSW") counts[p.area] = (counts[p.area] || 0) + 1;
            });
            areaCountsRef.current = counts;

            const nswAreas = areasData.features.filter(
              f =>
                !EXCLUDED_NSW_AREAS.has(
                  (f.properties as { name: string }).name,
                ),
            );

            areaLayerRef.current = L.geoJSON(nswAreas as GeoJSON.Feature[], {
              ...( { renderer: svgRenderer } as L.GeoJSONOptions ),
              style: f => areaStyle(f as GeoJSON.Feature, "state", null),
              onEachFeature: (f, layer) => {
                const feat = f as GeoJSON.Feature;
                const pathLayer = layer as L.Path;
                const areaName = (feat.properties as { name: string }).name;

                layer.on("add", () => {
                  const path = pathLayer.getElement?.() as
                    | SVGPathElement
                    | undefined;
                  if (path) {
                    path.classList.add("area-tile");
                    path.dataset.area = areaName;
                    path.style.filter = GLOW;
                  }
                });

                layer.on("mouseover", e => {
                  if (levelRef.current !== "state") return;
                  pathLayer.setStyle({ ...AREA_BASE, fillOpacity: 0.3, weight: 5 });
                  const path = pathLayer.getElement?.() as SVGPathElement | undefined;
                  if (path) path.classList.add("lifted");
                  applyGlow(path, true);
                  const oe = e.originalEvent as MouseEvent;
                  setAreaHoverTooltip({
                    pageX: oe.pageX + 14,
                    pageY: oe.pageY - 12,
                    name: areaName,
                    count: counts[areaName] ?? 0,
                  });
                });

                layer.on("mousemove", e => {
                  if (levelRef.current !== "state") return;
                  const oe = e.originalEvent as MouseEvent;
                  setAreaHoverTooltip(prev =>
                    prev
                      ? { ...prev, pageX: oe.pageX + 14, pageY: oe.pageY - 12 }
                      : null,
                  );
                });

                layer.on("mouseout", () => {
                  if (levelRef.current !== "state") return;
                  pathLayer.setStyle({ ...AREA_BASE });
                  const path = pathLayer.getElement?.() as SVGPathElement | undefined;
                  if (path) path.classList.remove("lifted");
                  applyGlow(path, false);
                  setAreaHoverTooltip(null);
                });

                layer.on("click", () => {
                  if (levelRef.current !== "state") return;
                  const p = feat.properties as { name: string; slug: string };
                  onAreaClickRef.current(propsToArea(p));
                });
              },
            }).addTo(map);
          },
        )
        .catch(err => console.error("[LeafletSceneV2] GeoJSON error:", err));

      return () => {
        map.off("zoomstart", onZoomStart);
        map.off("zoomend", onZoomEnd);
        map.off("moveend", onZoomEnd);
        map.remove();
        mapRef.current = null;
        tileLayerRef.current = null;
        areaLayerRef.current = null;
        suburbLayerRef.current = null;
        suburbLabelLayerRef.current = null;
        svgRendererRef.current = null;
        levelRef.current = "state";
        activeAreaNameRef.current = null;
        activeSuburbSlugRef.current = null;
      };
    }, []);

    useImperativeHandle(ref, () => ({
      getAreaCounts: () => ({ ...areaCountsRef.current }),

      goToNswState() {
        const map = mapRef.current;
        if (!map) return;
        dismissTooltips();
        levelRef.current = "state";
        activeAreaNameRef.current = null;
        activeSuburbSlugRef.current = null;
        clearSuburbLayer(map);
        if (areaLayerRef.current && !map.hasLayer(areaLayerRef.current)) {
          areaLayerRef.current.addTo(map);
        }
        refreshAreaLayers();
        map.flyToBounds(STATE_BOUNDS.NSW, {
          padding: [10, 10],
          duration: 1.4,
          easeLinearity: 0.25,
        });
      },

      drillToArea(area) {
        const map = mapRef.current;
        const fc = areasFCRef.current;
        if (!map || !fc) return;
        dismissTooltips();

        const feature = fc.features.find(
          f => (f.properties as { name: string }).name === area.name,
        );
        if (!feature) {
          console.warn("[LeafletSceneV2] area not found:", area.name);
          return;
        }

        levelRef.current = "area";
        activeAreaNameRef.current = area.name;
        activeSuburbSlugRef.current = null;
        refreshAreaLayers();
        showSuburbsForArea(map, area.name);
        setFocusedSuburbLabel(map, null);

        map.flyToBounds(L.geoJSON(feature).getBounds(), {
          padding: [60, 60],
          duration: 1.4,
          easeLinearity: 0.25,
        });
      },

      focusSuburb(suburb) {
        const map = mapRef.current;
        const fc = suburbsFCRef.current;
        if (!map || !fc) return;
        dismissTooltips();

        const feature = fc.features.find(
          f => (f.properties as { slug: string }).slug === suburb.slug,
        );
        if (!feature) {
          console.warn("[LeafletSceneV2] suburb not found:", suburb.slug);
          return;
        }

        levelRef.current = "suburb";
        activeAreaNameRef.current = suburb.area;
        activeSuburbSlugRef.current = suburb.slug;

        if (suburb.state === "NSW") {
          if (!suburbLayerRef.current) {
            showSuburbsForArea(map, suburb.area);
          }
          refreshAreaLayers();
          refreshSuburbLayers();
        }
        setFocusedSuburbLabel(map, feature);

        map.flyToBounds(L.geoJSON(feature).getBounds(), {
          padding: FOCUS_FLY_PADDING,
          maxZoom: FOCUS_MAX_ZOOM,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      },

      upToArea(area) {
        const map = mapRef.current;
        const fc = areasFCRef.current;
        if (!map || !fc) return;
        dismissTooltips();

        const feature = fc.features.find(
          f => (f.properties as { name: string }).name === area.name,
        );
        if (!feature) {
          console.warn("[LeafletSceneV2] upToArea: area not found:", area.name);
          return;
        }

        levelRef.current = "area";
        activeSuburbSlugRef.current = null;
        refreshAreaLayers();
        refreshSuburbLayers();
        setFocusedSuburbLabel(map, null);

        map.flyToBounds(L.geoJSON(feature).getBounds(), {
          padding: [60, 60],
          duration: 1.0,
          easeLinearity: 0.25,
        });
      },

      showSingleStateSuburb(suburb) {
        const map = mapRef.current;
        const fc = suburbsFCRef.current;
        if (!map || !fc) return;
        dismissTooltips();

        const feature = fc.features.find(
          f => (f.properties as { slug: string }).slug === suburb.slug,
        );
        if (!feature) {
          console.warn("[LeafletSceneV2] showcase suburb not found:", suburb.slug);
          return;
        }

        levelRef.current = "suburb";
        activeAreaNameRef.current = suburb.area;
        activeSuburbSlugRef.current = suburb.slug;

        if (areaLayerRef.current && map.hasLayer(areaLayerRef.current)) {
          map.removeLayer(areaLayerRef.current);
        }
        clearSuburbLayer(map);

        suburbLayerRef.current = L.geoJSON(feature, {
          ...(svgRendererRef.current
            ? ({ renderer: svgRendererRef.current } as L.GeoJSONOptions)
            : {}),
          style: { ...SUBURB_FOCUSED },
          onEachFeature: (f, layer) => {
            layer.on("add", () => {
              const path = (layer as L.Path).getElement?.() as
                | SVGPathElement
                | undefined;
              if (path) {
                path.classList.add("suburb-tile");
                path.style.filter = GLOW_HOVER;
              }
            });
          },
        }).addTo(map);

        setFocusedSuburbLabel(map, feature);

        const bounds =
          suburb.state === "QLD"
            ? STATE_BOUNDS.QLD
            : suburb.state === "TAS"
              ? STATE_BOUNDS.TAS
              : L.geoJSON(feature).getBounds();

        map.flyToBounds(bounds, {
          padding: FOCUS_FLY_PADDING,
          maxZoom: FOCUS_MAX_ZOOM,
          duration: 1.2,
          easeLinearity: 0.25,
        });
      },
    }));

    return (
      <>
        <div
          ref={containerRef}
          className="leaflet-v2-map absolute inset-0 z-0"
        />
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
        {suburbHoverTooltip != null ? (
          <div
            className="font-sans"
            style={{
              position: "fixed",
              left: suburbHoverTooltip.pageX,
              top: suburbHoverTooltip.pageY,
              zIndex: 1500,
              pointerEvents: "none",
              background: INK_0,
              border: `1px solid ${INK_100}`,
              borderRadius: 8,
              padding: "8px 14px",
              whiteSpace: "nowrap",
            }}
          >
            <div
              style={{
                color: INK_100,
                fontWeight: 700,
                fontSize: 12,
                letterSpacing: "0.5px",
              }}
            >
              {suburbHoverTooltip.name}
            </div>
          </div>
        ) : null}
      </>
    );
  },
);
