"use client";

import { useId, useState, type ReactNode } from "react";
import { INK_0, INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";
import { Sparkline, type SparkPoint } from "./charts/Sparkline";
import { DeltaChip } from "./DeltaChip";
import type { DeltaReading } from "@/lib/dash/deltas";
import { MiniTable } from "./MetricCard";

export type ExpandableStatItem = {
  label: string;
  value: string;
  sub?: string;
  /** Native title tooltip on the label (e.g. movement rank definition). */
  tooltip?: string;
  delta?: DeltaReading | null;
  series?: SparkPoint[];
  /** Extra expander content (e.g. full area rank table). */
  expanderExtra?: ReactNode;
};

export function ExpandableStatStrip({ items }: { items: ExpandableStatItem[] }) {
  return (
    <div
      className="mb-8 grid gap-px border-y"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 132px), 1fr))`,
        borderColor: INK_100,
        backgroundColor: INK_20,
      }}
      data-stat-strip=""
    >
      {items.map((item) => (
        <ExpandableStatCell key={item.label} item={item} />
      ))}
    </div>
  );
}

function ExpandableStatCell({ item }: { item: ExpandableStatItem }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const recent = item.series?.slice(-6) ?? [];

  return (
    <div className="relative min-w-0" style={{ backgroundColor: INK_0 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailId}
        className="w-full px-4 pb-3.5 pt-5 text-left sm:px-6"
      >
        <div className="mb-1.5 flex items-start justify-between gap-2">
          <span
            className="text-[10px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
            title={item.tooltip}
          >
            {item.label}
          </span>
          <span
            className="shrink-0 text-[12px] font-bold leading-none"
            style={{ color: open ? INK_100 : INK_40 }}
          >
            {open ? "−" : "+"}
          </span>
        </div>
        <div className="truncate text-[28px] font-semibold tabular-nums leading-tight">
          {item.value}
        </div>
        {item.sub && (
          <div className="mt-1 text-[11px]" style={{ color: INK_60 }}>
            {item.sub}
          </div>
        )}
        {item.delta !== undefined && (
          <div className="mt-2">
            <DeltaChip delta={item.delta} />
          </div>
        )}
      </button>

      {open && (
        <div
          id={detailId}
          className="space-y-3 border-t px-4 pb-4 pt-3 sm:px-6"
          style={{ borderColor: INK_20 }}
        >
          {recent.length > 0 && (
            <div>
              <p
                className="mb-1 text-[10px] uppercase tracking-[0.1em]"
                style={{ color: INK_60 }}
              >
                6-week trend
              </p>
              <Sparkline points={recent} />
              <MiniTable
                cols={recent.map((p) => p.week.slice(5))}
                rows={[
                  recent.map((p) =>
                    p.value == null
                      ? null
                      : Number.isInteger(p.value)
                        ? p.value
                        : Number(p.value).toFixed(1),
                  ),
                ]}
              />
            </div>
          )}
          {item.expanderExtra}
        </div>
      )}
    </div>
  );
}
