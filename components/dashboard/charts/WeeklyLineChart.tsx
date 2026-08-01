"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_DEFAULT } from "./ChartViewport";

export type WeeklySeries = {
  key: string;
  name: string;
  /** Null entries break the line — collection gaps are never interpolated. */
  values: (number | null)[];
  emphasis?: "primary" | "secondary" | "faint";
  dashed?: boolean;
};

const STROKE: Record<NonNullable<WeeklySeries["emphasis"]>, string> = {
  primary: INK_100,
  secondary: INK_80,
  faint: INK_40,
};

/**
 * Weekly trend over a continuous Monday axis. Gap weeks arrive as `null` and
 * are drawn as breaks plus a shaded band, never as zeros.
 */
export function WeeklyLineChart({
  axis,
  series,
  gapWeeks = [],
  valuePrefix = "",
  height = CHART_HEIGHT_DEFAULT,
}: {
  axis: string[];
  series: WeeklySeries[];
  gapWeeks?: string[];
  valuePrefix?: string;
  height?: number;
}) {
  if (axis.length === 0 || series.length === 0) {
    return <EmptyChart height={height} />;
  }

  const data = axis.map((week, i) => {
    const point: Record<string, string | number | null> = { week, tick: formatWeekTick(week) };
    for (const s of series) point[s.key] = s.values[i] ?? null;
    return point;
  });

  return (
    <ChartViewport height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          tickFormatter={(v: number) => `${valuePrefix}${v}`}
          domain={["auto", "auto"]}
        />
        <Tooltip
          {...CHART_TOOLTIP}
          labelFormatter={(_, payload) => {
            const week = payload?.[0]?.payload?.week as string | undefined;
            return week ? formatWeekLong(week) : "";
          }}
          formatter={(v: number, name: string) => [`${valuePrefix}${v}`, name]}
        />
        {series.length > 1 && <Legend {...CHART_LEGEND} />}
        {series.map((s) => {
          const stroke = STROKE[s.emphasis ?? "primary"];
          return (
            <Line
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.name}
              stroke={stroke}
              style={{ stroke }}
              strokeWidth={s.emphasis === "primary" ? 2 : 1.5}
              strokeDasharray={s.dashed ? "3 3" : undefined}
              dot={{ r: 2, fill: stroke, stroke }}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          );
        })}
      </LineChart>
    </ChartViewport>
  );
}

export function EmptyChart({
  height = CHART_HEIGHT_DEFAULT,
  message = "No weekly data for this selection.",
}: {
  height?: number;
  message?: string;
}) {
  return (
    <div
      className="flex items-center justify-center text-center text-[12px]"
      style={{ height, color: INK_60 }}
    >
      {message}
    </div>
  );
}
