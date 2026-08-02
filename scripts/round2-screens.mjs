/**
 * Round 2 visual QA — suburb explorer only, 1440 + 390.
 * Exercises filter switching, expanders, composition on a gap-adjacent week,
 * cohort panels on a thin suburb, and console cleanliness.
 *
 *   MM_EMAIL=... MM_PASSWORD=... node scripts/round2-screens.mjs [baseUrl]
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
      // Next.js HMR / React refresh noise is not a product failure.
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
    const expanders = await page.locator("[aria-expanded]").count();
    const filter = await page.locator("[data-type-filter]").count();
    const charts = await page.locator("svg.recharts-surface").count();
    console.log(
      `[${vpName}] ${path} → ${status} · h1="${heading?.trim()}" · ${expanders} expanders · ${filter} filters · ${charts} charts`,
    );

    if (filter < 1) failures.push(`[${vpName}] ${path} missing type filter`);

    // Open first stat-strip expander + first metric card.
    const firstStat = page.locator("[data-stat-strip] button[aria-expanded]").first();
    if (await firstStat.count()) {
      await firstStat.click();
      await page.waitForTimeout(200);
      const open = await firstStat.getAttribute("aria-expanded");
      if (open !== "true") failures.push(`[${vpName}] ${path} stat expander did not open`);
    }

    // Switch bedroom filter to 2-bed and back.
    const bed2 = page.locator("[data-type-filter] button", { hasText: "2 bed" });
    if (await bed2.count()) {
      await bed2.click();
      await page.waitForTimeout(300);
      const pressed = await bed2.getAttribute("aria-pressed");
      if (pressed !== "true") failures.push(`[${vpName}] ${path} 2-bed filter not pressed`);
      await page.locator("[data-type-filter] button", { hasText: "All beds" }).click();
    }

    // Section F must be gone (letter heading, not a prose mention).
    const sectionF = await page.locator("text=/^F\\s*·\\s*Time horizons$/i").count();
    if (sectionF > 0) failures.push(`[${vpName}] ${path} still shows section F`);

    // Also reject the old F26 metric codes if they resurfaced.
    const f26 = await page.getByText("F26", { exact: false }).count();
    if (f26 > 0) failures.push(`[${vpName}] ${path} still shows F26 cards`);

    // Composition / cohort presence on rich suburb.
    if (name === "rich-suburb") {
      const comp = await page.getByText("Weekly composition", { exact: false }).count();
      if (comp < 1) failures.push(`[${vpName}] ${path} missing composition chart`);
      const moved = await page.getByText("What moved", { exact: false }).count();
      const added = await page.getByText("What was added", { exact: false }).count();
      if (moved < 1 || added < 1) failures.push(`[${vpName}] ${path} missing cohort panels`);
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
      path: `${OUT}_round2-${vpName}-${name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${OUT}_round2-${vpName}-${name}-fold.png` });
  }

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nRound 2 visual pass clean.");
