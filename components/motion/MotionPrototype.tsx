"use client";

import { useRef, useState, useCallback } from "react";
import { MapboxScene, MapboxSceneHandle, Area, Suburb } from "./MapboxScene";
import { AREA_COLOR_BY_NAME } from "./areaPalette";
import { SuburbSearch } from "./SuburbSearch";
import { EncryptedText } from "@/components/aceternity/encrypted-text";

type StateKey = "NSW" | "QLD" | "TAS";
type Level = "state" | "area" | "suburb";

// Hardcoded representatives for QLD and TAS — single-suburb showcase
const QLD_SHOWCASE: Suburb = {
  name: "Cranbrook", slug: "cranbrook-4814", postcode: "4814", area: "Queensland", state: "QLD",
};
const TAS_SHOWCASE: Suburb = {
  name: "Launceston", slug: "launceston-7250", postcode: "7250", area: "Tasmania", state: "TAS",
};

export function MotionPrototype() {
  const [stateKey, setStateKey] = useState<StateKey>("NSW");
  const [level, setLevel] = useState<Level>("state");
  const [activeArea, setActiveArea] = useState<Area | null>(null);
  const [activeSuburb, setActiveSuburb] = useState<Suburb | null>(null);

  const mapRef = useRef<MapboxSceneHandle>(null);

  const colorFor = useCallback((areaName: string) => {
    return AREA_COLOR_BY_NAME[areaName] ?? "#7a8aae";
  }, []);

  // ── Map → React click handlers ──────────────────────────────────────────

  const handleAreaClick = useCallback((area: Area) => {
    setLevel("area");
    setActiveArea(area);
    setActiveSuburb(null);
    mapRef.current?.drillToArea(area);
  }, []);

  const handleSuburbClick = useCallback((suburb: Suburb) => {
    setLevel("suburb");
    setActiveSuburb(suburb);
    if (!activeArea || activeArea.name !== suburb.area) {
      setActiveArea({ name: suburb.area, slug: slugify(suburb.area) });
    }
    mapRef.current?.focusSuburb(suburb);
  }, [activeArea]);

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
    <div className="relative w-full h-dvh overflow-hidden bg-[#05050a] text-[#e0e6f5]">
      <MapboxScene
        ref={mapRef}
        onAreaClick={handleAreaClick}
        onSuburbClick={handleSuburbClick}
      />

      {/* Top-centre brand (motion prototype only) */}
      <div className="fixed top-[12px] left-1/2 z-[1000] -translate-x-1/2 pointer-events-none">
        <EncryptedText
          text="Market Meerkat"
          className="inline-block whitespace-nowrap font-mono text-base font-bold uppercase tracking-[2px] text-[#00e5ff] opacity-90 [text-shadow:0_0_12px_rgba(0,229,255,0.6)]"
        />
      </div>

      {/* Top-right: suburb search */}
      <div className="pointer-events-none absolute top-[12px] right-[12px] z-[1100] w-[min(280px,calc(100vw-48px))]">
        <div className="pointer-events-auto ml-auto w-full max-w-[280px]">
          <SuburbSearch onNavigateToSuburb={navigateSuburbFromSearch} />
        </div>
      </div>

      {/* Top-left: State toggle */}
      <div className="absolute top-[12px] left-[12px] z-10 flex flex-col gap-2.5">
        <StateToggle current={stateKey} onChange={switchToState} />
        {showBack && (
          <button
            onClick={goBack}
            className="self-start text-[#e0e6f5] text-xs font-bold tracking-[0.18em] uppercase px-4 py-2 rounded-md bg-[rgba(10,10,18,0.96)] border border-[#1a1a3a] hover:border-[#00e5ff] hover:text-[#00e5ff] hover:shadow-[0_0_12px_rgba(0,229,255,0.35)] transition-all"
          >
            ← Back
          </button>
        )}
      </div>

      {/* Top-centre: Focus badge (suburb level only) — above brand header z */}
      {level === "suburb" && activeSuburb && (
        <div
          className="absolute top-5 left-1/2 -translate-x-1/2 z-[1050] px-5 py-2 rounded-full text-black text-sm font-bold tracking-[0.15em] uppercase flex items-center gap-2 whitespace-nowrap"
          style={{
            background: "linear-gradient(135deg, #00e5ff 0%, #5b6cff 100%)",
            boxShadow: "0 0 20px rgba(0,229,255,0.55), 0 0 40px rgba(91,108,255,0.35)",
          }}
        >
          <span className="text-base leading-none">◆</span>
          <span>Focus: {activeSuburb.name}</span>
          <span className="opacity-60 font-medium">{activeSuburb.postcode}</span>
        </div>
      )}

      {/* Bottom-centre: breadcrumb */}
      <div
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 rounded-full px-2 py-1 flex items-center gap-1"
        style={{
          background: "rgba(10,10,18,0.96)",
          border: "1px solid #1a1a3a",
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
      className="inline-flex p-1 rounded-full gap-1"
      style={{
        background: "rgba(10,10,18,0.96)",
        border: "1px solid #1a1a3a",
        backdropFilter: "blur(12px)",
      }}
    >
      {states.map(({ key, label }) => {
        const active = key === current;
        return (
          <button
            key={key}
            onClick={() => onChange(key)}
            className="px-3.5 py-1.5 rounded-full text-xs font-bold tracking-[0.15em] uppercase transition-all"
            style={
              active
                ? {
                    background: "linear-gradient(135deg, #00e5ff 0%, #5b6cff 100%)",
                    color: "#000",
                    boxShadow: "0 0 14px rgba(0,229,255,0.55)",
                  }
                : { color: "#7a8aae", background: "transparent" }
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
      className="text-xs font-bold tracking-[0.15em] uppercase px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all"
      style={
        active
          ? { color: "#fff", background: "rgba(0,229,255,0.12)" }
          : { color: "#7a8aae", background: "transparent" }
      }
    >
      {dotColor && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: dotColor, boxShadow: `0 0 4px ${dotColor}` }}
        />
      )}
      {label}
    </button>
  );
}

function Sep() {
  return <span className="text-[#3a3a5a] text-xs">›</span>;
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}
