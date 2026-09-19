import { test, expect, devices } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("landing page uses one CTA per section, enters the sample, and preserves legacy routes", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /You saved it for a reason/ }),
  ).toBeVisible();
  await expect(page.locator(".marketing-nav").getByRole("link", { name: "Organize my saves" })).toHaveCount(1);
  await expect(page.locator(".marketing-hero").getByRole("button", { name: "Organize my saves" })).toHaveCount(1);
  await expect(page.locator(".marketing-finale").getByRole("link", { name: "Organize my saves" })).toHaveCount(1);
  await page.locator(".marketing-hero").getByRole("button", { name: "Organize my saves" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByRole("heading", { name: /Your Instagram saves/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue with Google" }).click();
  await expect(page.getByRole("alert")).toContainText("Online accounts are not configured");
  await page.getByRole("button", { name: "Explore a sample library" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.locator(".collection-tile")).toHaveCount(4);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Open Crate" })).toHaveCount(0);

  for (const path of [
    "/search?q=pasta",
    "/saves?view=favorites",
    "/organize",
    "/settings",
    "/help",
    "/privacy",
    "/terms",
    "/collection/demo-food?sort=oldest",
    "/save/demo0?from=home",
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(`/app${path}`);
  }
});

test("interactive demos support form, keyboard placement, and one tracked save", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("textbox", { name: "What do you remember?" });
  await search.fill("");
  await search.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Try describing anything you remember about the save.",
  );
  await search.fill("tiny menu");
  await page.getByRole("button", { name: "Search demonstration" }).click();
  await expect(
    page.locator(".search-result").getByText("Bar Sera"),
  ).toBeVisible();
  await expect(page.locator('[data-testid="bar-sera-card"]')).toHaveCount(1);

  const card = page.getByRole("button", { name: /Lemon pasta save/ });
  await card.focus();
  await card.press("Enter");
  await expect(page.getByText("27 saves")).toBeVisible();
  await expect(page.getByText("Lemon pasta was placed in Recipes.")).toHaveText(
    "Lemon pasta was placed in Recipes.",
  );
  await page.getByRole("button", { name: "Reset demo" }).click();
});

test("desktop story uses illustrated chapters without scroll-driven state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const story = page.locator(".story");
  await expect(story.locator(".story-chapter")).toHaveCount(3);
  await expect(story.locator(".chapter-illustration")).toHaveCount(3);
  await expect(story.locator(".mini-scrap")).toHaveCount(5);
  await expect(story.locator(".sort-label")).toHaveCount(4);
  await expect(story).not.toHaveCSS("position", "sticky");
  await story.locator(".story-chapter-find").scrollIntoViewIfNeeded();
  await expect(story.locator('[data-testid="bar-sera-card"]')).toBeVisible();
  await page.screenshot({
    path: "test-results/marketing-illustrated-story.png",
    fullPage: true,
  });
});

test("landing page is local-media-only, responsive, accessible, and reduced-motion safe", async ({
  page,
}) => {
  const externalMedia: string[] = [];
  page.on("request", (request) => {
    if (
      request.resourceType() === "image" &&
      new URL(request.url()).hostname !== "127.0.0.1"
    )
      externalMedia.push(request.url());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator(".story")).toHaveCSS("height", /auto|\d+px/);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/marketing-${width}.png`,
      fullPage: true,
    });
  }
  expect(externalMedia).toEqual([]);
});

test("touch drag can place the demonstration save", async ({ browser }) => {
  const context = await browser.newContext({ ...devices["iPhone 13"] });
  const page = await context.newPage();
  await page.goto("/");
  const card = page.getByRole("button", { name: /Lemon pasta save/ });
  const target = page.locator(".drop-collection");
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.touchscreen.tap(from!.x + 20, from!.y + 20);
  await page.dispatchEvent(".throw-card", "pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: from!.x + 20,
    clientY: from!.y + 20,
  });
  await page.dispatchEvent(".throw-card", "pointermove", {
    pointerId: 1,
    pointerType: "touch",
    clientX: to!.x + 80,
    clientY: to!.y + 80,
  });
  await page.dispatchEvent(".throw-card", "pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: to!.x + 80,
    clientY: to!.y + 80,
  });
  await expect(page.getByText("27 saves")).toBeVisible();
  await context.close();
});
