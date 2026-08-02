"use client";

import {
  Area,
  ComposedChart,
  CartesianGrid,
  Line,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_40, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { RATIO_BAND_HIGH, RATIO_BAND_LOW } from "@/lib/dash/metrics";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_DEFAULT } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

/**
 * Forex-style high-low band for the G1 demand ratio — upper/lower bounds per
 * week from the contract band [r−0.5, r+0.4], with the point ratio as a line.
 */
export function DemandRatioBandChart({
  axis,
  values,
  gapWeeks = [],
  height = CHART_HEIGHT_DEFAULT,
}: {
  axis: string[];
  values: (number | null)[];
  gapWeeks?: string[];
  height?: number;
}) {
  if (axis.length === 0) return <EmptyChart height={height} />;

  const data = axis.map((week, i) => {
    const r = values[i];
    if (r == null) return { week, tick: formatWeekTick(week), lo: null, hi: null, mid: null };
    return {
      week,
      tick: formatWeekTick(week),
      lo: r + RATIO_BAND_LOW,
      hi: r + RATIO_BAND_HIGH,
      mid: r,
      // stacked band trick: base + span
      bandBase: r + RATIO_BAND_LOW,
      bandSpan: RATIO_BAND_HIGH - RATIO_BAND_LOW,
    };
  });

  return (
    <ChartViewport height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
        <YAxis {...CHART_AXIS} width={44} domain={["auto", "auto"]} />
        <Tooltip
          {...CHART_TOOLTIP}
          labelFormatter={(_, payload) => {
            const week = payload?.[0]?.payload?.week as string | undefined;
            return week ? formatWeekLong(week) : "";
          }}
          formatter={(v: number, name: string) => [Number(v).toFixed(2), name]}
        />
        <Area
          type="linear"
          dataKey="bandBase"
          stackId="band"
          fill="transparent"
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
          legendType="none"
        />
        <Area
          type="linear"
          dataKey="bandSpan"
          name="Ratio range"
          stackId="band"
          fill={INK_40}
          fillOpacity={0.45}
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="mid"
          name="Demand ratio"
          stroke={INK_100}
          strokeWidth={2}
          dot={{ r: 2, fill: INK_100 }}
          connectNulls={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ChartViewport>
  );
}
