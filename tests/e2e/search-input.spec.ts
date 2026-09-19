import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("searches only after submission, without interrupting typing", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.goto("/app/search");
  const input = page.getByRole("textbox", { name: "Search your saves" });
  await input.pressSequentially("recipe", { delay: 20 });
  await expect(input).toHaveValue("recipe");
  await expect(input).toBeFocused();
  await page.waitForTimeout(450);
  await expect(page).toHaveURL(/\/app\/search$/);

  await input.press("Enter");
  await expect(page).toHaveURL(/\/app\/search\?q=recipe$/);
  await page.reload();
  await expect(input).toHaveValue("recipe");
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/search-${width}.png`,
      fullPage: true,
    });
  }
});
