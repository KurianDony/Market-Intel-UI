"use client";

import { useEffect, useState, type ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

/** Match DashboardCard chart viewport heights (explicit px — not %). */
export const CHART_HEIGHT_DEFAULT = 240;
export const CHART_HEIGHT_COMPACT = 120;
export const CHART_HEIGHT_TALL = 320;

type ChartViewportProps = {
  height?: number;
  children: ReactElement;
};

/**
 * Gates Recharts until after mount so ResponsiveContainer measures a real box.
 * Uses numeric height (not 100%) to avoid 0×0 layout under App Router hydration.
 */
export function ChartViewport({
  height = CHART_HEIGHT_DEFAULT,
  children,
}: ChartViewportProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full" style={{ height, minHeight: height }} aria-hidden />;
  }

  return (
    <div className="w-full" style={{ height, minHeight: height }}>
      <ResponsiveContainer width="100%" height={height} debounce={1}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}
