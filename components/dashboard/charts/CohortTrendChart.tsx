"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_40, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_DEFAULT } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

export type CohortWeekPoint = {
  week: string;
  median: number | null;
  p25: number | null;
  p75: number | null;
};

/** Cohort price trend — median line with p25–p75 band. */
export function CohortTrendChart({
  points,
  gapWeeks = [],
  height = CHART_HEIGHT_DEFAULT,
}: {
  points: CohortWeekPoint[];
  gapWeeks?: string[];
  height?: number;
}) {
  if (points.length === 0) return <EmptyChart height={height} message="No cohort rows for this filter." />;

  const data = points.map((p) => {
    if (p.median == null || p.p25 == null || p.p75 == null) {
      return {
        week: p.week,
        tick: formatWeekTick(p.week),
        median: null,
        bandBase: null,
        bandSpan: null,
      };
    }
    return {
      week: p.week,
      tick: formatWeekTick(p.week),
      median: p.median,
      bandBase: p.p25,
      bandSpan: Math.max(0, p.p75 - p.p25),
    };
  });

  const hasAny = data.some((d) => d.median != null);
  if (!hasAny) return <EmptyChart height={height} message="No cohort prices for this filter." />;

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
        <YAxis
          {...CHART_AXIS}
          width={52}
          tickFormatter={(v: number) => `$${v}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          {...CHART_TOOLTIP}
          labelFormatter={(_, payload) => {
            const week = payload?.[0]?.payload?.week as string | undefined;
            return week ? formatWeekLong(week) : "";
          }}
          formatter={(v: number, name: string) => [`$${Math.round(v)}`, name]}
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
          name="p25–p75"
          stackId="band"
          fill={INK_40}
          fillOpacity={0.4}
          stroke="none"
          connectNulls={false}
          isAnimationActive={false}
        />
        <Line
          type="linear"
          dataKey="median"
          name="Median"
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
