import { DashboardShell } from "./DashboardShell";
import { INK_60 } from "@/lib/palette/v2";

export function DashboardLoading() {
  return (
    <DashboardShell>
      <p className="text-sm uppercase tracking-widest" style={{ color: INK_60 }}>
        Loading dashboard…
      </p>
    </DashboardShell>
  );
}
