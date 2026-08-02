"use client";

import {
  BEDROOM_OPTIONS,
  TIER_OPTIONS,
  type BedroomKey,
  type TierKey,
  type TypeFilter,
} from "@/lib/dash/type-filter";
import { INK_0, INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";

export function TypeFilterBar({
  value,
  onChange,
  note,
}: {
  value: TypeFilter;
  onChange: (next: TypeFilter) => void;
  note?: string;
}) {
  return (
    <div className="mb-4 space-y-2" data-type-filter="">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: INK_60 }}
        >
          Bedrooms
        </span>
        {BEDROOM_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.key}
            active={value.bedrooms === opt.key}
            label={opt.label}
            onClick={() =>
              onChange({
                bedrooms: opt.key as BedroomKey,
                tier: opt.key === "all" ? value.tier : "all",
              })
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="text-[10px] uppercase tracking-[0.15em]"
          style={{ color: INK_60 }}
        >
          Ad tier
        </span>
        {TIER_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.key}
            active={value.tier === opt.key}
            label={opt.label}
            disabled={value.bedrooms !== "all" && opt.key !== "all"}
            title={
              value.bedrooms !== "all" && opt.key !== "all"
                ? "Ad tier applies when bedrooms = all (no bedroom×tier cross-product)"
                : undefined
            }
            onClick={() => {
              if (value.bedrooms !== "all" && opt.key !== "all") return;
              onChange({ ...value, tier: opt.key as TierKey });
            }}
          />
        ))}
      </div>
      {note && (
        <p className="text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
          {note}
        </p>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  disabled,
  title,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={active}
      className="border px-2 py-1 text-[11px] uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        borderColor: active ? INK_100 : INK_20,
        background: active ? INK_100 : INK_0,
        color: active ? INK_0 : INK_60,
      }}
    >
      {label}
    </button>
  );
}
