import { INK_20, INK_60, INK_100 } from "@/lib/palette/v2";
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
    <div
      className="mb-8 grid border-y"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        borderColor: INK_100,
      }}
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className="relative px-6 pb-3.5 pt-5"
          style={{
            borderRight: i < items.length - 1 ? `1px solid ${INK_20}` : undefined,
          }}
        >
          <div
            className="mb-1.5 text-[10px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            {item.label}
          </div>
          <div className="text-[28px] font-semibold tabular-nums leading-tight">
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
