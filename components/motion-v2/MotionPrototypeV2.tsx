"use client";

import { useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import type { LeafletSceneHandle, Area, Suburb } from "./types";
import { suburbDashboardHref } from "@/lib/dash/slugs";
import { ACCENT_RED, AREA_COLOR_BY_NAME, INK_0, INK_10, INK_40, INK_80, INK_100 } from "@/lib/palette/v2";
import { SuburbSearchV2 } from "./SuburbSearchV2";
import { SeeDataLink } from "./SeeDataLink";

type StateKey = "NSW" | "QLD" | "TAS";
type Level = "state" | "area" | "suburb";

// Hardcoded representatives for QLD and TAS — single-suburb showcase
const QLD_SHOWCASE: Suburb = {
  name: "Cranbrook", slug: "cranbrook-4814", postcode: "4814", area: "Queensland", state: "QLD",
};
const TAS_SHOWCASE: Suburb = {
  name: "Launceston", slug: "launceston-7250", postcode: "7250", area: "Tasmania", state: "TAS",
};

const LeafletSceneV2 = dynamic(
  () => import("./LeafletSceneV2").then(m => m.LeafletSceneV2),
  { ssr: false },
);

export function MotionPrototypeV2() {
  const router = useRouter();
  const [stateKey, setStateKey] = useState<StateKey>("NSW");
  const [level, setLevel] = useState<Level>("state");
  const [activeArea, setActiveArea] = useState<Area | null>(null);
  const [activeSuburb, setActiveSuburb] = useState<Suburb | null>(null);

  const mapRef = useRef<LeafletSceneHandle>(null);

  const colorFor = useCallback((areaName: string) => AREA_COLOR_BY_NAME[areaName] ?? INK_100, []);

  // ── Map → React click handlers ──────────────────────────────────────────

  const handleAreaClick = useCallback((area: Area) => {
    setLevel("area");
    setActiveArea(area);
    setActiveSuburb(null);
    mapRef.current?.drillToArea(area);
  }, []);

  const handleSuburbClick = useCallback(
    (suburb: Suburb) => {
      router.push(
        suburbDashboardHref(suburb.state, suburb.area, suburb.slug),
      );
    },
    [router],
  );

  /** Search pick: full UI + map sequence (state → area → suburb), aligned with manual navigation. */
  const navigateSuburbFromSearch = useCallback(
    (suburb: Suburb) => {
      const map = mapRef.current;
      if (!map) return;

      const flyPadMs = 1480;

      const after = (ms: number, fn: () => void) => {
        window.setTimeout(fn, ms);
      };

      if (suburb.state === "QLD" || suburb.state === "TAS") {
        const key: StateKey = suburb.state === "QLD" ? "QLD" : "TAS";
        setStateKey(key);
        setLevel("suburb");
        setActiveArea({ name: suburb.area, slug: slugify(suburb.area) });
        setActiveSuburb(suburb);
        map.showSingleStateSuburb(suburb);
        return;
      }

      const area: Area = { name: suburb.area, slug: slugify(suburb.area) };

      if (stateKey !== "NSW") {
        setStateKey("NSW");
        setLevel("state");
        setActiveArea(null);
        setActiveSuburb(null);
        map.goToNswState();
        after(flyPadMs, () => {
          setLevel("area");
          setActiveArea(area);
          setActiveSuburb(null);
          map.drillToArea(area);
          after(flyPadMs, () => {
            setLevel("suburb");
            setActiveSuburb(suburb);
            map.focusSuburb(suburb);
          });
        });
        return;
      }

      setLevel("area");
      setActiveArea(area);
      setActiveSuburb(null);
      map.drillToArea(area);
      after(flyPadMs, () => {
        setLevel("suburb");
        setActiveSuburb(suburb);
        map.focusSuburb(suburb);
      });
    },
    [stateKey],
  );

  // ── React → Map navigation ──────────────────────────────────────────────

  const goToNswState = () => {
    setStateKey("NSW");
    setLevel("state");
    setActiveArea(null);
    setActiveSuburb(null);
    mapRef.current?.goToNswState();
  };

  const goToArea = (area: Area) => {
    setLevel("area");
    setActiveArea(area);
    setActiveSuburb(null);
    if (level === "state") mapRef.current?.drillToArea(area);
    else mapRef.current?.upToArea(area);
  };

  const goBack = () => {
    if (stateKey !== "NSW") return; // QLD/TAS have no back
    if (level === "suburb" && activeArea) goToArea(activeArea);
    else if (level === "area") goToNswState();
  };

  const switchToState = (next: StateKey) => {
    if (next === stateKey) return;
    setStateKey(next);
    if (next === "NSW") {
      setLevel("state");
      setActiveArea(null);
      setActiveSuburb(null);
      mapRef.current?.goToNswState();
    } else {
      const showcase = next === "QLD" ? QLD_SHOWCASE : TAS_SHOWCASE;
      setLevel("suburb");
      setActiveArea({ name: showcase.area, slug: slugify(showcase.area) });
      setActiveSuburb(showcase);
      mapRef.current?.showSingleStateSuburb(showcase);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  const showBack = stateKey === "NSW" && level !== "state";

  return (
    <div className="relative w-full h-dvh overflow-hidden bg-[#000000] text-[#ffffff]">
      <LeafletSceneV2
        ref={mapRef}
        onAreaClick={handleAreaClick}
        onSuburbClick={handleSuburbClick}
      />

      {/* Top-right: suburb search */}
      <div className="pointer-events-none absolute top-[12px] right-[12px] z-[1100] w-[min(280px,calc(100vw-48px))]">
        <div className="pointer-events-auto ml-auto w-full max-w-[280px]">
          <SuburbSearchV2 onNavigateToSuburb={navigateSuburbFromSearch} />
        </div>
      </div>

      {/* Top-left: State toggle */}
      <div className="absolute top-[12px] left-[12px] z-10 flex flex-col gap-2.5">
        <StateToggle current={stateKey} onChange={switchToState} />
        {showBack && (
          <button
            onClick={goBack}
            className="self-start border border-solid text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-md transition-colors hover:bg-[#1a1a1a]"
            style={{ background: INK_0, borderColor: INK_100, color: INK_100 }}
          >
            ← Back
          </button>
        )}
      </div>

      {/* Top-centre: Focus badge (suburb level only) */}
      {level === "suburb" && activeSuburb && (
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-10 px-5 py-2 rounded-full text-sm font-bold tracking-[0.15em] uppercase flex items-center gap-2 whitespace-nowrap border border-solid bg-transparent"
          style={{
            borderColor: ACCENT_RED,
            color: INK_100,
            boxShadow: "none",
          }}
        >
          <span className="text-base leading-none" style={{ color: INK_100 }}>
            ◆
          </span>
          <span>Focus: {activeSuburb.name}</span>
          <span className="opacity-60 font-medium">{activeSuburb.postcode}</span>
        </div>
      )}

      {(level === "area" || level === "suburb") && activeArea && (
        <SeeDataLink
          level={level}
          stateKey={stateKey}
          area={activeArea}
          suburb={activeSuburb}
        />
      )}

      {/* Bottom-centre: breadcrumb */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-full px-2 py-1 flex items-center gap-1 border border-solid backdrop-blur-[12px]"
        style={{
          background: INK_10,
          borderColor: INK_40,
          backdropFilter: "blur(12px)",
        }}
      >
        <Crumb
          label={stateKey}
          active={stateKey === "NSW" ? level === "state" : true}
          onClick={() => stateKey === "NSW" ? goToNswState() : null}
        />
        {stateKey === "NSW" && activeArea && (
          <>
            <Sep />
            <Crumb
              label={activeArea.name}
              active={level === "area"}
              onClick={() => goToArea(activeArea)}
              dotColor={colorFor(activeArea.name)}
            />
          </>
        )}
        {activeSuburb && (
          <>
            <Sep />
            <Crumb
              label={activeSuburb.name}
              active={level === "suburb"}
              onClick={() => activeSuburb && mapRef.current?.focusSuburb(activeSuburb)}
              dotColor={colorFor(activeSuburb.area)}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── State toggle ─────────────────────────────────────────────────────────────

function StateToggle({ current, onChange }: { current: StateKey; onChange: (k: StateKey) => void }) {
  const states: { key: StateKey; label: string }[] = [
    { key: "NSW", label: "New South Wales" },
    { key: "QLD", label: "QLD" },
    { key: "TAS", label: "TAS" },
  ];
  return (
    <div
      className="inline-flex p-1 rounded-full gap-1 border border-solid backdrop-blur-[12px]"
      style={{
        background: INK_10,
        borderColor: INK_100,
      }}
    >
      {states.map(({ key, label }) => {
        const active = key === current;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-colors border border-transparent ${active ? "" : "hover:bg-[#1a1a1a]"}`}
            style={
              active
                ? { background: INK_100, color: INK_0 }
                : {
                    color: INK_100,
                    background: "transparent",
                  }
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Breadcrumb pieces ────────────────────────────────────────────────────────

function Crumb({
  label, active, onClick, dotColor,
}: {
  label: string; active: boolean; onClick: () => void; dotColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="text-xs font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-colors"
      style={{
        color: active ? INK_100 : INK_80,
        background: "transparent",
      }}
    >
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
        />
      )}
      {label}
    </button>
  );
}

function Sep() {
  return <span className="text-xs select-none" style={{ color: INK_40 }}>›</span>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
