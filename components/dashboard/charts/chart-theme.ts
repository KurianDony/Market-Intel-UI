import { INK_0, INK_10, INK_20, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

/**
 * Recharts series colours — literal hex for SVG fill/stroke attrs only.
 * Do not use Tailwind classes on Bar/Line/Area/Pie; production + SVG won't pick them up.
 */
export const CHART_BAR_FILL = INK_100;
export const CHART_LINE_PRIMARY = INK_100;
export const CHART_LINE_SECONDARY = INK_60;
export const CHART_AREA_BAND_FILL = INK_60;
export const CHART_PIE_STROKE = INK_0;

export const chartBarStyle = { fill: CHART_BAR_FILL } as const;
export const chartLinePrimaryStyle = { stroke: CHART_LINE_PRIMARY } as const;
export const chartLineSecondaryStyle = { stroke: CHART_LINE_SECONDARY } as const;
export const chartAreaBandStyle = { fill: CHART_AREA_BAND_FILL } as const;

export const CHART_AXIS = {
  stroke: INK_20,
  tick: { fill: INK_60, fontSize: 11 },
  tickLine: { stroke: INK_20 },
};

export const CHART_GRID = { stroke: INK_10, strokeDasharray: undefined };

export const CHART_TOOLTIP = {
  contentStyle: {
    background: "#000000",
    border: `1px solid ${INK_100}`,
    borderRadius: 0,
    fontSize: 11,
  },
  labelStyle: { color: INK_100 },
  itemStyle: { color: INK_80 },
};

export const CHART_LEGEND = {
  wrapperStyle: { fontSize: 11, color: INK_80 },
};
