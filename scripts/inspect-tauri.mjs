import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const browser = await chromium.connectOverCDP("http://localhost:9222");
const pages = browser.contexts().flatMap((context) => context.pages());
const page = pages.find((candidate) => candidate.url().startsWith("http://tauri.localhost/"));
if (!page) throw new Error("Tauri webview not found on the CDP endpoint.");

await mkdir("screenshots", { recursive: true });

const info = await page.evaluate(() => {
  const board = document.querySelector(".board-surface");
  const panel = document.querySelector("aside");
  const grid = document.querySelector("main > div");
  return {
    inner: [innerWidth, innerHeight],
    dpr: devicePixelRatio,
    screen: [screen.width, screen.height],
    scroll: [document.documentElement.scrollWidth, document.documentElement.scrollHeight],
    gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : null,
    board: board?.getBoundingClientRect().toJSON() ?? null,
    panel: panel?.getBoundingClientRect().toJSON() ?? null,
    lg: matchMedia("(min-width: 1024px)").matches,
    font: getComputedStyle(document.body).fontFamily,
    url: location.href,
  };
});

await page.screenshot({ path: "screenshots/tauri-cdp.png" });
console.log(JSON.stringify(info, null, 2));
await browser.close();
