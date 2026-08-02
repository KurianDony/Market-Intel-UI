"use client";

import {
  BEDROOM_OPTIONS,
  TIER_OPTIONS,
  type BedroomKey,
  type TierKey,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { INK_0, INK_5, INK_20, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

/**
 * Page-top bed × tier filter — bedrooms as a continuous slider (All…6+),
 * premium/basic as an independent toggle. Both combine freely via `_x` tables.
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
  const bedIndex = Math.max(
    0,
    BEDROOM_OPTIONS.findIndex((o) => o.key === value.bedrooms),
  );

  return (
    <div
      className="mb-4 border px-3 py-3 sm:px-4"
      style={{ borderColor: INK_20, background: INK_5 }}
      data-type-filter=""
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
              {BEDROOM_OPTIONS[bedIndex]?.label ?? "All"}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={BEDROOM_OPTIONS.length - 1}
            step={1}
            value={bedIndex}
            aria-label="Bedrooms filter"
            data-bed-slider=""
            onChange={(e) => {
              const next = BEDROOM_OPTIONS[Number(e.target.value)]?.key as BedroomKey;
              onChange({ ...value, bedrooms: next });
            }}
            className="w-full accent-white"
          />
          <div
            className="mt-1 flex justify-between text-[10px] uppercase tracking-[0.08em]"
            style={{ color: INK_40 }}
          >
            {BEDROOM_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                className="px-0.5 hover:underline"
                style={{ color: value.bedrooms === opt.key ? INK_100 : INK_40 }}
                aria-pressed={value.bedrooms === opt.key}
                data-bed-chip={opt.key}
                onClick={() => onChange({ ...value, bedrooms: opt.key })}
              >
                {opt.label}
              </button>
            ))}
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
