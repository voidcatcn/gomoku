import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const base = process.env.APP_URL ?? "http://localhost:5173";
const out = resolve("screenshots");
await mkdir(out, { recursive: true });

const browser = await chromium.launch();
const errors = [];

async function makePage(width, height, scale = 2) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: scale,
    colorScheme: "light",
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator("main").waitFor({ state: "visible" });
  await page
    .evaluate(() => Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]))
    .catch(() => undefined);
  await page.waitForTimeout(600);
  return { context, page };
}

const desktop = await makePage(1440, 1000);
await desktop.page.screenshot({ path: resolve(out, "desktop-light.png") });

// Place a few stones so the board and move record have content.
const points = [112, 96, 113, 111, 128, 97, 143, 82, 158];
for (const point of points) {
  const cell = desktop.page.locator(`[data-point="${point}"]`);
  const interactive = await cell.isEnabled();
  if (!interactive) break;
  await cell.click({ force: true });
  await desktop.page.waitForTimeout(800);
}
await desktop.page.waitForTimeout(800);
await desktop.page.screenshot({ path: resolve(out, "desktop-play.png") });

await desktop.page.getByRole("banner").getByRole("button", { name: "开始新对局" }).click();
await desktop.page.waitForTimeout(500);
await desktop.page.screenshot({ path: resolve(out, "desktop-new-game.png") });
await desktop.page.keyboard.press("Escape");

await desktop.page.keyboard.press("d");
await desktop.page.waitForTimeout(700);
await desktop.page.screenshot({ path: resolve(out, "desktop-dark.png") });

const mobile = await makePage(390, 844, 2);
await mobile.page.screenshot({
  path: resolve(out, "mobile-light.png"),
  fullPage: true,
});
await mobile.page.keyboard.press("?");
await mobile.page.waitForTimeout(500);
await mobile.page.screenshot({
  path: resolve(out, "mobile-help.png"),
  fullPage: true,
});

console.log(
  JSON.stringify(
    {
      errors,
      desktopTitle: await desktop.page.title(),
      mobileHeight: await mobile.page.evaluate(() => document.documentElement.scrollHeight),
    },
    null,
    2,
  ),
);

await browser.close();
