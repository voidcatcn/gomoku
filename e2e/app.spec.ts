import { expect, test, type Page } from "@playwright/test";

async function openNewGame(page: Page) {
  await page.getByRole("banner").getByRole("button", { name: "开始新对局" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

async function clickPoint(page: Page, point: number) {
  const cell = page.locator(`[data-point="${point}"]`);
  await expect(cell).toBeEnabled();
  const box = await cell.boundingBox();
  if (!box) throw new Error(`Board point ${point} has no layout box.`);
  // Board points intentionally disable pointer events; the board surface
  // resolves the nearest intersection from the tap coordinates.
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

test.describe("Lianzhu", () => {
  test("plays a move and the engine responds, then undo clears the pair", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("banner")).toContainText("连珠");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const moves = page.getByRole("listitem");
    await expect(moves).toHaveCount(0);

    await clickPoint(page, 112);
    await expect(moves).toHaveCount(1);
    await expect(moves.first()).toContainText("H8");
    await expect(moves).toHaveCount(2, { timeout: 12_000 });
    await expect(moves.last().locator('[data-color="2"]')).toBeAttached();

    await page.getByRole("button", { name: "悔棋", exact: true }).click();
    await expect(moves).toHaveCount(0);
    await expect(page.getByText("棋谱尚空")).toBeVisible();
  });

  test("local two-player mode alternates both colors and supports a 19-line board", async ({
    page,
  }) => {
    await page.goto("/");
    await openNewGame(page);
    await page.getByRole("radio", { name: /双人对弈/ }).click();
    await page.getByRole("radio", { name: /19 × 19/ }).click();
    await page.getByRole("button", { name: "开始对局" }).click();

    await expect(page.getByRole("group", { name: "19 路五子棋棋盘" })).toBeVisible();
    await expect(page.locator("[data-point]")).toHaveCount(361);
    await expect(page.getByText("双人同屏").first()).toBeVisible();

    const moves = page.getByRole("listitem");
    await clickPoint(page, 180);
    await expect(moves).toHaveCount(1);
    await clickPoint(page, 181);
    await expect(moves).toHaveCount(2);
    await expect(moves.nth(0).locator('[data-color="1"]')).toBeAttached();
    await expect(moves.nth(1).locator('[data-color="2"]')).toBeAttached();
    await expect(page.getByText("轮到黑方").first()).toBeVisible();

    // Reload: settings, board size and the record should survive.
    await page.reload();
    await expect(page.getByRole("group", { name: "19 路五子棋棋盘" })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(2);
  });

  test("choosing white lets the engine open the game", async ({ page }) => {
    await page.goto("/");
    await openNewGame(page);
    await page.getByRole("radio", { name: "入门 NOVICE" }).click();
    await page.getByRole("radio", { name: /执白/ }).click();
    await page.getByRole("button", { name: "开始对局" }).click();

    const moves = page.getByRole("listitem");
    await expect(moves).toHaveCount(1, { timeout: 12_000 });
    await expect(moves.first().locator('[data-color="1"]')).toBeAttached();
    await expect(page.getByRole("heading", { name: "轮到你落子" })).toBeVisible();
  });

  test("theme and help dialog work with the keyboard", async ({ page }) => {
    await page.goto("/");
    const html = page.locator("html");
    await expect(html).not.toHaveClass(/dark/);

    await page.keyboard.press("d");
    await expect(html).toHaveClass(/dark/);
    await page.reload();
    await expect(html).toHaveClass(/dark/);

    await page.keyboard.press("?");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("落子有道");
    await page.getByRole("button", { name: "明白了" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
