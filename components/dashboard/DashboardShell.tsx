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
      {/* Phone: stack, and keep each label whole — left to wrap, the meta labels
          broke mid-phrase and ran into each other. Row layout resumes at sm. */}
      <header
        className="flex flex-col gap-y-1.5 border-b px-12 py-6 sm:flex-row sm:items-baseline sm:justify-between"
        style={{ borderColor: INK_100 }}
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <Link
            href="/"
            className="whitespace-nowrap font-mono text-lg font-bold tracking-[0.1em] hover:opacity-80"
          >
            MARKET MEERKAT
          </Link>
          <span
            className="whitespace-nowrap text-[11px] uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            Dashboard · G3
          </span>
        </div>
        {snapshotDate && (
          <span
            className="whitespace-nowrap text-[11px] uppercase tracking-[0.15em]"
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
