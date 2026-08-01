import { INK_20, INK_40, INK_80 } from "@/lib/palette/v2";
import { formatWeekLong } from "@/lib/dash/iso-week";

export type SparkPoint = { week: string; value: number | null };

/**
 * Weekly bar strip. A `null` week is a real collection gap and renders as an
 * empty slot with a hairline base — never a zero-height bar.
 */
export function Sparkline({ points, height = 26 }: { points: SparkPoint[]; height?: number }) {
  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;

  const max = Math.max(...values);
  const base = Math.min(0, ...values);
  const span = max - base || 1;

  return (
    <div className="mt-2 flex items-end gap-[2px]" style={{ height }} aria-hidden>
      {points.map((p) => {
        if (p.value == null) {
          return (
            <span
              key={p.week}
              className="flex-1"
              style={{ height: 1, background: INK_20, alignSelf: "flex-end" }}
              title={`${formatWeekLong(p.week)}: no data`}
            />
          );
        }
        const h = 2 + (height - 2) * ((p.value - base) / span);
        return (
          <span
            key={p.week}
            className="flex-1"
            style={{ height: h, background: INK_80, minHeight: 2 }}
            title={`${formatWeekLong(p.week)}: ${p.value}`}
          />
        );
      })}
    </div>
  );
}

export function SparklineLegend({ points }: { points: SparkPoint[] }) {
  const gaps = points.filter((p) => p.value == null).length;
  if (gaps === 0) return null;
  return (
    <p className="mt-1 text-[9px] uppercase tracking-[0.1em]" style={{ color: INK_40 }}>
      {gaps} gap {gaps === 1 ? "week" : "weeks"} shown as breaks
    </p>
  );
}
