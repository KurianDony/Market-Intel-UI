import Link from "next/link";
import { INK_0, INK_60, INK_100 } from "@/lib/palette/v2";
import "./charts/dashboard-charts.css";

export function DashboardShell({
  children,
  snapshotDate,
}: {
  children: React.ReactNode;
  snapshotDate?: string;
}) {
  return (
    <div
      className="min-h-screen pb-20"
      style={{ background: INK_0, color: INK_100 }}
    >
      <header
        className="flex items-baseline justify-between border-b px-12 py-6"
        style={{ borderColor: INK_100 }}
      >
        <div className="flex items-baseline gap-4">
          <Link
            href="/"
            className="font-mono text-lg font-bold tracking-[0.1em] hover:opacity-80"
          >
            MARKET MEERKAT
          </Link>
          <span
            className="text-[11px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            Dashboard · G3
          </span>
        </div>
        {snapshotDate && (
          <span
            className="text-[11px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            Snapshot {snapshotDate}
          </span>
        )}
      </header>
      <main className="px-12 py-8">{children}</main>
    </div>
  );
}
