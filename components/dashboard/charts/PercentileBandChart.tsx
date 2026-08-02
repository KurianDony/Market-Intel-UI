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
import { INK_10, INK_20, INK_40, INK_100 } from "@/lib/palette/v2";
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

const BANDS = [
  { key: "b20", name: "≤ p20≈p10", fill: "#2a2a2a" },
  { key: "b40", name: "p20–p40≈p25", fill: "#444444" },
  { key: "b60", name: "p40–p60≈p50", fill: "#666666" },
  { key: "b80", name: "p60–p80≈p75", fill: "#999999" },
  { key: "b100", name: "p80–p100≈p90", fill: "#cccccc" },
] as const;

/**
 * Stacked band chart — gradient greys for percentile slices over time.
 * Hover dims non-hovered bands; if hover feels janky we can drop interaction.
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
      b20: p10,
      b40: Math.max(0, p25 - p10),
      b60: Math.max(0, p50 - p25),
      b80: Math.max(0, p75 - p50),
      b100: Math.max(0, p90 - p75),
    };
  });

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
          formatter={(v: number, name: string) => [`$${Math.round(v)}`, name]}
        />
        <Legend {...CHART_LEGEND} />
        {BANDS.map((b) => {
          const dimmed = hoverKey != null && hoverKey !== b.key;
          return (
            <Area
              key={b.key}
              type="linear"
              dataKey={b.key}
              name={b.name}
              stackId="bands"
              fill={b.fill}
              stroke={dimmed ? INK_20 : INK_40}
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
