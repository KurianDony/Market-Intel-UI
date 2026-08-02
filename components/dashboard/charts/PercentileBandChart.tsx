"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_20, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_TALL } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

/** Stacked cumulative bands p20→p40→p60→p80→p100 approximated from p10/p25/p50/p75/p90. */
export type PercentileWeek = {
  week: string;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
};

type BandDef = {
  key: "b20" | "b40" | "b60" | "b80" | "b100";
  /** Stack height key — still the delta for rendering. */
  fill: string;
  /** Absolute band label using lo/hi percentile names. */
  labelOf: (lo: number, hi: number) => string;
  loKey: keyof PercentileWeek;
  hiKey: keyof PercentileWeek;
};

const BANDS: BandDef[] = [
  {
    key: "b20",
    fill: "#2a2a2a",
    loKey: "p10",
    hiKey: "p10",
    labelOf: (_lo, hi) => `≤ P20: $${Math.round(hi)}`,
  },
  {
    key: "b40",
    fill: "#444444",
    loKey: "p10",
    hiKey: "p25",
    labelOf: (lo, hi) => `P20–P40: $${Math.round(lo)}–$${Math.round(hi)}`,
  },
  {
    key: "b60",
    fill: "#666666",
    loKey: "p25",
    hiKey: "p50",
    labelOf: (lo, hi) => `P40–P60: $${Math.round(lo)}–$${Math.round(hi)}`,
  },
  {
    key: "b80",
    fill: "#999999",
    loKey: "p50",
    hiKey: "p75",
    labelOf: (lo, hi) => `P60–P80: $${Math.round(lo)}–$${Math.round(hi)}`,
  },
  {
    key: "b100",
    fill: "#cccccc",
    loKey: "p75",
    hiKey: "p90",
    labelOf: (lo, hi) => `P80–P100: $${Math.round(lo)}–$${Math.round(hi)}`,
  },
];

/** Thin white stroke between stacked band segments (Round 3B). */
const BAND_STROKE = "#ffffff";

function absoluteBandLabel(
  key: BandDef["key"],
  row: PercentileWeek,
): string {
  const def = BANDS.find((b) => b.key === key)!;
  const lo = row[def.loKey];
  const hi = row[def.hiKey];
  if (typeof lo !== "number" || typeof hi !== "number") return def.key;
  return def.labelOf(lo, hi);
}

/**
 * Stacked band chart — gradient greys for percentile slices over time.
 * Hover dims non-hovered bands; white separators mark splits.
 * Labels / tooltips show absolute price levels (Round 5), not stack deltas.
 */
export function PercentileBandChart({
  weeks,
  gapWeeks = [],
  height = CHART_HEIGHT_TALL,
}: {
  weeks: PercentileWeek[];
  gapWeeks?: string[];
  height?: number;
}) {
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  if (weeks.length === 0) return <EmptyChart height={height} />;

  // Legend uses the latest week with complete percentiles for absolute labels.
  const legendWeek =
    [...weeks].reverse().find(
      (w) =>
        w.p10 != null &&
        w.p25 != null &&
        w.p50 != null &&
        w.p75 != null &&
        w.p90 != null,
    ) ?? null;

  const data = weeks.map((w) => {
    const p10 = w.p10;
    const p25 = w.p25;
    const p50 = w.p50;
    const p75 = w.p75;
    const p90 = w.p90;
    const missing = p10 == null || p25 == null || p50 == null || p75 == null || p90 == null;
    if (missing) {
      return {
        week: w.week,
        tick: formatWeekTick(w.week),
        p10,
        p25,
        p50,
        p75,
        p90,
        b20: null,
        b40: null,
        b60: null,
        b80: null,
        b100: null,
      };
    }
    return {
      week: w.week,
      tick: formatWeekTick(w.week),
      p10,
      p25,
      p50,
      p75,
      p90,
      // Stack heights remain deltas for correct stacked rendering.
      b20: p10,
      b40: Math.max(0, p25 - p10),
      b60: Math.max(0, p50 - p25),
      b80: Math.max(0, p75 - p50),
      b100: Math.max(0, p90 - p75),
    };
  });

  const legendName = (key: BandDef["key"], fallback: string) => {
    if (!legendWeek) return fallback;
    return absoluteBandLabel(key, legendWeek);
  };

  return (
    <ChartViewport height={height}>
      <AreaChart
        data={data}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        onMouseLeave={() => setHoverKey(null)}
      >
        <CartesianGrid {...CHART_GRID} vertical={false} />
        {gapWeeks.map((week) => (
          <ReferenceArea
            key={week}
            x1={formatWeekTick(week)}
            x2={formatWeekTick(week)}
            fill={INK_10}
            fillOpacity={1}
            ifOverflow="extendDomain"
          />
        ))}
        <XAxis dataKey="tick" {...CHART_AXIS} interval="preserveStartEnd" minTickGap={12} />
        <YAxis
          {...CHART_AXIS}
          width={52}
          tickFormatter={(v: number) => `$${v}`}
          domain={[0, "auto"]}
        />
        <Tooltip
          {...CHART_TOOLTIP}
          labelFormatter={(_, payload) => {
            const week = payload?.[0]?.payload?.week as string | undefined;
            return week ? formatWeekLong(week) : "";
          }}
          formatter={(v, name, item) => {
            const payload = item?.payload as PercentileWeek | undefined;
            const key = item?.dataKey as BandDef["key"] | undefined;
            if (!payload || !key) return [String(v ?? "—"), String(name ?? "")];
            const label = absoluteBandLabel(key, payload);
            const def = BANDS.find((b) => b.key === key)!;
            const lo = payload[def.loKey];
            const hi = payload[def.hiKey];
            const value =
              typeof lo === "number" && typeof hi === "number"
                ? key === "b20"
                  ? `$${Math.round(hi)}`
                  : `$${Math.round(lo)}–$${Math.round(hi)}`
                : "—";
            return [value, label];
          }}
        />
        <Legend {...CHART_LEGEND} />
        {BANDS.map((b) => {
          const dimmed = hoverKey != null && hoverKey !== b.key;
          return (
            <Area
              key={b.key}
              type="linear"
              dataKey={b.key}
              name={legendName(
                b.key,
                b.key === "b20"
                  ? "≤ P20"
                  : b.key === "b40"
                    ? "P20–P40"
                    : b.key === "b60"
                      ? "P40–P60"
                      : b.key === "b80"
                        ? "P60–P80"
                        : "P80–P100",
              )}
              stackId="bands"
              fill={b.fill}
              stroke={dimmed ? INK_20 : BAND_STROKE}
              strokeWidth={1}
              fillOpacity={dimmed ? 0.25 : 1}
              connectNulls={false}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: INK_100 }}
              onMouseEnter={() => setHoverKey(b.key)}
              onMouseLeave={() => setHoverKey(null)}
            />
          );
        })}
      </AreaChart>
    </ChartViewport>
  );
}
