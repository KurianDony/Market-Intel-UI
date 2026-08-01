/**
 * ISO-week axis helpers. Phase-3 tables key on `iso_week` = the Monday of the
 * ISO week, one row per entity per week. Missing Mondays are real collection
 * gaps (w/c 2026-04-20 and 2026-07-06) and must render as breaks, never zeros.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/**
 * Weeks the legacy fetch ran twice. Legacy `dash_*` tables hold two
 * `snapshot_date` rows for each; the Phase-3 tables collapse them to one
 * `iso_week` row, which is why week-indexed reads use Phase-3 only.
 */
export const SPLIT_FETCH_WEEKS = [
  "2026-04-27",
  "2026-05-04",
  "2026-05-25",
  "2026-06-15",
] as const;

export function isSplitFetchWeek(iso: string): boolean {
  return (SPLIT_FETCH_WEEKS as readonly string[]).includes(iso);
}

export function parseIsoWeek(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`);
}

export function toIsoWeek(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addWeeks(iso: string, n: number): string {
  return toIsoWeek(new Date(parseIsoWeek(iso).getTime() + n * WEEK_MS));
}

export function weeksBetween(from: string, to: string): number {
  return Math.round((parseIsoWeek(to).getTime() - parseIsoWeek(from).getTime()) / WEEK_MS);
}

/** Every Monday from the first to the last present week — gaps included. */
export function buildWeekAxis(presentWeeks: string[]): string[] {
  if (presentWeeks.length === 0) return [];
  const sorted = [...new Set(presentWeeks)].sort();
  const axis: string[] = [];
  for (let w = sorted[0]; w <= sorted[sorted.length - 1]; w = addWeeks(w, 1)) {
    axis.push(w);
  }
  return axis;
}

/** Mondays inside the observed range that carry no row at all. */
export function findGapWeeks(presentWeeks: string[]): string[] {
  const present = new Set(presentWeeks);
  return buildWeekAxis(presentWeeks).filter((w) => !present.has(w));
}

export type WeekKeyed = { iso_week: string };

export function indexByWeek<T extends WeekKeyed>(rows: T[]): Map<string, T> {
  return new Map(rows.map((r) => [r.iso_week, r]));
}

/** One slot per axis week; gap weeks yield `null` so charts break the line. */
export function alignToAxis<T extends WeekKeyed>(
  rows: T[],
  axis: string[],
): { week: string; row: T | null }[] {
  const byWeek = indexByWeek(rows);
  return axis.map((week) => ({ week, row: byWeek.get(week) ?? null }));
}

/** The latest row at or before `week` — used to date G2 blocks that lag the spine. */
export function rowAsOf<T extends WeekKeyed>(rows: T[], week: string): T | null {
  let best: T | null = null;
  for (const row of rows) {
    if (row.iso_week <= week && (!best || row.iso_week > best.iso_week)) best = row;
  }
  return best;
}

export function latestRow<T extends WeekKeyed>(rows: T[]): T | null {
  return rows.reduce<T | null>(
    (best, row) => (!best || row.iso_week > best.iso_week ? row : best),
    null,
  );
}

export function formatWeekShort(iso: string): string {
  return parseIsoWeek(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatWeekLong(iso: string): string {
  return parseIsoWeek(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Axis tick label — compact `dd/mm`. */
export function formatWeekTick(iso: string): string {
  const d = parseIsoWeek(iso);
  return `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
}
