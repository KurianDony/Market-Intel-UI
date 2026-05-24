import { INK_10, INK_20, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";

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
