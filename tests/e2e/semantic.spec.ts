import { test, expect } from "@playwright/test";
test("runs the pinned model locally and checkpoints normalized vectors", async ({
  page,
}) => {
  test.skip(
    !process.env.CRATE_MODEL_TEST,
    "Explicit opt-in: downloads model assets, no paid API.",
  );
  test.setTimeout(180000);
  const optionalBackendRequests: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("asyncify")) optionalBackendRequests.push(r.url());
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Take a look around/ }).click();
  await page.getByRole("link", { name: "Find connections" }).click();
  await page.getByRole("button", { name: "Find my interests" }).click();
  await expect(
    page.getByText(/Open a collection to review|No supported collections/),
  ).toBeVisible({ timeout: 150000 });
  const records = await page.evaluate(async () => {
    return new Promise<{ dimension: number; norm: number }[]>(
      (resolve, reject) => {
        const request = indexedDB.open("crate-private-v1");
        request.onerror = () => reject(Error("Database unavailable"));
        request.onsuccess = () => {
          const database = request.result;
          const transaction = database.transaction("vectors", "readonly");
          const all = transaction.objectStore("vectors").getAll();
          all.onsuccess = () => {
            resolve(
              all.result.map((v: { values: number[] }) => ({
                dimension: v.values.length,
                norm: Math.sqrt(v.values.reduce((s, n) => s + n * n, 0)),
              })),
            );
            database.close();
          };
          all.onerror = () => reject(Error("Cannot read checkpoints"));
        };
      },
    );
  });
  expect(optionalBackendRequests).toEqual([]);
  expect(records).toHaveLength(8);
  expect(
    records.every((r) => r.dimension === 384 && Math.abs(r.norm - 1) < 0.01),
  ).toBe(true);
  await page.goto("/search?q=quiet%20home");
  await page.getByRole("button", { name: "Look for related ideas" }).click();
  await expect(
    page.getByRole("button", { name: "Look for related ideas" }),
  ).toBeEnabled({ timeout: 30000 });
  expect(await page.locator(".save-card").count()).toBeGreaterThan(0);
});
