import Link from "next/link";
import { INK_0, INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick, isSplitFetchWeek } from "@/lib/dash/iso-week";

/**
 * ISO-week selector. One entry per `iso_week` (the split-fetch weeks appear
 * once, not twice); gap weeks are inert markers so the break stays visible.
 */
export function WeekNav({
  basePath,
  axis,
  dataWeeks,
  selectedWeek,
}: {
  basePath: string;
  axis: string[];
  dataWeeks: string[];
  selectedWeek: string;
}) {
  const available = new Set(dataWeeks);
  const index = dataWeeks.indexOf(selectedWeek);
  const prev = index > 0 ? dataWeeks[index - 1] : null;
  const next = index >= 0 && index < dataWeeks.length - 1 ? dataWeeks[index + 1] : null;
  const isLatest = selectedWeek === dataWeeks[dataWeeks.length - 1];

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-y py-3"
      style={{ borderColor: INK_20 }}
    >
      <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
        Week
      </span>
      <StepLink href={prev ? `${basePath}?week=${prev}` : null} label="← Prev" />
      <span className="text-[12px] font-semibold uppercase tracking-[0.1em]">
        w/c {formatWeekLong(selectedWeek)}
      </span>
      <StepLink href={next ? `${basePath}?week=${next}` : null} label="Next →" />
      {isLatest && (
        <span className="text-[10px] uppercase tracking-[0.15em]" style={{ color: INK_60 }}>
          latest
        </span>
      )}

      <div className="flex w-full flex-wrap gap-1 sm:w-auto sm:flex-1 sm:justify-end">
        {axis.map((week) => {
          if (!available.has(week)) {
            return (
              <span
                key={week}
                title={`${formatWeekLong(week)} — no collection this week`}
                className="px-1.5 py-1 text-[10px] tabular-nums line-through"
                style={{ color: INK_40 }}
              >
                {formatWeekTick(week)}
              </span>
            );
          }
          const active = week === selectedWeek;
          return (
            <Link
              key={week}
              href={`${basePath}?week=${week}`}
              title={`${formatWeekLong(week)}${isSplitFetchWeek(week) ? " — split fetch, collapsed to one ISO week" : ""}`}
              className="border px-1.5 py-1 text-[10px] tabular-nums transition-colors hover:border-white"
              style={{
                borderColor: active ? INK_100 : INK_20,
                background: active ? INK_100 : "transparent",
                color: active ? INK_0 : INK_60,
              }}
            >
              {formatWeekTick(week)}
              {isSplitFetchWeek(week) ? "*" : ""}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function StepLink({ href, label }: { href: string | null; label: string }) {
  if (!href) {
    return (
      <span
        className="border px-2 py-1 text-[10px] uppercase tracking-[0.1em]"
        style={{ borderColor: INK_20, color: INK_40 }}
      >
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="border px-2 py-1 text-[10px] uppercase tracking-[0.1em] transition-colors hover:border-white hover:text-white"
      style={{ borderColor: INK_20, color: INK_60 }}
    >
      {label}
    </Link>
  );
}

export function WeekNavFootnote({ gapWeeks }: { gapWeeks: string[] }) {
  return (
    <p className="mb-6 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
      * split-fetch week — two legacy snapshots collapsed to one ISO week
      {gapWeeks.length > 0 && (
        <>
          {" · "}
          {gapWeeks.length} gap {gapWeeks.length === 1 ? "week" : "weeks"} (
          {gapWeeks.map((w) => formatWeekLong(w)).join(", ")}) — no collection, shown as breaks
        </>
      )}
    </p>
  );
}
