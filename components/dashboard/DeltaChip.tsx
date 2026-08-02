import { INK_40, INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import { deltaDirection, type DeltaReading } from "@/lib/dash/deltas";

export function DeltaChip({
  delta,
  empty = "no prior reading",
}: {
  delta: DeltaReading | null;
  empty?: string;
}) {
  if (!delta) {
    return (
      <span
        className="inline-block border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
        style={{ borderColor: INK_40, color: INK_40 }}
      >
        {empty}
      </span>
    );
  }

  const dir = deltaDirection(delta.value);
  const prefix = dir === "up" ? "↑ " : dir === "down" ? "↓ " : "→ ";
  const color = dir === "flat" ? INK_60 : INK_100;

  return (
    <span
      className="inline-block border px-1.5 py-0.5 font-mono text-[10px] tracking-wide"
      style={{ borderColor: INK_40, color: INK_80 }}
      title={delta.strict ? "Strict week-on-week" : "Vs previous observation (gap week)"}
    >
      <span style={{ color, fontWeight: 700 }}>{prefix}</span>
      {delta.label}
    </span>
  );
}
