/**
 * Strict WoW with honest prev-obs fallback — contract §0.1.
 */

import { formatWeekShort } from "@/lib/dash/iso-week";
import { formatCurrency } from "@/lib/dash/format";

export type DeltaReading = {
  value: number;
  /** Strict week-on-week when the −7d row exists. */
  strict: boolean;
  /** When not strict: prior observation gap in weeks. */
  gapWeeks: number | null;
  /** When not strict: the basis week date. */
  basisWeek: string | null;
  label: string;
};

export function resolveDelta(opts: {
  wow: number | null | undefined;
  deltaVsPrevObs?: number | null;
  prevObsGapWeeks?: number | null;
  prevObsWeek?: string | null;
  currency?: boolean;
}): DeltaReading | null {
  const { wow, deltaVsPrevObs, prevObsGapWeeks, prevObsWeek, currency } = opts;

  if (wow != null) {
    return {
      value: Number(wow),
      strict: true,
      gapWeeks: 1,
      basisWeek: null,
      label: formatDeltaLabel(Number(wow), { currency, basis: "vs last week" }),
    };
  }

  if (deltaVsPrevObs != null) {
    const gap = prevObsGapWeeks ?? null;
    const basis =
      gap != null && gap > 1
        ? `vs ${gap}w ago${prevObsWeek ? ` (${formatWeekShort(prevObsWeek)})` : ""}`
        : prevObsWeek
          ? `vs ${formatWeekShort(prevObsWeek)}`
          : "vs prior reading";
    return {
      value: Number(deltaVsPrevObs),
      strict: false,
      gapWeeks: gap,
      basisWeek: prevObsWeek ?? null,
      label: formatDeltaLabel(Number(deltaVsPrevObs), { currency, basis }),
    };
  }

  return null;
}

/** Client-side exact-week delta from an aligned series (for price_stats with no wow cols). */
export function seriesDelta(
  points: { week: string; value: number | null }[],
  selectedWeek: string,
  weeksBack: number,
): DeltaReading | null {
  const byWeek = new Map(points.map((p) => [p.week, p.value]));
  const cur = byWeek.get(selectedWeek);
  if (cur == null) return null;

  const targetMs = Date.parse(`${selectedWeek}T00:00:00Z`) - weeksBack * 7 * 24 * 60 * 60 * 1000;
  const target = new Date(targetMs).toISOString().slice(0, 10);
  const prev = byWeek.get(target);
  if (prev == null) {
    // Honest fallback: walk back to the previous observed point within the gap window.
    const earlier = points
      .filter((p) => p.week < selectedWeek && p.value != null)
      .sort((a, b) => (a.week < b.week ? 1 : -1));
    const obs = earlier[0];
    if (!obs || obs.value == null) return null;
    const gap = Math.round(
      (Date.parse(`${selectedWeek}T00:00:00Z`) - Date.parse(`${obs.week}T00:00:00Z`)) /
        (7 * 24 * 60 * 60 * 1000),
    );
    if (gap !== weeksBack) {
      return {
        value: cur - obs.value,
        strict: false,
        gapWeeks: gap,
        basisWeek: obs.week,
        label: formatDeltaLabel(cur - obs.value, {
          currency: true,
          basis: `vs ${gap}w ago (${formatWeekShort(obs.week)})`,
        }),
      };
    }
    return null;
  }

  const basis = weeksBack === 1 ? "vs last week" : `vs ${weeksBack}w ago`;
  return {
    value: cur - prev,
    strict: true,
    gapWeeks: weeksBack,
    basisWeek: target,
    label: formatDeltaLabel(cur - prev, { currency: true, basis }),
  };
}

function formatDeltaLabel(
  value: number,
  opts: { currency?: boolean; basis: string },
): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  const abs = Math.abs(value);
  const body = opts.currency
    ? `${sign}${formatCurrency(abs)}`
    : `${sign}${abs.toLocaleString("en-AU", { maximumFractionDigits: 1 })}`;
  return `${body} ${opts.basis}`;
}

export function deltaDirection(value: number): "up" | "down" | "flat" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "flat";
}
