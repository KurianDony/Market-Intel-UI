import { INK_0, INK_20, INK_60, INK_100 } from "@/lib/palette/v2";
import { WowBadge } from "./WowBadge";

export type StatItem = {
  label: string;
  value: string;
  sub?: string;
  wow?: number | null;
  wowCurrency?: boolean;
};

export function StatStrip({ items }: { items: StatItem[] }) {
  return (
    // gap-px over an INK_20 backdrop draws the cell dividers, so the strip can wrap
    // to two columns on a phone without leaving stranded border segments.
    <div
      className="mb-8 grid gap-px border-y"
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 132px), 1fr))`,
        borderColor: INK_100,
        backgroundColor: INK_20,
      }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="relative min-w-0 px-4 pb-3.5 pt-5 sm:px-6"
          style={{ backgroundColor: INK_0 }}
        >
          <div
            className="mb-1.5 text-[10px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            {item.label}
          </div>
          <div className="truncate text-[28px] font-semibold tabular-nums leading-tight">
            {item.value}
          </div>
          {item.sub && (
            <div className="mt-1 text-[11px]" style={{ color: INK_60 }}>
              {item.sub}
            </div>
          )}
          <WowBadge value={item.wow} currency={item.wowCurrency} />
        </div>
      ))}
    </div>
  );
}
