import { expect, test } from "@playwright/test";

test("fits the viewport and the help dialog remains inside it", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
  await expect(page.getByRole("group", { name: "15 路五子棋棋盘" })).toBeVisible();

  await page.keyboard.press("?");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const box = await dialog.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeLessThanOrEqual(844);
  expect(box!.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "明白了" })).toBeVisible();

  await page.screenshot({ path: "screenshots/mobile-help.png" });
  await page.getByRole("button", { name: "明白了" }).click();
  await expect(dialog).toHaveCount(0);

  await page.getByRole("banner").getByRole("button", { name: "开始新对局" }).click();
  const newGame = page.getByRole("dialog");
  await expect(newGame).toBeVisible();
  const newGameBox = await newGame.boundingBox();
  expect(newGameBox).not.toBeNull();
  expect(newGameBox!.height).toBeLessThanOrEqual(844);
  expect(newGameBox!.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole("button", { name: "开始对局" })).toBeVisible();
  await page.getByRole("button", { name: "开始对局" }).click();
  await expect(newGame).toHaveCount(0);
  await expect(page.getByRole("group", { name: "15 路五子棋棋盘" })).toBeVisible();
});
