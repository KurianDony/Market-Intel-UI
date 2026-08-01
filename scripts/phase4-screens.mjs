/**
 * Phase-4 visual QA — logs in, walks the gate targets and captures screenshots
 * at desktop and phone widths.
 *
 *   MM_EMAIL=... MM_PASSWORD=... node scripts/phase4-screens.mjs [baseUrl]
 *
 * Screenshots land in assets/screenshots/_phase4-*.png (gitignored).
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
  ["rich-suburb-split-week", "/nsw/inner-west/strathfield?week=2026-05-04"],
  ["rich-suburb-week-before-gap", "/nsw/inner-west/strathfield?week=2026-06-29"],
  ["thin-suburb", "/nsw/newcastle/mayfield-west"],
  ["outside-capable-set", "/nsw/west/north-st-marys"],
  ["no-market-data", "/nsw/eastern-suburbs/point-piper"],
  ["area", "/nsw/inner-west"],
  ["area-split-week", "/nsw/inner-west?week=2026-06-15"],
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

  // Only the two Phase-4 pages are in scope — the post-login landing page is not,
  // and its suburb search logs an abort when we navigate away mid-fetch.
  let capturing = false;
  page.on("pageerror", (err) => {
    if (capturing) failures.push(`[${vpName}] pageerror: ${err.message}`);
  });
  page.on("console", (msg) => {
    if (capturing && msg.type() === "error") failures.push(`[${vpName}] console: ${msg.text()}`);
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
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
    const status = res?.status();
    if (status && status >= 400) failures.push(`[${vpName}] ${path} → HTTP ${status}`);

    if (page.url().includes("/auth/login")) {
      failures.push(`[${vpName}] ${path} bounced to login`);
      continue;
    }

    const heading = await page.locator("h1").first().textContent().catch(() => null);
    const cards = await page.locator("[aria-expanded]").count();
    const svgs = await page.locator("svg.recharts-surface").count();
    console.log(
      `[${vpName}] ${path} → ${status} · h1="${heading?.trim()}" · ${cards} metric cards · ${svgs} charts`,
    );

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
      path: `${OUT}_phase4-${vpName}-${name}.png`,
      fullPage: true,
    });
    await page.screenshot({ path: `${OUT}_phase4-${vpName}-${name}-fold.png` });
  }

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.log(`\n${failures.length} problem(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exit(1);
}
console.log("\nVisual pass clean.");
