"use client";

import { useRef, useState } from "react";
import {
  BED_LEVELS,
  BED_LEVEL_LABELS,
  CATEGORY_FILTER_OPTIONS,
  TIER_OPTIONS,
  bedLevelAt,
  bedLevelIndex,
  bedRangeLabel,
  type CategoryFilter,
  type TierKey,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { INK_0, INK_5, INK_20, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

/**
 * Page-top bed-range × tier filter — dual-thumb range over 1…6+,
 * premium/basic as an independent toggle. Optional category selector
 * (supply-scoped only). Discrete detents only; label tracks thumb indices.
 */
export function TypeFilterBar({
  value,
  onChange,
  note,
  category,
  onCategoryChange,
  showCategory = false,
}: {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
  note?: string;
  category?: CategoryFilter;
  onCategoryChange?: (next: CategoryFilter) => void;
  showCategory?: boolean;
}) {
  const minIdx = Math.min(bedLevelIndex(value.bedMin), bedLevelIndex(value.bedMax));
  const maxIdx = Math.max(bedLevelIndex(value.bedMin), bedLevelIndex(value.bedMax));
  const maxPos = BED_LEVELS.length - 1;
  const [activeThumb, setActiveThumb] = useState<"min" | "max" | null>(null);
  const dragging = useRef<"min" | "max" | null>(null);

  const setRange = (nextMinIdx: number, nextMaxIdx: number) => {
    const lo = Math.max(0, Math.min(maxPos, Math.round(nextMinIdx)));
    const hi = Math.max(0, Math.min(maxPos, Math.round(nextMaxIdx)));
    const a = Math.min(lo, hi);
    const b = Math.max(lo, hi);
    onChange({ ...value, bedMin: bedLevelAt(a), bedMax: bedLevelAt(b) });
  };

  return (
    <div
      className="mb-4 border px-3 py-3 sm:px-4"
      style={{ borderColor: INK_20, background: INK_5 }}
      data-type-filter=""
      data-bed-min={BED_LEVELS[minIdx]}
      data-bed-max={BED_LEVELS[maxIdx]}
      data-category={category ?? "all"}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:gap-8">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <span
              className="text-[10px] uppercase tracking-[0.15em]"
              style={{ color: INK_60 }}
            >
              Bedrooms
            </span>
            <span
              className="font-mono text-[11px] tabular-nums"
              style={{ color: INK_80 }}
              data-bed-label=""
            >
              {bedRangeLabel({ ...value, bedMin: bedLevelAt(minIdx), bedMax: bedLevelAt(maxIdx) })}
            </span>
          </div>

          <div className="relative h-6" data-bed-slider="">
            {/* Track */}
            <div
              className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
              style={{ background: INK_20 }}
            />
            {/* Active range fill — positions from discrete indices only */}
            <div
              className="absolute top-1/2 h-[2px] -translate-y-1/2"
              style={{
                left: `${(minIdx / maxPos) * 100}%`,
                width: `${((maxIdx - minIdx) / maxPos) * 100}%`,
                background: INK_100,
              }}
            />
            {/* Detent ticks */}
            {BED_LEVELS.map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 h-2 w-px -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(i / maxPos) * 100}%`,
                  background: i >= minIdx && i <= maxIdx ? INK_100 : INK_40,
                }}
                aria-hidden
              />
            ))}
            <input
              type="range"
              min={0}
              max={maxPos}
              step={1}
              value={minIdx}
              aria-label="Bedroom range minimum"
              data-bed-min-slider=""
              onPointerDown={() => {
                dragging.current = "min";
                setActiveThumb("min");
              }}
              onPointerUp={() => {
                dragging.current = null;
                setActiveThumb(null);
              }}
              onChange={(e) => {
                const next = Math.round(Number(e.target.value));
                setRange(next, Math.max(next, maxIdx));
              }}
              className="bed-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{
                zIndex:
                  activeThumb === "min" || dragging.current === "min"
                    ? 5
                    : minIdx === maxIdx
                      ? 3
                      : 2,
              }}
            />
            <input
              type="range"
              min={0}
              max={maxPos}
              step={1}
              value={maxIdx}
              aria-label="Bedroom range maximum"
              data-bed-max-slider=""
              onPointerDown={() => {
                dragging.current = "max";
                setActiveThumb("max");
              }}
              onPointerUp={() => {
                dragging.current = null;
                setActiveThumb(null);
              }}
              onChange={(e) => {
                const next = Math.round(Number(e.target.value));
                setRange(Math.min(next, minIdx), next);
              }}
              className="bed-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{
                zIndex:
                  activeThumb === "max" || dragging.current === "max"
                    ? 5
                    : 4,
              }}
            />
          </div>

          <div
            className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.08em]"
            style={{ color: INK_40 }}
          >
            <button
              type="button"
              className="px-0.5 hover:underline"
              style={{
                color: minIdx === 0 && maxIdx === maxPos ? INK_100 : INK_40,
              }}
              aria-pressed={minIdx === 0 && maxIdx === maxPos}
              data-bed-chip="all"
              onClick={() => setRange(0, maxPos)}
            >
              All
            </button>
            {BED_LEVELS.map((level) => {
              const idx = bedLevelIndex(level);
              const inRange = idx >= minIdx && idx <= maxIdx;
              const single = minIdx === maxIdx && minIdx === idx;
              return (
                <button
                  key={level}
                  type="button"
                  className="px-0.5 hover:underline"
                  style={{ color: single || inRange ? INK_100 : INK_40 }}
                  aria-pressed={single}
                  data-bed-chip={level}
                  onClick={() => setRange(idx, idx)}
                >
                  {BED_LEVEL_LABELS[level]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="shrink-0">
          <span
            className="mb-2 block text-[10px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            Ad tier
          </span>
          <div className="flex flex-wrap items-center gap-2" data-tier-toggle="">
            {TIER_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                aria-pressed={value.tier === opt.key}
                data-tier-chip={opt.key}
                onClick={() => onChange({ ...value, tier: opt.key as TierKey })}
                className="border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em]"
                style={{
                  borderColor: value.tier === opt.key ? INK_100 : INK_20,
                  background: value.tier === opt.key ? INK_100 : INK_0,
                  color: value.tier === opt.key ? INK_0 : INK_60,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {showCategory && onCategoryChange && (
          <div className="min-w-0 shrink-0 lg:max-w-[220px]" data-category-filter="">
            <span
              className="mb-2 block text-[10px] uppercase tracking-[0.15em]"
              style={{ color: INK_60 }}
            >
              Type
            </span>
            <select
              value={category ?? "all"}
              aria-label="Property type"
              data-category-select=""
              onChange={(e) => onCategoryChange(e.target.value as CategoryFilter)}
              className="w-full border bg-transparent px-2.5 py-1.5 text-[11px] uppercase tracking-[0.08em]"
              style={{ borderColor: INK_20, color: INK_100 }}
            >
              {CATEGORY_FILTER_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[9px] uppercase tracking-[0.08em]" style={{ color: INK_40 }}>
              Supply only
            </p>
          </div>
        )}
      </div>
      {note && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          {note}
        </p>
      )}
    </div>
  );
}
