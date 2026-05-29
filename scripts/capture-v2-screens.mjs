/**
 * Real Chromium screenshots for /v2 (Playwright).
 * Run with dev server: `npm run dev` on port 3000, then `node scripts/capture-v2-screens.mjs`.
 */
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "assets", "screenshots");
const base = process.env.CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

await page.goto(`${base}/v2`, { waitUntil: "commit", timeout: 120_000 });
await page.waitForTimeout(2500);

await page.waitForSelector(".mapboxgl-canvas", { timeout: 90_000, state: "attached" }).catch(async () => {
  await page.screenshot({ path: path.join(outDir, "_debug-no-canvas.png") });
  await browser.close();
  throw new Error("Map canvas did not appear — see _debug-no-canvas.png");
});

// Splash fades out after encrypted text + dwell; wait until Market Meerkat overlay is gone.
await page.waitForFunction(
  () => !document.body.innerText.includes("Market Meerkat"),
  null,
  { timeout: 120_000 },
).catch(() => {});

await page.waitForTimeout(1500);

const canvas = page.locator("canvas.mapboxgl-canvas").first();
await canvas.waitFor({ state: "visible", timeout: 60_000 });
const box = await canvas.boundingBox();
if (!box) throw new Error("map canvas has no bounding box");

async function hoverAreasUntilTooltip() {
  const grid = [];
  for (let u = 0.2; u <= 0.85; u += 0.075) {
    for (let v = 0.2; v <= 0.85; v += 0.075) {
      grid.push([box.x + box.width * u, box.y + box.height * v]);
    }
  }
  for (const [x, y] of grid) {
    await page.mouse.move(x, y);
    await page.waitForTimeout(180);
    const has = await page.locator("text=/suburbs · click to drill/i").count();
    if (has > 0) return;
  }
}

await hoverAreasUntilTooltip();
await page.waitForTimeout(400);
await page.screenshot({
  path: path.join(outDir, "v2-area-hovered.png"),
  fullPage: false,
});

await page.mouse.click(box.x + box.width * 0.45, box.y + box.height * 0.52);
await page.waitForTimeout(3500);

const inner = { w: box.width * 0.6, h: box.height * 0.55 };
const originX = box.x + box.width * 0.22;
const originY = box.y + box.height * 0.28;
let clicked = false;
outer: for (let u = 0.12; u <= 0.92; u += 0.06) {
  for (let v = 0.12; v <= 0.92; v += 0.06) {
    await page.mouse.click(originX + inner.w * u, originY + inner.h * v);
    await page.waitForTimeout(550);
    const pill = await page.getByText(/^Focus:/).count();
    if (pill > 0) {
      clicked = true;
      break outer;
    }
  }
}
if (!clicked) {
  await page.screenshot({
    path: path.join(outDir, "v2-suburb-focus-miss.png"),
    fullPage: false,
  });
}
await page.waitForTimeout(800);
await page.screenshot({
  path: path.join(outDir, "v2-suburb-focus-pill.png"),
  fullPage: false,
});

await browser.close();
