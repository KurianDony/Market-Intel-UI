"use client";

import { cloneElement, type ReactElement } from "react";
import { useMeasuredWidth } from "./useMeasuredWidth";

/** Match DashboardCard chart viewport heights (explicit px — not %). */
export const CHART_HEIGHT_DEFAULT = 240;
export const CHART_HEIGHT_COMPACT = 120;
export const CHART_HEIGHT_TALL = 320;

type SizedChartProps = { width?: number; height?: number };

type ChartViewportProps = {
  height?: number;
  children: ReactElement<SizedChartProps>;
};

/**
 * Measures chart box width via ResizeObserver and passes numeric width/height
 * to Recharts — no ResponsiveContainer (stalled under Next + React 19 prod).
 */
export function ChartViewport({
  height = CHART_HEIGHT_DEFAULT,
  children,
}: ChartViewportProps) {
  const { ref, width } = useMeasuredWidth<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className="w-full"
      style={{ height, minHeight: height }}
      data-chart-viewport=""
    >
      {width > 0 ? (
        cloneElement(children, { key: width, width, height })
      ) : (
        <div
          aria-hidden
          className="w-full"
          style={{ height, minHeight: height }}
          data-chart-placeholder=""
        />
      )}
    </div>
  );
}
