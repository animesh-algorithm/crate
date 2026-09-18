import "fake-indexeddb/auto";
import { describe, it, expect, afterAll } from "vitest";
import { db, saveLocal, loadLocal, clearLocal } from "../src/lib/db";
import { emptyLibrary } from "../src/lib/model";
import { parseExport, commitImport } from "../src/lib/import";
afterAll(() => db.close());
describe("durable device state", () => {
  it("opens older libraries with new organization fields safely defaulted", async () => {
    const owner = "legacy-organization-fixture";
    const legacy = emptyLibrary();
    const {
      customCategories: _categories,
      suppressed: _suppressed,
      ...data
    } = legacy;
    await db.libraries.put({
      id: owner,
      data: data as typeof legacy,
      cloudRevision: 0,
      dirty: false,
      at: Date.now(),
    });
    const opened = await loadLocal(owner);
    expect(opened.data.customCategories).toEqual([]);
    expect(opened.data.suppressed).toEqual([]);
    expect((await db.libraries.get(owner))?.data).not.toHaveProperty(
      "customCategories",
    );
    await clearLocal(owner);
  });
  it("rejects stale tab changes without losing the last durable edit", async () => {
    const owner = "storage-fixture";
    const a = emptyLibrary();
    await saveLocal(owner, a, 0, false);
    const b = {
      ...a,
      revision: 1,
      collections: [
        {
          id: "mine",
          name: "A durable edit",
          parentId: null,
          manual: true,
          style: 0,
        },
      ],
    };
    await saveLocal(owner, b, 0, false, a);
    await expect(
      saveLocal(owner, { ...a, revision: 1 }, 0, false, a),
    ).rejects.toThrow("another tab");
    expect((await loadLocal(owner)).data.collections[0].name).toBe(
      "A durable edit",
    );
    await clearLocal(owner);
  });
  it("prunes vectors for removed items and clears all private account stores", async () => {
    const owner = "vector-fixture";
    const p = await parseExport(
      JSON.stringify([
        {
          label_values: [
            { label: "URL", value: "https://www.instagram.com/p/fixture/" },
          ],
        },
      ]),
    );
    const l = commitImport(emptyLibrary(), p, "fixture");
    await saveLocal(owner, l, 0, false);
    await db.vectors.put({
      key: owner + ":fixture",
      owner,
      itemId: "fixture",
      hash: "h",
      values: [1, 0],
    });
    await db.proposals.put({
      owner,
      sourceRevision: l.revision,
      mode: "text",
      groups: [{ name: "Food", ids: ["fixture"] }],
      at: Date.now(),
    });
    await db.proposals.put({
      owner: "another-account",
      sourceRevision: 0,
      mode: "text",
      groups: [],
      at: Date.now(),
    });
    await saveLocal(owner, { ...emptyLibrary(), revision: 1 }, 0, false, l);
    expect(await db.vectors.where("owner").equals(owner).count()).toBe(0);
    expect(await db.history.where("owner").equals(owner).count()).toBe(1);
    await clearLocal(owner);
    expect(await db.libraries.get(owner)).toBeUndefined();
    expect(await db.history.where("owner").equals(owner).count()).toBe(0);
    expect(await db.proposals.get(owner)).toBeUndefined();
    expect(await db.proposals.get("another-account")).toBeDefined();
    await db.proposals.delete("another-account");
  });
});
