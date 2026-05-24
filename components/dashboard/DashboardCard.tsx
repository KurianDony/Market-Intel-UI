import { INK_5, INK_20, INK_60 } from "@/lib/palette/v2";

export function DashboardCard({
  title,
  subtitle,
  span = 1,
  tall,
  autoHeight,
  children,
}: {
  title: string;
  subtitle?: string;
  span?: 1 | 2;
  tall?: boolean;
  /** Tables / custom content — skip fixed chart viewport. */
  autoHeight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`p-5 ${span === 2 ? "col-span-2" : ""}`}
      style={{ border: `1px solid ${INK_20}`, background: INK_5 }}
    >
      <div className="mb-4">
        <div className="text-[13px] font-semibold uppercase tracking-widest">
          {title}
        </div>
        {subtitle && (
          <div className="mt-0.5 text-[11px]" style={{ color: INK_60 }}>
            {subtitle}
          </div>
        )}
      </div>
      <div
        className="relative"
        style={autoHeight ? undefined : { height: tall ? 320 : 240 }}
      >
        {children}
      </div>
    </div>
  );
}
