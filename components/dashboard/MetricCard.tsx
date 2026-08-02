"use client";

import { useId, useState, type ReactNode } from "react";
import { INK_5, INK_20, INK_40, INK_60, INK_100 } from "@/lib/palette/v2";
import { formatWeekLong, formatWeekTick } from "@/lib/dash/iso-week";
import { Sparkline, SparklineLegend, type SparkPoint } from "./charts/Sparkline";

export type MetricTable = {
  cols: string[];
  rows: (string | number | null)[][];
};

/**
 * Serializable format token — these cards are rendered from server components,
 * so a formatter function cannot be passed across the boundary.
 */
export type SeriesFormat = "currency" | "count" | "percent" | "days" | "ratio";

const SERIES_FORMATTERS: Record<SeriesFormat, (v: number) => string> = {
  currency: (v) => `$${Math.round(v)}`,
  count: (v) => String(v),
  percent: (v) => `${Math.round(v)}%`,
  days: (v) => `${Math.round(v)}d`,
  ratio: (v) => v.toFixed(2),
};

export type MetricCardProps = {
  /** Contract element id, e.g. "A1" — keeps the UI traceable to the mapping. */
  code: string;
  label: string;
  value: string;
  /** "Where it comes from" — the source table.column. */
  source: string;
  /** "What it shows" — plain-English meaning. */
  explain: string;
  series?: SparkPoint[];
  seriesFormat?: SeriesFormat;
  /** When false, series only appears inside the expander (Round 2 A1). Default true. */
  showSpark?: boolean;
  table?: MetricTable;
  /** Extra content rendered inside the open expander. */
  expanderExtra?: ReactNode;
  /** Compact delta chips under the value (1w / 4w). */
  deltas?: ReactNode;
  /** Rendered above the fold when a metric is only partially available. */
  caveat?: string;
  /** Set when the block's data is older than the selected week. */
  asOfLabel?: string;
  span?: 1 | 2 | 3;
};

const SPAN_CLASS: Record<1 | 2 | 3, string> = {
  1: "",
  2: "sm:col-span-2",
  3: "sm:col-span-2 lg:col-span-3",
};

export function MetricCard({
  code,
  label,
  value,
  source,
  explain,
  series,
  seriesFormat,
  showSpark = true,
  table,
  expanderExtra,
  deltas,
  caveat,
  asOfLabel,
  span = 1,
}: MetricCardProps) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const recent = series ? series.slice(-12) : [];
  const formatValue = seriesFormat ? SERIES_FORMATTERS[seriesFormat] : null;

  return (
    <div
      className={`flex flex-col p-4 ${SPAN_CLASS[span]}`}
      style={{ border: `1px solid ${INK_20}`, background: INK_5 }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailId}
        className="group text-left"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className="text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: INK_60 }}
          >
            <span style={{ color: INK_40 }}>{code}</span> {label}
          </span>
          <span
            className="shrink-0 text-[13px] font-bold leading-none transition-colors"
            style={{ color: open ? INK_100 : INK_40 }}
          >
            {open ? "−" : "+"}
          </span>
        </div>
        <div className="mt-2 text-[19px] font-semibold leading-tight tabular-nums">{value}</div>
      </button>

      {deltas && <div className="mt-2 flex flex-wrap gap-2">{deltas}</div>}

      {caveat && (
        <p
          className="mt-2 border-l-2 pl-2 text-[10px] uppercase tracking-[0.1em]"
          style={{ borderColor: INK_40, color: INK_60 }}
        >
          {caveat}
        </p>
      )}
      {asOfLabel && (
        <p className="mt-2 text-[10px] uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
          {asOfLabel}
        </p>
      )}

      {showSpark && series && series.length > 0 && (
        <>
          <Sparkline points={series} />
          <SparklineLegend points={series} />
        </>
      )}

      {open && (
        <div
          id={detailId}
          className="mt-3 space-y-3 border-t pt-3 text-[12px]"
          style={{ borderColor: INK_20, borderTopStyle: "dashed" }}
        >
          <p>
            <span className="uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
              Where it comes from —{" "}
            </span>
            <span className="font-mono text-[11px]">{source}</span>
          </p>
          <p>
            <span className="uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
              What it shows —{" "}
            </span>
            {explain}
          </p>
          {recent.length > 0 && (
            <div>
              <p className="mb-1 uppercase tracking-[0.1em]" style={{ color: INK_60 }}>
                By week (last {recent.length})
              </p>
              <MiniTable
                cols={recent.map((p) => formatWeekTick(p.week))}
                rows={[
                  recent.map((p) =>
                    p.value == null ? null : formatValue ? formatValue(p.value) : p.value,
                  ),
                ]}
                titles={recent.map((p) => formatWeekLong(p.week))}
              />
            </div>
          )}
          {table && <MiniTable cols={table.cols} rows={table.rows} />}
          {expanderExtra}
        </div>
      )}
    </div>
  );
}

export function MiniTable({
  cols,
  rows,
  titles,
}: MetricTable & { titles?: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px]" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={`${c}-${i}`}
                title={titles?.[i]}
                className="whitespace-nowrap px-2 py-1 text-right font-medium uppercase tracking-[0.08em]"
                style={{ border: `1px solid ${INK_20}`, color: INK_60 }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className="whitespace-nowrap px-2 py-1 text-right tabular-nums"
                  style={{ border: `1px solid ${INK_20}` }}
                >
                  {cell == null || cell === "" ? (
                    <span style={{ color: INK_40 }}>—</span>
                  ) : (
                    cell
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function MetricGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}
