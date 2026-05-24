/** Display formatting only — no aggregation or derived metrics. */

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `$${value.toLocaleString("en-AU", { maximumFractionDigits: value % 1 === 0 ? 0 : 2 })}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU");
}

export function formatRatio(value: number | null | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString("en-AU", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

export function formatSnapshotDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function formatChartWeek(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

export function formatWowDelta(
  value: number | null | undefined,
  opts?: { currency?: boolean; suffix?: string },
): { text: string; direction: "up" | "down" | "flat" | "hidden" } {
  if (value == null) return { text: "", direction: "hidden" };
  if (value === 0) return { text: "0 wk-on-wk", direction: "flat" };

  const sign = value > 0 ? "+" : "";
  const abs = Math.abs(value);
  const body = opts?.currency
    ? `${sign}$${abs.toLocaleString("en-AU", { maximumFractionDigits: abs % 1 === 0 ? 0 : 2 })}`
    : `${sign}${abs.toLocaleString("en-AU", { maximumFractionDigits: 1 })}`;

  const text = `${body}${opts?.suffix ?? ""} wk-on-wk`.trim();
  return { text, direction: value > 0 ? "up" : "down" };
}

export function formatActivatedAt(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}
