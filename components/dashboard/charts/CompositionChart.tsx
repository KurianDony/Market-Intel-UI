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
import { ChartViewport, CHART_HEIGHT_TALL } from "./ChartViewport";
import { EmptyChart } from "./WeeklyLineChart";

export type CompositionPoint = {
  week: string;
  /** Carried old stock — prefer movement.carried_count (v3). */
  carried: number | null;
  repriced: number | null;
  newCount: number | null;
  gone: number | null;
};

const SEG_STROKE = "#ffffff";

const LEGEND = [
  { key: "carried", label: "Carried", fill: "#333333" },
  { key: "repriced", label: "Repriced", fill: "#666666" },
  { key: "newCount", label: "New", fill: INK_80 },
  { key: "gone", label: "Disappeared", fill: "#1a1a1a" },
] as const;

/**
 * Weekly composition: carried (bottom) + repriced + new above axis;
 * disappeared as a negative bar below. White outline separators between
 * stacked segments; legend in its own lighter box (Round 3B).
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
      <div
        className="mb-3 flex flex-wrap gap-3 border px-3 py-2"
        style={{ borderColor: INK_40, background: "#141414" }}
        data-composition-legend=""
      >
        {LEGEND.map((item) => (
          <span
            key={item.key}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.1em]"
            style={{ color: INK_80 }}
          >
            <span
              className="inline-block h-2.5 w-2.5 border"
              style={{ background: item.fill, borderColor: SEG_STROKE }}
            />
            {item.label}
          </span>
        ))}
      </div>

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
          <Bar
            dataKey="carried"
            name="Carried"
            stackId="comp"
            fill="#333333"
            stroke={SEG_STROKE}
            strokeWidth={1}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`c-${d.week}`}
                fill={selected === d.week ? INK_100 : "#333333"}
                stroke={SEG_STROKE}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="repriced"
            name="Repriced"
            stackId="comp"
            fill="#666666"
            stroke={SEG_STROKE}
            strokeWidth={1}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`r-${d.week}`}
                fill={selected === d.week ? INK_80 : "#666666"}
                stroke={SEG_STROKE}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="newCount"
            name="New"
            stackId="comp"
            fill={INK_100}
            stroke={SEG_STROKE}
            strokeWidth={1}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`n-${d.week}`}
                fill={selected === d.week ? INK_100 : INK_80}
                stroke={SEG_STROKE}
                cursor="pointer"
              />
            ))}
          </Bar>
          <Bar
            dataKey="gone"
            name="Disappeared"
            stackId="comp"
            fill="#1a1a1a"
            stroke={SEG_STROKE}
            strokeWidth={1}
            isAnimationActive={false}
            onClick={(d) => setSelected((d as { week?: string }).week ?? null)}
          >
            {data.map((d) => (
              <Cell
                key={`g-${d.week}`}
                fill={selected === d.week ? "#444444" : "#1a1a1a"}
                stroke={SEG_STROKE}
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
