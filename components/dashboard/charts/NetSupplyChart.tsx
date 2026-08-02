"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { CHART_AXIS, CHART_GRID, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_DEFAULT } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";
import { formatSignedNumber } from "@/lib/dash/metrics";

export type NetSupplyPoint = {
  week: string;
  net: number | null;
};

/** Weekly net supply — positive above axis, negative below; click reveals delta. */
export function NetSupplyChart({
  points,
  gapWeeks = [],
  height = CHART_HEIGHT_DEFAULT,
}: {
  points: NetSupplyPoint[];
  gapWeeks?: string[];
  height?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (points.length === 0) return <EmptyChart height={height} />;

  const data = points.map((p) => ({
    week: p.week,
    tick: formatWeekTick(p.week),
    net: p.net,
  }));

  const selectedPoint = selected ? data.find((d) => d.week === selected) : null;

  return (
    <div>
      <ChartViewport height={height}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
          <ReferenceLine y={0} stroke={INK_60} />
          <XAxis dataKey="tick" {...CHART_AXIS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...CHART_AXIS} width={44} />
          <Tooltip
            {...CHART_TOOLTIP}
            labelFormatter={(_, payload) => {
              const week = payload?.[0]?.payload?.week as string | undefined;
              return week ? formatWeekLong(week) : "";
            }}
            formatter={(v: number) => [formatSignedNumber(v), "net"]}
          />
          <Bar
            dataKey="net"
            name="Net supply"
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={d.week}
                fill={
                  selected === d.week
                    ? INK_100
                    : (d.net ?? 0) >= 0
                      ? INK_80
                      : INK_40
                }
                cursor="pointer"
              />
            ))}
          </Bar>
        </BarChart>
      </ChartViewport>
      {selectedPoint && (
        <p
          className="mt-2 border px-3 py-2 font-mono text-[11px] tabular-nums"
          style={{ borderColor: INK_40, color: INK_80 }}
          data-net-detail=""
        >
          {formatWeekLong(selectedPoint.week)} · net {formatSignedNumber(selectedPoint.net)}
        </p>
      )}
    </div>
  );
}
