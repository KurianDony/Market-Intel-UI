import { INK_0, INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import type { Confidence } from "@/lib/types/dash-phase3";

/**
 * Coverage gate from `dash_suburb_coverage.confidence`
 * (RED <3 listings · AMBER <8 or <4 of the trailing 4 weeks · else GREEN).
 * Rendered in ink weights rather than traffic-light colour to hold the theme.
 */
export function ConfidenceBadge({
  confidence,
  sampleN,
  weeksPresent,
  compact,
}: {
  confidence: Confidence | null;
  sampleN?: number | null;
  weeksPresent?: number | null;
  compact?: boolean;
}) {
  const level = confidence ?? "RED";
  const filled = level === "GREEN";
  const dim = level === "RED";

  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <span
        className="border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{
          borderColor: dim ? INK_40 : INK_100,
          background: filled ? INK_100 : "transparent",
          color: filled ? INK_0 : dim ? INK_40 : INK_100,
        }}
      >
        {level}
      </span>
      {!compact && (
        <span className="text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
          n={sampleN ?? 0}
          {weeksPresent != null ? ` · ${weeksPresent}/4 wks` : ""}
        </span>
      )}
    </span>
  );
}

/** Area equivalent — captured vs capable suburbs rather than listing volume. */
export function CoverageBadge({
  captured,
  capable,
  label,
}: {
  captured: number | null;
  capable: number | null;
  label: string;
}) {
  const pct = capable && capable > 0 && captured != null ? (100 * captured) / capable : null;

  return (
    <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
      <span
        className="border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
        style={{ borderColor: INK_80, color: INK_100 }}
      >
        {label} {captured ?? 0}/{capable ?? 0}
      </span>
      {pct != null && (
        <span className="text-[10px] tabular-nums" style={{ color: INK_60 }}>
          {pct.toFixed(0)}%
        </span>
      )}
    </span>
  );
}
