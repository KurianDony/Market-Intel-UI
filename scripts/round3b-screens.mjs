/**
 * Round 3B visual QA — suburb explorer only, 1440 + 390.
 * Exercises combined bed×tier filter, section order, banner tags,
 * composition strip, and console cleanliness.
 *
 *   MM_EMAIL=... MM_PASSWORD=... node scripts/round3b-screens.mjs [baseUrl]
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
  "Movement — liquidity",
  "Price — what rooms cost",
  "Supply — how much stock",
  "Demand — suburb-wide",
  "Confidence & data quality",
  "Geography",
];

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
    const strip = await page.locator("[data-composition-strip]").count();
    const charts = await page.locator("svg.recharts-surface").count();
    console.log(
      `[${vpName}] ${path} → ${status} · h1="${heading?.trim()}" · filter=${filter} slider=${slider} strip=${strip} charts=${charts}`,
    );

    if (filter < 1) failures.push(`[${vpName}] ${path} missing type filter`);
    if (slider < 1) failures.push(`[${vpName}] ${path} missing bed slider`);
    if (strip < 1) failures.push(`[${vpName}] ${path} missing composition strip`);

    // Section order: Movement first.
    const headings = await page.locator("h2").allTextContents();
    const sectionIdx = SECTION_ORDER.map((title) =>
      headings.findIndex((h) => h.includes(title.split("—")[0].trim()) || h.includes(title)),
    );
    // Fallback: match by letter prefixes in page text order.
    const body = await page.locator("main, body").first().innerText();
    const orderPos = SECTION_ORDER.map((t) => {
      const key = t.split("—")[0].trim();
      return body.indexOf(key);
    });
    for (let i = 1; i < orderPos.length; i++) {
      if (orderPos[i] < 0 || orderPos[i - 1] < 0) continue;
      if (orderPos[i] < orderPos[i - 1]) {
        failures.push(
          `[${vpName}] ${path} section order wrong: "${SECTION_ORDER[i]}" before "${SECTION_ORDER[i - 1]}"`,
        );
      }
    }
    void sectionIdx;

    const bodyLower = body.toLowerCase();
    if (bodyLower.includes("a3 dispersion")) {
      failures.push(`[${vpName}] ${path} still shows A3 dispersion`);
    }
    if (/\bc14\b/.test(bodyLower) && bodyLower.includes("all-time ratio")) {
      failures.push(`[${vpName}] ${path} still shows C14 card`);
    }
    if (bodyLower.includes("d23") && bodyLower.includes("closing rent")) {
      failures.push(`[${vpName}] ${path} still shows D23 card`);
    }
    if (bodyLower.includes("price ladder")) {
      failures.push(`[${vpName}] ${path} still shows Price ladder`);
    }
    const staleCol = await page.locator("th", { hasText: /^stale$/i }).count();
    if (staleCol > 0) failures.push(`[${vpName}] ${path} B8 still has stale column`);

    // D24 should appear before D17 in the movement metrics block.
    const d24pos = body.indexOf("D24");
    const d17pos = body.indexOf("D17");
    if (d24pos < 0 || d17pos < 0) {
      failures.push(`[${vpName}] ${path} missing D24 or D17`);
    } else if (d24pos > d17pos) {
      failures.push(`[${vpName}] ${path} D24 not promoted ahead of D17`);
    }

    // Combined filter: slider to 2 + premium ON.
    const bed2 = page.locator("[data-bed-chip='2']");
    const premium = page.locator("[data-tier-chip='premium']");
    if ((await bed2.count()) && (await premium.count())) {
      await bed2.click();
      await premium.click();
      await page.waitForTimeout(400);
      const bedPressed = await bed2.getAttribute("aria-pressed");
      const tierPressed = await premium.getAttribute("aria-pressed");
      if (bedPressed !== "true") failures.push(`[${vpName}] ${path} 2-bed not pressed`);
      if (tierPressed !== "true") failures.push(`[${vpName}] ${path} premium not pressed`);

      const bannerText = await page.locator("[data-stat-strip]").innerText();
      if (!/listings-basis/i.test(bannerText)) {
        failures.push(`[${vpName}] ${path} missing listings-basis tag under filter`);
      }
      if (!/estimate/i.test(bannerText)) {
        failures.push(`[${vpName}] ${path} missing estimate tag under filter`);
      }
      if (!/suburb-wide/i.test(bannerText)) {
        failures.push(`[${vpName}] ${path} missing suburb-wide tag under filter`);
      }

      // Reset to all.
      await page.locator("[data-bed-chip='all']").click();
      await page.locator("[data-tier-chip='all']").click();
      await page.waitForTimeout(200);
    } else {
      failures.push(`[${vpName}] ${path} missing bed/tier chips for combined filter`);
    }

    // Composition strip numbers present (numeric digits).
    const stripText = await page.locator("[data-composition-strip]").innerText().catch(() => "");
    if (stripText && !/\d/.test(stripText)) {
      failures.push(`[${vpName}] ${path} composition strip has no numbers`);
    }

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
      path: `${OUT}_round3b-${vpName}-${name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${OUT}_round3b-${vpName}-${name}-fold.png` });
  }

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nRound 3B visual pass clean.");
