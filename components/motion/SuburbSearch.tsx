"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { GooeyInput } from "@/components/aceternity/gooey-input";
import { AREA_COLOR_BY_NAME } from "./areaPalette";
import type { Suburb } from "./MapboxScene";

type Props = {
  onSelectSuburb: (suburb: Suburb) => void;
};

function propsToSuburb(p: Suburb): Suburb {
  return {
    name: p.name,
    slug: p.slug,
    postcode: p.postcode,
    area: p.area,
    state: p.state,
  };
}

export function SuburbSearch({ onSelectSuburb }: Props) {
  const [features, setFeatures] = useState<GeoJSON.Feature[]>([]);
  const [query, setQuery] = useState("");
  const [gooeyResetKey, setGooeyResetKey] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/suburbs.geojson")
      .then(r => r.json())
      .then((data: GeoJSON.FeatureCollection) => setFeatures(data.features ?? []))
      .catch(err => console.error("[SuburbSearch] load failed:", err));
  }, []);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const hit = features.filter(f => {
      const name = (f.properties as Suburb | null)?.name ?? "";
      return name.toLowerCase().includes(q);
    });
    hit.sort((a, b) =>
      ((a.properties as Suburb).name).localeCompare((b.properties as Suburb).name, undefined, {
        sensitivity: "base",
      }),
    );
    return hit.slice(0, 8);
  }, [features, query]);

  const closeAndClear = useCallback(() => {
    setQuery("");
    setGooeyResetKey(k => k + 1);
  }, []);

  const pick = useCallback(
    (f: GeoJSON.Feature) => {
      const p = f.properties as Suburb;
      if (!p?.slug) return;
      onSelectSuburb(propsToSuburb(p));
      closeAndClear();
    },
    [onSelectSuburb, closeAndClear],
  );

  useEffect(() => {
    function onPointerDown(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) {
        closeAndClear();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [closeAndClear]);

  const onInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeAndClear();
        return;
      }
      if (e.key === "Enter" && matches.length === 1) {
        e.preventDefault();
        pick(matches[0]);
      }
    },
    [matches, pick, closeAndClear],
  );

  const showList = query.trim().length > 0 && matches.length > 0;

  const gooeyLook = {
    trigger:
      "bg-[rgba(10,10,18,0.96)] text-[#e0e6f5] ring-1 ring-[#00e5ff]/70 shadow-[0_0_18px_rgba(0,229,255,0.22)] focus-within:shadow-[0_0_28px_rgba(0,229,255,0.45)] focus-within:ring-[#00e5ff]",
    input: "text-[#e0e6f5] placeholder:opacity-0",
    bubbleSurface:
      "bg-[rgba(10,10,18,0.96)] text-[#00e5ff] ring-1 ring-[#00e5ff]/80 shadow-[0_0_14px_rgba(0,229,255,0.35)]",
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-[400px]">
      <GooeyInput
        key={gooeyResetKey}
        value={query}
        onValueChange={setQuery}
        placeholder=""
        collapsedWidth={48}
        expandedWidth={368}
        expandedOffset={54}
        gooeyBlur={5}
        onInputKeyDown={onInputKeyDown}
        classNames={{
          trigger: gooeyLook.trigger,
          input: gooeyLook.input,
          bubbleSurface: gooeyLook.bubbleSurface,
        }}
      />
      {showList ? (
        <ul
          className="absolute left-1/2 z-[1101] mt-2 w-[min(100%,368px)] -translate-x-1/2 overflow-hidden rounded-xl border border-[#00e5ff]/50 py-1 shadow-[0_0_24px_rgba(0,229,255,0.35)] backdrop-blur-[12px]"
          style={{ background: "rgba(10,10,18,0.96)" }}
          role="listbox"
        >
          {matches.map(f => {
            const p = f.properties as Suburb;
            const areaColor = AREA_COLOR_BY_NAME[p.area] ?? "#7a8aae";
            return (
              <li key={p.slug} role="option">
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[rgba(0,229,255,0.08)]"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(f)}
                >
                  <span className="text-[13px] font-semibold text-[#f0f4ff]">{p.name}</span>
                  <span className="text-[11px] text-[#7a8aae] tracking-wide">
                    {p.postcode}
                    {" · "}
                    <span style={{ color: areaColor }}>{p.area}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
