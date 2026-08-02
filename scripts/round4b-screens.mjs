/**
 * Round 4B visual QA — suburb explorer only, 1440 + 390.
 * Range slider (2-4) + premium must move every section including movement;
 * 6+-only must show Strathfield ~30-listing segment; reprice ≥3 weeks;
 * composition numerics; no G2 section sub-labels; no em-dashes; no card codes.
 *
 *   MM_EMAIL=... MM_PASSWORD=... node scripts/round4b-screens.mjs [baseUrl]
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.env.MM_EMAIL;
const PASSWORD = process.env.MM_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("Set MM_EMAIL and MM_PASSWORD");

const OUT = new URL("../assets/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const TARGETS = [
  ["rich-suburb", "/nsw/inner-west/strathfield"],
  ["rich-suburb-gap-adjacent", "/nsw/inner-west/strathfield?week=2026-07-13"],
  ["thin-suburb", "/nsw/newcastle/mayfield-west"],
];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 1000 }],
  ["phone", { width: 390, height: 844 }],
];

const SECTION_ORDER = [
  "Movement - liquidity",
  "Price - what rooms cost",
  "Supply - how much stock",
  "Demand - suburb-wide",
  "Confidence & data quality",
  "Geography",
];

const SECTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Expected movement_x numerics for Strathfield latest week, 2-4 premium. */
const EXPECTED_24_PREMIUM = {
  Carried: 0,
  Repriced: 14,
  up: 3,
  down: 5,
  New: 7,
  Lost: 0,
};

async function setBedRange(page, minIdx, maxIdx) {
  await page.locator("[data-bed-min-slider]").fill(String(minIdx));
  await page.locator("[data-bed-max-slider]").fill(String(maxIdx));
  await page.waitForTimeout(400);
}

async function metricValue(page, key) {
  return page.locator(`[data-metric="${key}"] [data-metric-value]`).innerText().catch(() => "");
}

async function snapshotMovement(page) {
  const strip = await page.locator("[data-composition-strip]").innerText().catch(() => "");
  const numerics = await page.locator("[data-composition-numerics]").innerText().catch(() => "");
  const numericsWeek = await page
    .locator("[data-composition-numerics]")
    .getAttribute("data-composition-week")
    .catch(() => "");
  const rent = await page.locator("[data-stat-strip]").innerText().catch(() => "");
  return {
    strip,
    numerics,
    numericsWeek,
    dom: await metricValue(page, "days-on-market-median"),
    turnover: await metricValue(page, "turnover-share-cleared"),
    reprice: await metricValue(page, "reprice-behaviour"),
    rent,
    supply: await metricValue(page, "supply-level"),
    typical: await metricValue(page, "typical-rent-p50"),
  };
}

const browser = await chromium.launch();
const failures = [];

for (const [vpName, viewport] of VIEWPORTS) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  let capturing = false;
  page.on("pageerror", (err) => {
    if (capturing) failures.push(`[${vpName}] pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (capturing && msg.type() === "error") {
      const t = msg.text();
      if (/Fast Refresh|Download the React DevTools/i.test(t)) return;
      failures.push(`[${vpName}] console: ${t}`);
    }
  });

  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !u.pathname.startsWith("/auth/login"), { timeout: 30000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log(`[${vpName}] signed in`);
  await page.goto("about:blank");
  capturing = true;

  for (const [name, path] of TARGETS) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const status = res?.status();
    if (status && status >= 400) failures.push(`[${vpName}] ${path} → HTTP ${status}`);
    if (page.url().includes("/auth/login")) {
      failures.push(`[${vpName}] ${path} bounced to login`);
      continue;
    }

    const heading = await page.locator("h1").first().textContent().catch(() => null);
    const filter = await page.locator("[data-type-filter]").count();
    const slider = await page.locator("[data-bed-slider]").count();
    const minThumb = await page.locator("[data-bed-min-slider]").count();
    const maxThumb = await page.locator("[data-bed-max-slider]").count();
    const strip = await page.locator("[data-composition-strip]").count();
    const numerics = await page.locator("[data-composition-numerics]").count();
    console.log(
      `[${vpName}] ${path} → ${status} · h1="${heading?.trim()}" · filter=${filter} dual=${minThumb}/${maxThumb} strip=${strip} numerics=${numerics}`,
    );

    if (filter < 1) failures.push(`[${vpName}] ${path} missing type filter`);
    if (slider < 1 || minThumb < 1 || maxThumb < 1) {
      failures.push(`[${vpName}] ${path} missing dual-thumb bed range`);
    }
    if (strip < 1) failures.push(`[${vpName}] ${path} missing composition strip`);
    if (numerics < 1) failures.push(`[${vpName}] ${path} missing composition numerics`);

    const headings = await page.locator("h2").allTextContents();
    const body = await page.locator("main, body").first().innerText();
    const bodyLower = body.toLowerCase();

    // Section letters A–F and order (match case-insensitively; CSS may upper-case).
    const orderPos = SECTION_ORDER.map((t) => bodyLower.indexOf(t.toLowerCase()));
    for (let i = 0; i < SECTION_ORDER.length; i++) {
      const inH2 = headings.some((h) => h.toLowerCase().includes(SECTION_ORDER[i].toLowerCase()));
      if (orderPos[i] < 0 && !inH2) {
        failures.push(`[${vpName}] ${path} missing section "${SECTION_ORDER[i]}"`);
      }
    }
    for (let i = 1; i < orderPos.length; i++) {
      if (orderPos[i] < 0 || orderPos[i - 1] < 0) continue;
      if (orderPos[i] < orderPos[i - 1]) {
        failures.push(
          `[${vpName}] ${path} section order wrong: "${SECTION_ORDER[i]}" before "${SECTION_ORDER[i - 1]}"`,
        );
      }
    }
    for (const letter of SECTION_LETTERS) {
      const found = headings.some((h) => h.trim().startsWith(`${letter} ·`) || h.trim().startsWith(`${letter} ·`.toUpperCase()) || new RegExp(`^${letter}\\s*·`, "i").test(h.trim()));
      if (!found) failures.push(`[${vpName}] ${path} missing section letter ${letter}`);
    }
    if (headings.some((h) => /^G\s*·\s*Geography/i.test(h.trim()))) {
      failures.push(`[${vpName}] ${path} still shows G · Geography`);
    }

    if (/G2 listing data.*cohort panels filter/i.test(body) || /G2 listing data.*filter:/i.test(body)) {
      failures.push(`[${vpName}] ${path} still has G2 section sub-labels`);
    }

    // No visible card-code chips next to metric labels (ignore G1/G2 data labels).
    const codeNearLabel = body.match(/\b([A-DF]\d{1,2}|E25|G27)\s+[A-Za-z]/g) ?? [];
    if (codeNearLabel.length > 0) {
      failures.push(
        `[${vpName}] ${path} visible card codes remain: ${[...new Set(codeNearLabel)].join(", ")}`,
      );
    }
    // DashboardCard titles must not keep "D20 ·" style prefixes.
    if (/\b[A-G]\d{1,2}\s*·/.test(body)) {
      failures.push(`[${vpName}] ${path} card-code title chips remain`);
    }

    if (body.includes("\u2014") || body.includes("—")) {
      failures.push(`[${vpName}] ${path} em-dash still present in rendered text`);
    }

    const before = await snapshotMovement(page);

    // Combined filter: range 2-4 + premium ON. Indices: 0=1, 1=2, 2=3, 3=4
    await setBedRange(page, 1, 3);
    await page.locator("[data-tier-chip='premium']").click();
    await page.waitForTimeout(600);

    const bedMin = await page.locator("[data-type-filter]").getAttribute("data-bed-min");
    const bedMax = await page.locator("[data-type-filter]").getAttribute("data-bed-max");
    const bedLabel = await page.locator("[data-bed-label]").innerText();
    const tierPressed = await page.locator("[data-tier-chip='premium']").getAttribute("aria-pressed");
    if (bedMin !== "2" || bedMax !== "4") {
      failures.push(`[${vpName}] ${path} range not 2-4 (got ${bedMin}-${bedMax}, label=${bedLabel})`);
    }
    if (tierPressed !== "true") failures.push(`[${vpName}] ${path} premium not pressed`);

    const after = await snapshotMovement(page);
    if (!/listings-basis/i.test(after.rent)) {
      failures.push(`[${vpName}] ${path} missing listings-basis tag under filter`);
    }
    if (!/estimate/i.test(after.rent)) {
      failures.push(`[${vpName}] ${path} missing estimate tag under filter`);
    }
    if (!/suburb-wide/i.test(after.rent)) {
      failures.push(`[${vpName}] ${path} missing suburb-wide tag under filter`);
    }

    if (/strathfield/i.test(path) && !/week=/.test(path)) {
      for (const key of ["strip", "numerics", "dom", "reprice", "rent", "supply", "typical"]) {
        if (before[key] && after[key] && before[key] === after[key]) {
          failures.push(
            `[${vpName}] ${path} ${key} unchanged under 2-4+premium (still: ${String(before[key]).slice(0, 80)})`,
          );
        }
      }
      // Turnover stays 0.00 whenever gone_count=0 (true for both all-range and
      // 2-4 premium on the latest Strathfield week) - assert the card is present
      // and sourced, not that the number moves.
      if (!after.turnover) {
        failures.push(`[${vpName}] ${path} turnover card empty under 2-4+premium`);
      }

      if (after.numericsWeek !== "2026-07-27") {
        failures.push(
          `[${vpName}] ${path} composition week ${after.numericsWeek} (expected 2026-07-27)`,
        );
      }

      const numText = after.numerics.replace(/\s+/g, " ");
      for (const [label, v] of Object.entries(EXPECTED_24_PREMIUM)) {
        const re = new RegExp(`${label}\\s+${v}\\b`, "i");
        if (!re.test(numText)) {
          failures.push(
            `[${vpName}] ${path} composition numerics missing ${label}=${v} (got: ${numText.slice(0, 160)})`,
          );
        }
      }
    }

    // Reprice expander: ≥3 week rows.
    const repriceCard = page.locator('[data-metric="reprice-behaviour"]');
    if ((await repriceCard.count()) > 0) {
      await repriceCard.locator("button").first().click();
      await page.waitForTimeout(250);
      const tableText = await repriceCard.locator("table").innerText().catch(() => "");
      const dataRows = tableText
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^week/i.test(l) && /\d/.test(l));
      if (dataRows.length < 3 && /strathfield/i.test(path)) {
        failures.push(
          `[${vpName}] ${path} reprice expander has <3 weeks (rows=${dataRows.length}: ${tableText.slice(0, 160)})`,
        );
      }
      await repriceCard.locator("button").first().click();
    }

    // Single-value range: 6+ only — Strathfield ~30 listings.
    await page.locator("[data-bed-chip='6plus']").click();
    await page.locator("[data-tier-chip='all']").click();
    await page.waitForTimeout(600);
    const sixMin = await page.locator("[data-type-filter]").getAttribute("data-bed-min");
    const sixMax = await page.locator("[data-type-filter]").getAttribute("data-bed-max");
    if (sixMin !== "6plus" || sixMax !== "6plus") {
      failures.push(`[${vpName}] ${path} 6+ single range failed (${sixMin}-${sixMax})`);
    }
    if (/strathfield/i.test(path) && !/week=/.test(path)) {
      const six = await snapshotMovement(page);
      const blob = `${six.strip}\n${six.numerics}\n${six.supply}`;
      if (!/\b3[0-5]\b/.test(blob) && !/\b26\b/.test(blob)) {
        failures.push(
          `[${vpName}] ${path} 6+-only missing ~30-listing segment (strip: ${six.strip.slice(0, 100)}; num: ${six.numerics.slice(0, 100)})`,
        );
      }
      if (six.numericsWeek !== "2026-07-27") {
        failures.push(`[${vpName}] ${path} 6+-only week ${six.numericsWeek} (expected 2026-07-27)`);
      }
      const sixNum = six.numerics.replace(/\s+/g, " ");
      if (!/Repriced\s+26/i.test(sixNum) && !/New\s+4/i.test(sixNum)) {
        failures.push(
          `[${vpName}] ${path} 6+-only composition empty/wrong (numerics: ${sixNum.slice(0, 120)})`,
        );
      }
    }

    await page.locator("[data-bed-chip='all']").click();
    await page.locator("[data-tier-chip='all']").click();
    await page.waitForTimeout(200);

    const { overflow, offenders } = await page.evaluate(() => {
      const d = document.documentElement;
      const vw = d.clientWidth;
      const out = [];
      for (const el of document.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.right <= vw + 1 || r.width === 0) continue;
        let depth = 0;
        for (let p = el.parentElement; p; p = p.parentElement) depth++;
        out.push({
          depth,
          desc: `<${el.tagName.toLowerCase()} class="${(el.getAttribute("class") ?? "").slice(0, 50)}">`,
          width: Math.round(r.width),
          right: Math.round(r.right),
          text: (el.textContent ?? "").trim().slice(0, 40),
        });
      }
      out.sort((a, b) => a.depth - b.depth);
      return { overflow: d.scrollWidth - d.clientWidth, offenders: out.slice(0, 6) };
    });
    if (overflow > 1) {
      failures.push(`[${vpName}] ${path} overflows horizontally by ${overflow}px`);
      for (const o of offenders) {
        failures.push(
          `      d${o.depth} ${o.desc} w=${o.width} right=${o.right} :: ${o.text}`,
        );
      }
    }

    await page.screenshot({
      path: `${OUT}_round4b-${vpName}-${name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${OUT}_round4b-${vpName}-${name}-fold.png` });
  }

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nRound 4B visual pass clean.");
