"use client";

import {
  cloneElement,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";

/** Match DashboardCard chart viewport heights (explicit px — not %). */
export const CHART_HEIGHT_DEFAULT = 240;
export const CHART_HEIGHT_COMPACT = 120;
export const CHART_HEIGHT_TALL = 320;

type SizedChartProps = { width?: number; height?: number };

type ChartViewportProps = {
  height?: number;
  children: ReactElement<SizedChartProps>;
};

function readContainerWidth(el: HTMLElement): number {
  const w = el.getBoundingClientRect().width;
  return w > 0 ? Math.floor(w) : 0;
}

/**
 * Measures the chart box with our own ResizeObserver and passes numeric width/height
 * directly to Recharts — avoids ResponsiveContainer's stalled observer under
 * Next App Router + React 19 production builds.
 */
export function ChartViewport({
  height = CHART_HEIGHT_DEFAULT,
  children,
}: ChartViewportProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const applyWidth = () => {
      const next = readContainerWidth(el);
      setWidth((prev) => (prev === next ? prev : next));
    };

    applyWidth();

    const observer = new ResizeObserver(() => {
      applyWidth();
    });
    observer.observe(el);

    const raf1 = requestAnimationFrame(() => {
      applyWidth();
      requestAnimationFrame(applyWidth);
    });

    return () => {
      cancelAnimationFrame(raf1);
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full"
      style={{ height, minHeight: height }}
      data-chart-viewport=""
    >
      {width > 0
        ? cloneElement(children, { width, height })
        : null}
    </div>
  );
}
