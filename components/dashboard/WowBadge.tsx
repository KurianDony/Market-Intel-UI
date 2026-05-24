import { INK_60, INK_80, INK_100 } from "@/lib/palette/v2";
import { formatWowDelta } from "@/lib/dash/format";

export function WowBadge({
  value,
  currency,
}: {
  value: number | null | undefined;
  currency?: boolean;
}) {
  const wow = formatWowDelta(value, { currency });
  if (wow.direction === "hidden") return null;

  const prefix =
    wow.direction === "up" ? "↑ " : wow.direction === "down" ? "↓ " : "→ ";

  return (
    <span
      className="absolute bottom-1.5 right-2.5 font-mono text-[10px] tracking-wide"
      style={{ color: wow.direction === "flat" ? INK_60 : INK_80 }}
    >
      <span style={{ color: wow.direction === "flat" ? INK_60 : INK_100, fontWeight: 700 }}>
        {prefix}
      </span>
      {wow.text.replace(/^[↑↓→]\s/, "")}
    </span>
  );
}
