"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceArea,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { INK_10, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { CHART_AXIS, CHART_GRID, CHART_LEGEND, CHART_TOOLTIP } from "./chart-theme";
import { ChartViewport, CHART_HEIGHT_TALL } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

export type CompositionPoint = {
  week: string;
  /** Carried old stock = stock − new − repriced (floored at 0). */
  carried: number | null;
  repriced: number | null;
  newCount: number | null;
  gone: number | null;
};

/**
 * Weekly composition: carried (bottom) + repriced + new above axis;
 * disappeared as a negative bar below.
 */
export function CompositionChart({
  points,
  gapWeeks = [],
  height = CHART_HEIGHT_TALL,
}: {
  points: CompositionPoint[];
  gapWeeks?: string[];
  height?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  if (points.length === 0) return <EmptyChart height={height} />;

  const data = points.map((p) => ({
    week: p.week,
    tick: formatWeekTick(p.week),
    carried: p.carried,
    repriced: p.repriced,
    newCount: p.newCount,
    gone: p.gone == null ? null : -Math.abs(p.gone),
    goneAbs: p.gone,
  }));

  const selectedPoint = selected ? data.find((d) => d.week === selected) : null;

  return (
    <div>
      <ChartViewport height={height}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          stackOffset="sign"
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
          <ReferenceLine y={0} stroke={INK_60} />
          <XAxis dataKey="tick" {...CHART_AXIS} interval="preserveStartEnd" minTickGap={12} />
          <YAxis {...CHART_AXIS} width={44} />
          <Tooltip
            {...CHART_TOOLTIP}
            labelFormatter={(_, payload) => {
              const week = payload?.[0]?.payload?.week as string | undefined;
              return week ? formatWeekLong(week) : "";
            }}
            formatter={(v: number, name: string) => [Math.abs(v), name]}
          />
          <Legend {...CHART_LEGEND} />
          <Bar
            dataKey="carried"
            name="Carried"
            stackId="comp"
            fill="#333333"
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`c-${d.week}`}
                fill={selected === d.week ? INK_100 : "#333333"}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="repriced"
            name="Repriced"
            stackId="comp"
            fill="#666666"
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`r-${d.week}`}
                fill={selected === d.week ? INK_80 : "#666666"}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="newCount"
            name="New"
            stackId="comp"
            fill={INK_100}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`n-${d.week}`}
                fill={selected === d.week ? INK_100 : INK_80}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="gone"
            name="Disappeared"
            stackId="comp"
            fill="#1a1a1a"
            stroke={INK_40}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`g-${d.week}`}
                fill={selected === d.week ? "#444444" : "#1a1a1a"}
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
          data-composition-detail=""
        >
          {formatWeekLong(selectedPoint.week)} · carried {selectedPoint.carried ?? "—"} ·
          repriced {selectedPoint.repriced ?? "—"} · new {selectedPoint.newCount ?? "—"} ·
          gone {selectedPoint.goneAbs ?? "—"}
        </p>
      )}
    </div>
  );
}
