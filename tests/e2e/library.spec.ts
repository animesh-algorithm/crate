import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const exported = [
  {
    timestamp: 1700000000,
    media: [],
    fbid: "test",
    label_values: [
      { label: "URL", href: "https://www.instagram.com/reel/fixture01/" },
      {
        label: "Caption",
        value:
          "A pasta recipe with fresh tomato and basil, saved for a quiet weekend dinner.",
      },
      {
        title: "Owner",
        dict: [
          {
            title: "",
            dict: [
              { label: "Username", value: "test.kitchen" },
              { label: "Name", value: "Test Kitchen" },
              {
                label: "URL",
                value: "https://www.instagram.com/test.kitchen/",
              },
            ],
          },
        ],
      },
    ],
  },
];
test("imports, searches, edits, persists, exports, and honors reimport removals", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bring in my saves" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "saved_posts.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.getByText("new saves", { exact: true })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add to my library" }).click();
  await page.getByRole("link", { name: "All your saves" }).click();
  await page.getByRole("textbox", { name: "Search your saves" }).fill("pasta");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".save-card")).toHaveCount(1);
  await expect(
    page.locator(".save-card").getByText("Test Kitchen", { exact: true }),
  ).toBeVisible();
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-results/creator-card-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Read save by test.kitchen" }).click();
  await expect(
    page.getByRole("link", { name: "Creator website" }),
  ).toHaveAttribute("href", "https://www.instagram.com/test.kitchen/");
  await page.setViewportSize({ width: 375, height: 1000 });
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
    path: "test-results/creator-detail-375.png",
    fullPage: true,
  });
  await page.getByLabel("A note for later").fill("Try this on Sunday");
  await page.getByRole("button", { name: "Keep my note" }).click();
  await expect(page.getByRole("button", { name: "Note kept" })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("A note for later")).toHaveValue(
    "Try this on Sunday",
  );
  await page.getByRole("button", { name: "Add to favorites" }).click();
  await expect(
    page.getByRole("button", { name: "Remove from favorites" }),
  ).toBeVisible();
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my library" }).click();
  expect((await downloadPromise).suggestedFilename()).toContain("private.json");
  await page.goto("/save/fixture01");
  await page.getByRole("button", { name: "Remove save", exact: true }).click();
  await page.getByRole("button", { name: "Remove this save" }).click();
  await page.getByRole("button", { name: "Add saves" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "saved_posts.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(
    page.getByText("1 previously removed saves will stay removed."),
  ).toBeVisible();
});
test("demo collection editing and responsive accessible navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await expect(page.locator(".collection-tile")).toHaveCount(4);
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByLabel("Collection name").fill("A weekend project");
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(
    page.getByRole("link", { name: /A weekend project/ }),
  ).toBeVisible();
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    await page.screenshot({
      path: `test-results/library-${width}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Account and settings" }).click();
  await expect(
    page.getByRole("heading", { name: "Your account" }),
  ).toBeVisible();
});

test("moves out of an aggregated collection, merges, and undoes successive edits", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.getByRole("button", { name: "Create collection" }).click();
  await page.getByLabel("Collection name").fill("Deep breath");
  await page.getByLabel("Inside a collection").selectOption("demo-slow");
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/save/demo0");
  await page.getByRole("checkbox", { name: "Deep breath" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Deep breath" }),
  ).toBeChecked();
  await page.goto("/collection/demo-slow");
  await expect(page.locator(".save-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Select save by studio.notes" })
    .first()
    .click();
  await page.getByRole("button", { name: "Put in a collection" }).click();
  await page
    .getByRole("combobox", { name: "Collection", exact: true })
    .selectOption("new");
  await page.getByLabel("Name", { exact: true }).fill("For this weekend");
  await page
    .getByRole("combobox", { name: "Keep in this collection?", exact: true })
    .selectOption("move");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.locator(".save-card")).toHaveCount(1);
  await page.goto("/app");
  await page.getByRole("link", { name: /For this weekend/ }).click();
  await page.getByRole("button", { name: "Edit collection" }).click();
  await page.getByLabel("Collection name").fill("One calm weekend");
  await page.getByRole("button", { name: "Save collection" }).click();
  await expect(
    page.getByRole("heading", { name: "One calm weekend", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit collection" }).click();
  await page.getByLabel("Add these saves to").selectOption("demo-food");
  await page.getByRole("button", { name: "Merge collections" }).click();
  await expect(
    page.getByRole("heading", { name: "Around the table", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".save-card")).toHaveCount(3);
  await page.goto("/settings");
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(page.locator(".save-status")).toHaveText("Last change undone.");
  await expect(
    page.getByRole("button", { name: "Undo last change" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(page.locator(".save-status")).toHaveText("Last change undone.");
  await expect(
    page.getByRole("button", { name: "Undo last change" }),
  ).toBeEnabled();
  await page.goto("/app");
  await expect(
    page.getByRole("link", { name: /For this weekend/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /One calm weekend/ }),
  ).toHaveCount(0);
});

test("export and restore round-trip source and edits, and deletion clears undo history", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await expect(page.locator(".collection-tile")).toHaveCount(4);
  await page.goto("/settings");
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export my library" }).click();
  const file = await (await event).path();
  expect(file).not.toBeNull();
  await page
    .getByRole("button", { name: "Delete library", exact: true })
    .click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Permanently delete" }).click();
  await expect(
    page.getByRole("button", { name: "Bring in my saves" }),
  ).toBeVisible();
  await page.goto("/settings");
  await page.getByRole("button", { name: "Undo last change" }).click();
  await expect(page.locator(".save-status")).toHaveText(
    "No earlier change to undo.",
  );
  await page.locator("input[type=file]").setInputFiles(file!);
  await page
    .getByRole("button", { name: "Restore library", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/app");
  await expect(page.locator(".collection-tile")).toHaveCount(4);
  await page.goto("/save/demo0");
  await expect(
    page.getByRole("button", { name: "Remove from favorites" }),
  ).toBeVisible();
  await expect(page.locator(".full-caption")).toContainText("A quiet corner");
});

test("reel cards display a preview and open the player in a modal", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const OriginalWorker = window.Worker;
    window.Worker = class extends OriginalWorker {
      postMessage(message: unknown) {
        const data = message as { items?: { id: string }[] };
        if (data.items)
          setTimeout(
            () =>
              this.dispatchEvent(
                new MessageEvent("message", {
                  data: {
                    groups: [
                      {
                        name: "Recipes",
                        ids: data.items!.map((item) => item.id),
                      },
                    ],
                  },
                }),
              ),
            0,
          );
        else super.postMessage(message);
      }
    };
  });
  let requests = 0;
  await page.route("https://www.instagram.com/**", async (route) => {
    requests++;
    await route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><title>Preview fixture</title></head><body><p>Instagram player fixture</p></body></html>',
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Bring in my saves" }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "saved_posts.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(exported)),
  });
  await expect(page.getByText("new saves", { exact: true })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Add to my library" }).click();
  await page.getByRole("link", { name: "All your saves" }).click();
  const trigger = page.getByRole("button", { name: "Preview reel" });
  await expect(trigger).toBeVisible();
  await expect(page.locator(".reel-card-player iframe")).toHaveAttribute(
    "loading",
    "lazy",
  );
  await expect.poll(() => requests).toBeGreaterThanOrEqual(1);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
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
      path: `test-results/reel-card-${width}.png`,
      fullPage: true,
    });
  }

  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Reel preview" });
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.instagram.com/reel/fixture01/embed/",
  );
  await expect(
    dialog.getByRole("link", { name: "Open on Instagram" }),
  ).toHaveAttribute("href", exported[0].label_values[0].href!);
  await expect.poll(() => requests).toBeGreaterThanOrEqual(2);
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [768, 1000],
    [1024, 768],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await expect
      .poll(() => dialog.evaluate((el) => el.scrollHeight <= el.clientHeight))
      .toBe(true);
    await expect
      .poll(() =>
        dialog.locator("iframe").evaluate((el) => {
          const frame = el.getBoundingClientRect();
          const box = el.parentElement!.getBoundingClientRect();
          return frame.width <= box.width + 1 && frame.height <= box.height + 1;
        }),
      )
      .toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    expect(
      await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
    expect(
      (
        await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze()
      ).violations,
    ).toEqual([]);
    await page.screenshot({
      path: `test-results/reel-preview-${width}-${height}.png`,
      fullPage: true,
    });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".reel-card-player iframe")).toHaveCount(1);
  await expect(trigger).toBeFocused();
  await page.getByRole("link", { name: "Read save by test.kitchen" }).click();
  await page.getByRole("button", { name: "Preview reel" }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.goto("/app");
  await page.getByRole("link", { name: "Find connections" }).click();
  await page
    .getByRole("button", { name: "Use just the words", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Review Recipes", exact: true })
    .click();
  await page
    .locator(".proposal-saves")
    .getByRole("button", { name: "Preview reel" })
    .first()
    .click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Save collection" }),
  ).toBeVisible();
});
