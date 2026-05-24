"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { GooeyInput } from "@/components/aceternity/gooey-input";
import { INK_5, INK_20, INK_100 } from "@/lib/palette/v2";
import type { Suburb } from "./MapboxSceneV2";

type Props = {
  /** Full prototype navigation (state → area → suburb), not plain focus. */
  onNavigateToSuburb: (suburb: Suburb) => void;
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

export function SuburbSearchV2({ onNavigateToSuburb }: Props) {
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
      onNavigateToSuburb(propsToSuburb(p));
      closeAndClear();
    },
    [onNavigateToSuburb, closeAndClear],
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
      "bg-[#000000] text-[#ffffff] ring-1 ring-[#ffffff] shadow-[0_0_14px_rgba(255,255,255,0.08)] focus-within:ring-[#ffffff]",
    input: "text-[#ffffff] placeholder:opacity-0 leading-[2.5rem] py-0",
  };

  return (
    <div ref={wrapRef} className="relative w-full max-w-[280px]">
      <GooeyInput
        key={gooeyResetKey}
        inlineLeadingIcon
        value={query}
        onValueChange={setQuery}
        placeholder=""
        collapsedWidth={48}
        expandedWidth={260}
        expandedOffset={0}
        gooeyBlur={5}
        onInputKeyDown={onInputKeyDown}
        classNames={{
          trigger: gooeyLook.trigger,
          input: gooeyLook.input,
        }}
      />
      {showList ? (
        <ul
          className="absolute right-0 z-[1101] mt-2 w-full max-w-[280px] overflow-hidden rounded-xl py-1 backdrop-blur-[12px]"
          style={{
            background: INK_5,
            border: `1px solid ${INK_20}`,
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
          role="listbox"
        >
          {matches.map(f => {
            const p = f.properties as Suburb;
            return (
              <li
                key={p.slug}
                role="option"
                className="border-b border-solid last:border-b-0"
                style={{ borderColor: INK_20 }}
              >
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-[#1a1a1a]"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => pick(f)}
                >
                  <span className="text-[13px] font-semibold" style={{ color: INK_100 }}>
                    {p.name}
                  </span>
                  <span className="text-[11px] tracking-wide" style={{ color: INK_100 }}>
                    {p.postcode}
                    {" · "}
                    <span style={{ opacity: 0.85 }}>{p.area}</span>
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
