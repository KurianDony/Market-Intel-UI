/**
 * Round 5 visual QA — suburb + area liquidity, 1440 + 390.
 *
 * Suburb: slider snap, banner strip gone, category selector, absolute band
 * labels, movement rank, geography absent.
 * Area: liquidity on movement-complete week with basis label; leaderboard
 * matches gone_counts; 2-4 + premium moves liquidity elements.
 *
 *   MM_EMAIL=... MM_PASSWORD=... node scripts/round5-screens.mjs [baseUrl]
 */

import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3000";
const EMAIL = process.env.MM_EMAIL;
const PASSWORD = process.env.MM_PASSWORD;
if (!EMAIL || !PASSWORD) throw new Error("Set MM_EMAIL and MM_PASSWORD");

const OUT = new URL("../assets/screenshots/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const SUBURB_TARGETS = [
  ["rich-suburb", "/nsw/inner-west/strathfield"],
  ["rich-suburb-gap-adjacent", "/nsw/inner-west/strathfield?week=2026-07-13"],
  ["thin-suburb", "/nsw/newcastle/mayfield-west"],
];

const AREA_TARGETS = [["area-inner-west", "/nsw/inner-west"]];

const VIEWPORTS = [
  ["desktop", { width: 1440, height: 1000 }],
  ["phone", { width: 390, height: 844 }],
];

const SUBURB_SECTIONS = [
  "Movement - liquidity",
  "Price - what rooms cost",
  "Supply - how much stock",
  "Demand - suburb-wide",
  "Confidence & data quality",
];

/** Expected gone counts for Inner West movement-complete week 2026-06-29. */
const EXPECTED_LEADERBOARD_GONES = {
  "concord-west": 14,
  burwood: 11,
  campsie: 9,
  rhodes: 9,
  homebush: 8,
};

const EXPECTED_BASIS_WEEK = "2026-06-29";

async function setBedRange(page, minIdx, maxIdx) {
  await page.locator("[data-bed-min-slider]").fill(String(minIdx));
  await page.locator("[data-bed-max-slider]").fill(String(maxIdx));
  await page.waitForTimeout(350);
  const minAttr = await page.locator("[data-type-filter]").getAttribute("data-bed-min");
  const maxAttr = await page.locator("[data-type-filter]").getAttribute("data-bed-max");
  const label = await page.locator("[data-bed-label]").innerText();
  return { minAttr, maxAttr, label };
}

async function snapCheck(page, failures, tag) {
  const detents = [
    [0, 0, "1", "1", "1"],
    [1, 1, "2", "2", "2"],
    [2, 2, "3", "3", "3"],
    [3, 3, "4", "4", "4"],
    [4, 4, "5", "5", "5"],
    [5, 5, "6plus", "6plus", "6+"],
    [0, 5, "1", "6plus", "All"],
    [1, 3, "2", "4", "2-4"],
  ];
  for (const [lo, hi, expMin, expMax, expLabel] of detents) {
    const { minAttr, maxAttr, label } = await setBedRange(page, lo, hi);
    if (minAttr !== expMin || maxAttr !== expMax) {
      failures.push(
        `${tag} slider snap mismatch idx ${lo}-${hi}: attrs=${minAttr}/${maxAttr} expected ${expMin}/${expMax}`,
      );
    }
    if (label.trim() !== expLabel) {
      failures.push(
        `${tag} slider label mismatch idx ${lo}-${hi}: "${label.trim()}" expected "${expLabel}"`,
      );
    }
  }
  // Reset to all
  await setBedRange(page, 0, 5);
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

  // ── Suburb checks ──────────────────────────────────────────────
  for (const [name, path] of SUBURB_TARGETS) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const status = res?.status();
    if (status && status >= 400) failures.push(`[${vpName}] ${path} → HTTP ${status}`);
    if (page.url().includes("/auth/login")) {
      failures.push(`[${vpName}] ${path} bounced to login`);
      continue;
    }

    const heading = await page.locator("h1").first().textContent().catch(() => null);
    const strip = await page.locator("[data-composition-strip]").count();
    const numerics = await page.locator("[data-composition-numerics]").count();
    const category = await page.locator("[data-category-filter]").count();
    const geography = (await page.locator("h2").allTextContents()).some((h) =>
      /geography/i.test(h),
    );
    const movementRank = await page.locator("[data-stat-strip]").innerText().catch(() => "");

    console.log(
      `[${vpName}] ${path} → ${status} · h1="${heading?.trim()}" · strip=${strip} numerics=${numerics} cat=${category} geo=${geography}`,
    );

    if (strip > 0) failures.push(`[${vpName}] ${path} composition strip still present`);
    if (numerics < 1) failures.push(`[${vpName}] ${path} missing composition numerics`);
    if (category < 1) failures.push(`[${vpName}] ${path} missing category selector`);
    if (geography) failures.push(`[${vpName}] ${path} Geography section still present`);
    if (!/movement rank/i.test(movementRank)) {
      failures.push(`[${vpName}] ${path} missing Movement rank card`);
    }
    if (/rank in area/i.test(movementRank)) {
      failures.push(`[${vpName}] ${path} legacy Rank in area still present`);
    }

    const body = await page.locator("main, body").first().innerText();
    const bodyLower = body.toLowerCase();
    for (const section of SUBURB_SECTIONS) {
      if (!bodyLower.includes(section.toLowerCase())) {
        failures.push(`[${vpName}] ${path} missing section "${section}"`);
      }
    }

    // Slider snap exactness
    await snapCheck(page, failures, `[${vpName}] ${path}`);

    // Category selector scopes supply table
    await page.locator("[data-category-select]").selectOption("share_houses");
    await page.waitForTimeout(300);
    const catAttr = await page.locator("[data-type-filter]").getAttribute("data-category");
    if (catAttr !== "share_houses") {
      failures.push(`[${vpName}] ${path} category select did not stick`);
    }
    const afterCat = await page.locator("main, body").first().innerText();
    if (!/category filter applies to supply/i.test(afterCat)) {
      failures.push(`[${vpName}] ${path} missing category scope tag`);
    }
    // Reset category
    await page.locator("[data-category-select]").selectOption("all");

    // Absolute band labels (legend / chart text)
    if (!/P20–P40|P40–P60|≤ P20/i.test(body) && !/p20–p40|p40–p60/i.test(bodyLower)) {
      // Chart legend may use absolute $ labels once data loads — soft check via page text after scroll
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
      await page.waitForTimeout(400);
      const mid = await page.locator("main, body").first().innerText();
      if (!/\$\d+/.test(mid)) {
        failures.push(`[${vpName}] ${path} percentile band absolute labels not evident`);
      }
    }

    await page.screenshot({
      path: `${OUT}_round5-${vpName}-${name}.png`,
      fullPage: true,
    });
  }

  // ── Area liquidity checks ──────────────────────────────────────
  for (const [name, path] of AREA_TARGETS) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 60000 });
    const status = res?.status();
    if (status && status >= 400) failures.push(`[${vpName}] ${path} → HTTP ${status}`);
    if (page.url().includes("/auth/login")) {
      failures.push(`[${vpName}] ${path} bounced to login`);
      continue;
    }

    const liquidity = await page.locator("[data-area-liquidity]").count();
    const basis = await page.locator("[data-liquidity-basis]").getAttribute("data-basis-week");
    const board = await page.locator("[data-movement-leaderboard]").count();
    const body = await page.locator("main, body").first().innerText();

    console.log(
      `[${vpName}] ${path} → ${status} · liquidity=${liquidity} basis=${basis} board=${board}`,
    );

    if (liquidity < 1) failures.push(`[${vpName}] ${path} missing area liquidity section`);
    if (basis !== EXPECTED_BASIS_WEEK) {
      failures.push(
        `[${vpName}] ${path} basis week ${basis} expected ${EXPECTED_BASIS_WEEK}`,
      );
    }
    if (!/movement basis/i.test(body)) {
      failures.push(`[${vpName}] ${path} missing basis label text`);
    }
    if (board < 1) failures.push(`[${vpName}] ${path} missing movement leaderboard`);

    // Leaderboard gone counts
    for (const [slug, gone] of Object.entries(EXPECTED_LEADERBOARD_GONES)) {
      const row = page.locator(`[data-movement-leaderboard] tr[data-suburb="${slug}"]`);
      const count = await row.count();
      if (count < 1) {
        failures.push(`[${vpName}] ${path} leaderboard missing suburb ${slug}`);
        continue;
      }
      const goneAttr = await row.getAttribute("data-gone");
      if (Number(goneAttr) !== gone) {
        failures.push(
          `[${vpName}] ${path} ${slug} gone=${goneAttr} expected ${gone}`,
        );
      }
    }

    // Suburb links work
    const firstLink = page.locator("[data-movement-leaderboard] a").first();
    const href = await firstLink.getAttribute("href");
    if (!href || !href.startsWith("/nsw/inner-west/")) {
      failures.push(`[${vpName}] ${path} leaderboard link broken: ${href}`);
    }

    // Filter 2-4 + premium moves liquidity
    const beforeDom = await page
      .locator('[data-metric="days-on-market-median"] [data-metric-value]')
      .innerText()
      .catch(() => "");
    const beforeTurnover = await page
      .locator('[data-metric="turnover-share-cleared"] [data-metric-value]')
      .innerText()
      .catch(() => "");
    const beforeNumerics = await page
      .locator("[data-area-liquidity] [data-composition-numerics]")
      .innerText()
      .catch(() => "");

    await setBedRange(page, 1, 3); // 2-4
    await page.locator('[data-tier-chip="premium"]').click();
    await page.waitForTimeout(500);

    const afterDom = await page
      .locator('[data-metric="days-on-market-median"] [data-metric-value]')
      .innerText()
      .catch(() => "");
    const afterTurnover = await page
      .locator('[data-metric="turnover-share-cleared"] [data-metric-value]')
      .innerText()
      .catch(() => "");
    const afterNumerics = await page
      .locator("[data-area-liquidity] [data-composition-numerics]")
      .innerText()
      .catch(() => "");
    const scopeTag = await page.locator("[data-area-scope-tag]").count();
    const filterTag = await page.locator("[data-liquidity-filter-tag]").count();

    if (beforeDom === afterDom && beforeTurnover === afterTurnover && beforeNumerics === afterNumerics) {
      failures.push(
        `[${vpName}] ${path} 2-4+premium did not move liquidity elements (dom/turnover/numerics unchanged)`,
      );
    }
    if (scopeTag < 1) failures.push(`[${vpName}] ${path} missing area scope tag under filter`);
    if (filterTag < 1) failures.push(`[${vpName}] ${path} missing liquidity filter tag`);

    // Liquidity should still be first section
    const h2s = await page.locator("h2").allTextContents();
    const liqIdx = h2s.findIndex((h) => /liquidity/i.test(h));
    if (liqIdx !== 0 && liqIdx !== 1) {
      // Allow page title noise; first content h2 should be Liquidity
      const firstContent = h2s.findIndex((h) => /liquidity|versus|price/i.test(h));
      if (firstContent >= 0 && !/liquidity/i.test(h2s[firstContent] ?? "")) {
        failures.push(`[${vpName}] ${path} Liquidity not first section (h2s=${h2s.slice(0, 4)})`);
      }
    }

    await page.screenshot({
      path: `${OUT}_round5-${vpName}-${name}.png`,
      fullPage: true,
    });
  }

  await context.close();
}

await browser.close();

if (failures.length) {
  console.error("\nFAIL");
  for (const f of failures) console.error(" ·", f);
  process.exit(1);
}
console.log("\nPASS — Round 5 QA green");
