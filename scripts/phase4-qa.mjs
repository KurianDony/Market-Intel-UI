/**
 * Phase-4 QA harness — exercises the Suburb Explorer / Area Analytics data path
 * against the live project with the publishable (anon) key only.
 *
 * Asserts the gate items that are data-shaped: one point per iso_week across
 * the split-fetch weeks, gap weeks surfacing as nulls, and the rich / thin /
 * area / no-market-data cases resolving as designed.
 *
 *   node scripts/phase4-qa.mjs
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY");
if (/service_role/.test(key)) throw new Error("Refusing to run with a service-role key");

const db = createClient(url, key, { auth: { persistSession: false } });

const SPLIT_FETCH_WEEKS = ["2026-04-27", "2026-05-04", "2026-05-25", "2026-06-15"];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

let failures = 0;
function check(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
}

function buildAxis(weeks) {
  const sorted = [...new Set(weeks)].sort();
  const axis = [];
  for (
    let t = Date.parse(`${sorted[0]}T00:00:00Z`);
    t <= Date.parse(`${sorted.at(-1)}T00:00:00Z`);
    t += WEEK_MS
  ) {
    axis.push(new Date(t).toISOString().slice(0, 10));
  }
  return axis;
}

async function rows(table, filters = {}, order = "iso_week") {
  let q = db.from(table).select("*");
  for (const [col, val] of Object.entries(filters)) q = q.eq(col, val);
  const { data, error } = await q.order(order, { ascending: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

async function suburbCase(label, slug, { expectRich = false, expectEmpty = false } = {}) {
  console.log(`\n── ${label}: ${slug}`);
  const { data: sub, error } = await db
    .from("suburbs")
    .select("id, suburb, slug, area, state, g1_capable")
    .like("slug", `${slug}-%`);
  if (error) throw error;
  const identity = (sub ?? []).find((s) => s.slug.replace(/-\d+$/, "") === slug);
  check("roster row resolves from the slug column", Boolean(identity), identity?.slug);
  if (!identity) return;

  const [weekly, price, move, cov, bands] = await Promise.all([
    rows("dash_suburb_weekly", { suburb_id: identity.id }),
    rows("dash_suburb_price_stats", { suburb_id: identity.id }),
    rows("dash_suburb_movement", { suburb_id: identity.id }),
    rows("dash_suburb_coverage", { suburb_id: identity.id }),
    rows("dash_suburb_band_liquidity", { suburb_id: identity.id }),
  ]);

  const dataWeeks = [
    ...new Set([...weekly, ...price, ...move, ...cov].map((r) => r.iso_week)),
  ].sort();
  if (expectEmpty) {
    check("no recorded week — renders the no-market-data state", dataWeeks.length === 0,
      `${dataWeeks.length} weeks`);
    return;
  }
  check("has at least one recorded week", dataWeeks.length > 0, `${dataWeeks.length} weeks`);
  if (dataWeeks.length === 0) return;

  for (const [name, set] of [
    ["dash_suburb_weekly", weekly],
    ["dash_suburb_price_stats", price],
    ["dash_suburb_movement", move],
    ["dash_suburb_coverage", cov],
  ]) {
    const weeks = set.map((r) => r.iso_week);
    check(`${name}: one row per iso_week`, weeks.length === new Set(weeks).size,
      `${weeks.length} rows / ${new Set(weeks).size} weeks`);
  }

  const split = SPLIT_FETCH_WEEKS.filter((w) => dataWeeks.includes(w));
  const doubled = split.filter((w) => weekly.filter((r) => r.iso_week === w).length > 1);
  check("split-fetch weeks contribute exactly one point", doubled.length === 0,
    `${split.length} split weeks present, ${doubled.length} doubled`);

  const axis = buildAxis(dataWeeks);
  const gaps = axis.filter((w) => !dataWeeks.includes(w));
  const byWeek = new Map(weekly.map((r) => [r.iso_week, r]));
  const aligned = axis.map((w) => (byWeek.get(w) ? byWeek.get(w).avg_rent : null));
  const gapsAreNull = gaps.every((w) => aligned[axis.indexOf(w)] === null);
  check("gap weeks align to null, never zero", gapsAreNull,
    gaps.length ? `gaps: ${gaps.join(", ")}` : "no gaps inside this suburb's range");

  const latestCov = cov.at(-1);
  check("coverage badge available for the latest week", Boolean(latestCov?.confidence),
    `${latestCov?.confidence} n=${latestCov?.sample_n ?? 0} weeks=${latestCov?.weeks_present_4 ?? 0}`);

  const g2Week = [price.at(-1)?.iso_week, move.at(-1)?.iso_week].filter(Boolean).sort().at(-1);
  const bandsAtG2 = bands.filter((b) => b.iso_week === g2Week);
  console.log(
    `      spine weeks=${weekly.length} price=${price.length} move=${move.length} ` +
      `bands@${g2Week}=${bandsAtG2.length} g1_capable=${identity.g1_capable}`,
  );

  if (expectRich) {
    const p = price.at(-1);
    check("rich suburb exposes full percentile set",
      p?.p10 != null && p?.p50 != null && p?.p90 != null, `p10=${p?.p10} p50=${p?.p50} p90=${p?.p90}`);
    // Only occupied bands are persisted; the chart back-fills the rest to zero
    // from dash_band_definitions so the 14-band ladder stays continuous.
    check("rich suburb exposes band liquidity", bandsAtG2.length > 0, `${bandsAtG2.length} occupied bands`);
  }
}

async function areaCase(slug) {
  console.log(`\n── Area: ${slug}`);
  const [weekly, price, move, cov, city] = await Promise.all([
    rows("dash_area_weekly", { area_slug: slug }),
    rows("dash_area_price_stats", { area_slug: slug }),
    rows("dash_area_movement", { area_slug: slug }),
    rows("dash_area_coverage", { area_slug: slug }),
    rows("dash_city_weekly"),
  ]);

  check("area spine present", weekly.length > 0, `${weekly.length} weeks`);
  const weeks = weekly.map((r) => r.iso_week);
  check("dash_area_weekly: one row per iso_week", weeks.length === new Set(weeks).size);

  const axis = buildAxis(weeks);
  const gaps = axis.filter((w) => !weeks.includes(w));
  check("gap weeks detected on the area axis", gaps.length > 0, gaps.join(", ") || "none");

  const latest = weekly.at(-1);
  const latestCity = city.find((c) => c.iso_week === latest.iso_week);
  check("vs-Sydney baseline exists for the latest week", Boolean(latestCity),
    `area ${latest.median_avg_rent} vs syd ${latestCity?.median_avg_rent}`);

  const latestCov = cov.at(-1);
  check("area coverage badge available", Boolean(latestCov),
    `${latestCov?.g1_captured}/${latestCov?.capable_suburbs} G1 · ${latestCov?.g2_captured} G2`);

  const { data: board, error: boardErr } = await db
    .from("dash_area_leaderboard")
    .select("suburb_id, suburb, rank_in_area, snapshot_date")
    .eq("area_slug", slug)
    .order("snapshot_date", { ascending: false })
    .limit(300);
  if (boardErr) throw boardErr;
  const boardLatest = (board ?? []).filter((r) => r.snapshot_date === board[0]?.snapshot_date);
  const spineAtWeek = await db
    .from("dash_suburb_weekly")
    .select("suburb_id, wow_avg_rent, wow_total_listings")
    .eq("area_slug", slug)
    .eq("iso_week", latest.iso_week);
  const withWow = (spineAtWeek.data ?? []).filter((r) => r.wow_avg_rent != null).length;
  check("leaderboard rows carry WoW movement", withWow > 0,
    `${boardLatest.length} suburbs, ${withWow} with a WoW rent delta`);

  console.log(`      price weeks=${price.length} move weeks=${move.length}`);
}

async function main() {
  console.log(`Phase-4 QA · ${url}`);

  const { data: thin } = await db
    .from("dash_suburb_coverage")
    .select("suburb_slug, sample_n, confidence, iso_week")
    .eq("g2_present", true)
    .order("sample_n", { ascending: true })
    .limit(1);
  console.log(`Thinnest G2 sample on record: ${thin?.[0]?.suburb_slug} n=${thin?.[0]?.sample_n}`);

  await suburbCase("Rich suburb", "strathfield", { expectRich: true });
  await suburbCase("Thin suburb (lowest sample_n)", "mayfield-west");
  await suburbCase("Outside the capable set", "north-st-marys");
  await suburbCase("No data at all", "point-piper", { expectEmpty: true });
  await areaCase("inner-west");

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
