import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("older local libraries open the custom-category page without crashing", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const request = indexedDB.open("crate-private-v1");
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("libraries", "readwrite");
      transaction.objectStore("libraries").put({
        id: "local",
        data: {
          version: 1,
          items: [],
          collections: [],
          tombstones: [],
          imports: [],
          revision: 0,
        },
        cloudRevision: 0,
        dirty: false,
        at: Date.now(),
      });
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    database.close();
  });
  await page.goto("/organize");
  await expect(
    page.getByText("There are no saves in this library to sort yet.", {
      exact: false,
    }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/organize-empty-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Choose my own categories →" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your categories, your way" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Something got in the way." }),
  ).toHaveCount(0);
});

test("review a draft on its own page, edit saves, and save one collection", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: unknown) {
        const data = message as { items?: { id: string }[] };
        if (data.items) {
          const ids = data.items.map((i) => i.id);
          setTimeout(
            () =>
              this.dispatchEvent(
                new MessageEvent("message", {
                  data: {
                    groups: [
                      { name: "Food", ids: ids.slice(0, 5) },
                      { name: "Design", ids: ids.slice(3) },
                    ],
                  },
                }),
              ),
            10,
          );
        } else super.postMessage(message);
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.getByRole("link", { name: "Find connections" }).click();
  await expect(page).toHaveURL(/\/organize$/);
  await page.getByRole("button", { name: "Use just the words" }).click();
  await expect(page.getByRole("button", { name: "Review Food" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Review Food" })).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    await expect(
      page.getByRole("heading", { name: /Your suggestions/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/organize-${width}.png`,
      fullPage: true,
    });
  }
  await page.keyboard.press("Tab");
  expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe(
    "BODY",
  );
  await page.getByRole("button", { name: "Review Food" }).click();
  await expect(page.locator(".proposal-saves article")).toHaveCount(5);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/organize-review-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("textbox", { name: "Collection name" })
    .fill("Sunday food");
  await page
    .getByRole("button", { name: "Remove from suggestion" })
    .first()
    .click();
  await expect(page.locator(".proposal-saves article")).toHaveCount(4);
  await page.reload();
  await page.getByRole("button", { name: "Review Sunday food" }).click();
  await expect(page.locator(".proposal-saves article")).toHaveCount(4);
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(
    page.getByRole("button", { name: "Review Design" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Your library has changed since this proposal/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review Sunday food" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: /Your library/ }).click();
  await expect(page.getByRole("link", { name: /Sunday food/ })).toBeVisible();
});

test("custom categories stay exclusive and account-scoped", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.getByRole("link", { name: "Find connections" }).click();
  await page.getByRole("button", { name: "Use just the words" }).click();
  await expect(
    page.getByRole("heading", { name: /Your suggestions/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use my own categories" }).click();
  await expect(
    page.getByRole("heading", { name: "Your categories, your way" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Your suggestions/ }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "Category name" }),
  ).toBeFocused();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/organize-custom-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("textbox", { name: "Category name" }).fill("Pasta");
  await page
    .getByRole("textbox", { name: "Description (optional)" })
    .fill("Recipes I want to cook for dinner");
  await page
    .getByRole("button", { name: "Find saves for these categories" })
    .click();
  await expect(
    page.getByRole("button", { name: "Review Pasta" }),
  ).toBeVisible();
  await expect(page.locator(".suggestion-tile")).toHaveCount(1);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Review Pasta" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start a new proposal" }).click();
  await page
    .getByRole("button", { name: "Choose my own categories →" })
    .click();
  await expect(page.getByText("Pasta", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back to choices" }).click();
  await page.getByRole("button", { name: "Use just the words" }).click();
  await expect(
    page.getByText(/suggestions|No supported collections/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Start my own" }).click();
  await page.goto("/organize");
  await expect(
    page.getByRole("button", { name: "Use just the words" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Review Pasta" })).toHaveCount(
    0,
  );
});

test("pausing grouping keeps the library unchanged and a later run can finish", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (String(url).includes("organize.worker")) {
          let callback: ((event: MessageEvent) => void) | null = null;
          Object.defineProperty(this, "onmessage", {
            set(value) {
              callback = value;
            },
          });
          this.addEventListener("message", (event) =>
            setTimeout(() => callback?.(event), 900),
          );
        }
      }
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.getByRole("link", { name: "Find connections" }).click();
  await page.getByRole("button", { name: "Use just the words" }).click();
  await expect(
    page.getByRole("heading", { name: "Putting your suggestions together" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause for now" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Paused. Your progress is saved.",
  );
  await page.getByRole("button", { name: "Use just the words" }).click();
  await expect(
    page.getByRole("heading", { name: /Your suggestions/ }),
  ).toBeVisible();
});
