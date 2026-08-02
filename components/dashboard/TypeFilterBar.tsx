"use client";

import {
  BED_LEVELS,
  BED_LEVEL_LABELS,
  TIER_OPTIONS,
  bedLevelAt,
  bedLevelIndex,
  bedRangeLabel,
  type BedLevel,
  type TierKey,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { INK_0, INK_5, INK_20, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

/**
 * Page-top bed-range × tier filter — dual-thumb range over 1…6+,
 * premium/basic as an independent toggle. Both combine freely via `_x` tables.
 * UI never exposes bare `6` (legacy scale key).
 */
export function TypeFilterBar({
  value,
  onChange,
  note,
}: {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
  note?: string;
}) {
  const minIdx = Math.min(bedLevelIndex(value.bedMin), bedLevelIndex(value.bedMax));
  const maxIdx = Math.max(bedLevelIndex(value.bedMin), bedLevelIndex(value.bedMax));
  const maxPos = BED_LEVELS.length - 1;

  const setRange = (nextMin: BedLevel, nextMax: BedLevel) => {
    const lo = Math.min(bedLevelIndex(nextMin), bedLevelIndex(nextMax));
    const hi = Math.max(bedLevelIndex(nextMin), bedLevelIndex(nextMax));
    onChange({ ...value, bedMin: bedLevelAt(lo), bedMax: bedLevelAt(hi) });
  };

  return (
    <div
      className="mb-4 border px-3 py-3 sm:px-4"
      style={{ borderColor: INK_20, background: INK_5 }}
      data-type-filter=""
      data-bed-min={value.bedMin}
      data-bed-max={value.bedMax}
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
              {bedRangeLabel(value)}
            </span>
          </div>

          <div className="relative h-6" data-bed-slider="">
            {/* Track */}
            <div
              className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2"
              style={{ background: INK_20 }}
            />
            {/* Active range fill */}
            <div
              className="absolute top-1/2 h-[2px] -translate-y-1/2"
              style={{
                left: `${(minIdx / maxPos) * 100}%`,
                width: `${((maxIdx - minIdx) / maxPos) * 100}%`,
                background: INK_100,
              }}
            />
            <input
              type="range"
              min={0}
              max={maxPos}
              step={1}
              value={minIdx}
              aria-label="Bedroom range minimum"
              data-bed-min-slider=""
              onChange={(e) => {
                const next = Number(e.target.value);
                setRange(bedLevelAt(next), bedLevelAt(Math.max(next, maxIdx)));
              }}
              className="bed-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: minIdx >= maxIdx - 0 ? 3 : 2 }}
            />
            <input
              type="range"
              min={0}
              max={maxPos}
              step={1}
              value={maxIdx}
              aria-label="Bedroom range maximum"
              data-bed-max-slider=""
              onChange={(e) => {
                const next = Number(e.target.value);
                setRange(bedLevelAt(Math.min(next, minIdx)), bedLevelAt(next));
              }}
              className="bed-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: 4 }}
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
              onClick={() => setRange("1", "6plus")}
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
                  onClick={() => setRange(level, level)}
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
      </div>
      {note && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          {note}
        </p>
      )}
    </div>
  );
}
