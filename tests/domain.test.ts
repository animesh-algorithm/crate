import { describe, it, expect } from "vitest";
import { parseExport, commitImport, previewCounts } from "../src/lib/import";
import {
  emptyLibrary,
  canonicalUrl,
  mergeCollections,
  withoutCollection,
  validateLibrary,
} from "../src/lib/model";
import {
  discover,
  applyGroups,
  customGroups,
  saveSuggestion,
} from "../src/lib/organize";
import { exactSearch } from "../src/lib/search";
function row(
  id = "Abc",
  caption = "A caption that has enough text to understand the saved idea.",
) {
  return {
    timestamp: 1700000000,
    fbid: "1",
    media: [],
    label_values: [
      {
        label: "URL",
        href: `https://www.instagram.com/reel/${id}/?utm_source=x`,
      },
      { label: "Caption", value: caption },
      {
        title: "Owner",
        dict: [{ label: "Username", value: "sample.creator" }],
      },
      { title: "Hashtags", dict: [{ label: "Name", value: "recipe" }] },
    ],
  };
}
describe("source-preserving imports", () => {
  it("canonicalizes identities while rejecting unsafe links", () => {
    expect(canonicalUrl("https://instagram.com/p/Abc/?x=y").id).toBe("Abc");
    for (const url of [
      "javascript:alert(1)",
      "https://instagram.com.evil.test/p/Abc/",
      "https://instagram.com/explore/",
      "http://instagram.com/p/Abc/",
    ])
      expect(() => canonicalUrl(url)).toThrow();
  });
  it("retains caption variants and skips broken entries with issues", async () => {
    const p = await parseExport(
      JSON.stringify([
        row(),
        row("Abc", "A second caption"),
        { label_values: [] },
      ]),
    );
    expect(p.items).toHaveLength(1);
    expect(p.items[0].captions).toHaveLength(2);
    expect(p.duplicates).toBe(1);
    expect(p.issues[0].row).toBe(3);
    expect(p.items[0].creator).toBe("sample.creator");
    expect(p.items[0].hashtags).toEqual(["recipe"]);
  });
  it("does not accept unrelated JSON or silently import invalid roots", async () => {
    await expect(parseExport("{}")).rejects.toThrow("not supported");
    await expect(parseExport("[{}]")).rejects.toThrow("No supported");
    await expect(parseExport("{")).rejects.toThrow("valid JSON");
  });
  it("preserves personal edits and absent items across reimports", async () => {
    let l = commitImport(
      emptyLibrary(),
      await parseExport(JSON.stringify([row(), row("Other")])),
      "a.json",
    );
    l.items[0].note = "My context";
    l.items[0].favorite = true;
    l.collections = [
      { id: "manual", name: "Mine", parentId: null, manual: true, style: 0 },
    ];
    l.items[0].collections = ["manual"];
    l.items[0].primaryCollection = "manual";
    l.customCategories = [{ name: "Anime", description: "Character art" }];
    const p = await parseExport(JSON.stringify([row("Abc", "Changed source")]));
    const next = commitImport(l, p, "b.json");
    expect(next.items).toHaveLength(2);
    expect(next.items[0]).toMatchObject({
      note: "My context",
      favorite: true,
      collections: ["manual"],
      primaryCollection: "manual",
      captions: ["Changed source"],
    });
    expect(previewCounts(next, p).unchanged).toBe(1);
    expect(validateLibrary(next).customCategories).toEqual(l.customCategories);
  });
  it("honors removals on reimport and rejects over-quota commits atomically", async () => {
    const p = await parseExport(JSON.stringify([row()]));
    const l = emptyLibrary();
    l.tombstones = ["Abc"];
    expect(commitImport(l, p, "a").items).toHaveLength(0);
    const large = emptyLibrary();
    large.items = Array.from({ length: 5000 }, (_, i) => ({
      ...p.items[0],
      id: `item${i}`,
      url: `https://www.instagram.com/p/item${i}/`,
    }));
    expect(() => commitImport(large, p, "a")).toThrow("5,000");
    expect(large.items).toHaveLength(5000);
  });
});
describe("library edits", () => {
  it("deleting a collection retains saves and merging unions memberships", async () => {
    const l = commitImport(
      emptyLibrary(),
      await parseExport(JSON.stringify([row()])),
      "a",
    );
    l.collections = [
      { id: "a", name: "A", parentId: null, manual: true, style: 0 },
      { id: "b", name: "B", parentId: null, manual: true, style: 1 },
    ];
    l.items[0].collections = ["a", "b"];
    expect(withoutCollection(l, "a").items[0].collections).toEqual(["b"]);
    expect(mergeCollections(l, "a", "b").items[0].collections).toEqual(["b"]);
    expect(mergeCollections(l, "a", "b").collections).toHaveLength(1);
  });
  it("does not recreate deleted automatic topics", async () => {
    const l = commitImport(
      emptyLibrary(),
      await parseExport(JSON.stringify([row()])),
      "a",
    );
    const groups = [{ name: "Recipes", ids: [l.items[0].id] }];
    const organized = applyGroups(l, groups);
    const deleted = withoutCollection(organized, organized.collections[0].id);
    expect(applyGroups(deleted, groups).collections).toHaveLength(0);
    expect(deleted.items).toHaveLength(1);
    expect(validateLibrary(deleted).suppressed).toHaveLength(1);
  });
  it("rejects invalid backups, cycles, and unsafe links", () => {
    const l = emptyLibrary();
    l.collections = [
      { id: "a", name: "A", parentId: "a", manual: true, style: 0 },
    ];
    expect(() => validateLibrary(l)).toThrow();
  });
  it("leaves insufficient evidence unclassified and preserves manual choices", async () => {
    let l = commitImport(
      emptyLibrary(),
      await parseExport(
        JSON.stringify(
          Array.from({ length: 12 }, (_, i) =>
            row(
              `id${i}`,
              i < 6
                ? "A pasta recipe with tomatoes garlic and fresh basil for Sunday lunch."
                : "A typography design with original letterforms and a printed editorial poster.",
            ),
          ),
        ),
      ),
      "a",
    );
    const groups = discover(l.items);
    expect(groups.length).toBeGreaterThan(0);
    l.collections = [
      {
        id: "mine",
        name: "My recipes",
        parentId: null,
        manual: true,
        style: 0,
      },
    ];
    l.items[0].collections = ["mine"];
    l = applyGroups(l, groups);
    expect(l.items[0].collections).toContain("mine");
    expect(
      discover([{ ...l.items[0], captions: [], hashtags: [], note: "" }]),
    ).toHaveLength(0);
  });
  it("searches user context and collection names", async () => {
    const l = commitImport(
      emptyLibrary(),
      await parseExport(JSON.stringify([row()])),
      "a",
    );
    l.items[0].note = "Weekend breakfast";
    expect(exactSearch(l.items, [], "breakfast")).toHaveLength(1);
    expect(exactSearch(l.items, [], "unknownzzzz")).toHaveLength(0);
  });
});

it("discovers vector-backed communities without a fixed topic taxonomy", async () => {
  const p = await parseExport(
    JSON.stringify(
      Array.from({ length: 10 }, (_, i) =>
        row(
          `vector${i}`,
          i < 5
            ? "A thoughtful pasta recipe with tomatoes and basil to share on Sunday."
            : "An original typography poster with printed letterforms for design inspiration.",
        ),
      ),
    ),
  );
  const vectors = new Map(
    p.items.map((x, i) => [x.id, i < 5 ? [1, 0] : [0, 1]]),
  );
  const groups = discover(p.items, vectors);
  expect(groups).toHaveLength(2);
  expect(groups.every((g) => g.ids.length === 5)).toBe(true);
});

it("rejects calls to action and merges humor synonyms while keeping neighboring interests separate", async () => {
  const captions = [
    ...Array.from(
      { length: 6 },
      (_, i) =>
        `A ${["meme", "funny", "comedy"][i % 3]} joke about Monday. Follow and comment for more!`,
    ),
    ...Array.from(
      { length: 5 },
      () => "Study for my exam with revision notes.",
    ),
    ...Array.from(
      { length: 5 },
      () => "Productivity workflow and focus habits.",
    ),
    ...Array.from(
      { length: 5 },
      () => "AI tools with ChatGPT and generative AI.",
    ),
    "But follow comment subscribe now",
  ];
  const p = await parseExport(
    JSON.stringify(
      captions.map((caption, i) => {
        const entry = row(`topic${i}`, caption);
        entry.label_values = entry.label_values.filter(
          (v) => v.title !== "Hashtags",
        );
        return entry;
      }),
    ),
  );
  const groups = discover(p.items);
  expect(groups.map((g) => g.name).sort()).toEqual([
    "AI Tools",
    "Humor & Memes",
    "Productivity",
    "Study",
  ]);
  expect(groups.find((g) => g.name === "Humor & Memes")?.ids).toHaveLength(6);
  expect(groups.every((g) => !g.ids.includes("topic21"))).toBe(true);
});

it("lets supported personal interests emerge while rejecting promotional hashtags and limiting overlap", async () => {
  const p = await parseExport(
    JSON.stringify(
      Array.from({ length: 7 }, (_, i) => {
        const entry = row(
          `anime${i}`,
          "Character arc and an animated story worth revisiting. Follow for more and comment below.",
        );
        entry.label_values = entry.label_values.filter(
          (v) => v.title !== "Hashtags",
        );
        entry.label_values.push({
          title: "Hashtags",
          dict: [
            { label: "Name", value: "anime" },
            { label: "Name", value: "follow" },
            { label: "Name", value: "comment" },
          ],
        } as never);
        return entry;
      }),
    ),
  );
  const groups = discover(p.items);
  expect(groups.map((g) => g.name)).toEqual(["Anime"]);
  expect(groups[0].ids).toHaveLength(7);
  expect(
    p.items.every(
      (item) => groups.filter((g) => g.ids.includes(item.id)).length <= 3,
    ),
  ).toBe(true);
});

it("keeps custom proposals exclusive, protects exclusions and older manual membership on replacement", async () => {
  const p = await parseExport(
    JSON.stringify(
      Array.from({ length: 8 }, (_, i) =>
        row(
          `custom${i}`,
          i < 6 ? "Anime scenes and character art" : "A sparse caption",
        ),
      ),
    ),
  );
  const l = commitImport(emptyLibrary(), p, "custom.json");
  const groups = customGroups(l.items, [
    { name: "Anime", description: "character art" },
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].ids).toHaveLength(6);
  const g = { ...groups[0], ids: groups[0].ids.slice(0, 5) };
  let next = saveSuggestion(l, g);
  next.items[0].excluded.push(g.id!);
  next.items[0].collections = [];
  next.items[0].primaryCollection = null;
  next = saveSuggestion(next, { ...g, ids: groups[0].ids });
  expect(next.items[0].collections).toEqual([]);
  expect(next.items[5].collections).toEqual([g.id]);
  expect(next.items[6].collections).toEqual([]);
  expect(validateLibrary(next).customCategories).toEqual([]);
  next.customCategories = [{ name: "Anime", description: "Character art" }];
  const restored = validateLibrary(JSON.parse(JSON.stringify(next)));
  expect(restored.customCategories).toEqual(next.customCategories);
  expect(restored.items[5].primaryCollection).toBe(g.id);
  expect(restored.collections[0].criteria).toBe("Anime, character art");
});

it("uses ordinary description words for a personal category without inventing other categories", async () => {
  const p = await parseExport(
    JSON.stringify([
      row("dinner1", "A simple recipe for tomato pasta"),
      row("dinner2", "A quick recipe for family pasta"),
      row("other1", "A mountain train trip"),
    ]),
  );
  const l = commitImport(emptyLibrary(), p, "personal.json");
  for (const item of l.items) item.hashtags = [];
  const groups = customGroups(l.items, [
    {
      name: "Weeknight dinners",
      description: "Recipes I want to cook at home",
    },
  ]);
  expect(groups).toHaveLength(1);
  expect(groups[0].ids).toEqual(["dinner1", "dinner2"]);
  expect(groups[0].criteria).toBe(
    "Weeknight dinners, Recipes I want to cook at home",
  );
});

it("does not replace a personally edited collection with a matching proposal", async () => {
  const p = await parseExport(
    JSON.stringify([row("protected", "A food recipe with pasta")]),
  );
  const l = commitImport(emptyLibrary(), p, "protected.json");
  l.collections = [
    { id: "auto-food", name: "Food", parentId: null, manual: true, style: 0 },
  ];
  l.items[0].collections = ["auto-food"];
  l.items[0].primaryCollection = "auto-food";
  expect(() => saveSuggestion(l, { name: "Food", ids: ["protected"] })).toThrow(
    "personal edits",
  );
  const next = saveSuggestion(l, {
    name: "Sunday food",
    id: "auto-food",
    ids: ["protected"],
  });
  expect(next.collections.find((c) => c.id === "auto-food")?.manual).toBe(true);
  expect(next.items[0].collections).toEqual(["auto-food", "auto-sunday-food"]);
  expect(next.items[0].primaryCollection).toBe("auto-food");
});

it("reads nested export owner and hashtag fields without following owner URLs", async () => {
  const entry = row("Nested");
  entry.label_values = [
    { label: "URL", href: "https://instagram.com/p/Nested/" },
    { label: "Caption", value: "Original caption" },
    {
      title: "Owner",
      dict: [
        {
          title: "",
          dict: [
            { label: "Username", value: "nested.creator" },
            { label: "Name", value: "Creator name" },
            { label: "URL", value: "javascript:do-not-follow" },
          ],
        },
      ],
    },
    {
      title: "Hashtags",
      dict: [{ title: "", dict: [{ label: "Name", value: "pasta" }] }],
    },
  ] as unknown as typeof entry.label_values;
  const preview = await parseExport(JSON.stringify([entry]));
  expect(preview.items[0].creator).toBe("nested.creator");
  expect(preview.items[0].creatorName).toBe("Creator name");
  expect(preview.items[0].creatorUrl).toBeUndefined();
  const valid = await parseExport(
    JSON.stringify([entry]).replace(
      "javascript:do-not-follow",
      "https://www.instagram.com/nested.creator/",
    ),
  );
  const original = commitImport(emptyLibrary(), preview, "original.json");
  original.items[0].note = "My note";
  const updated = commitImport(original, valid, "updated.json");
  expect(updated.items[0].creatorUrl).toBe(
    "https://www.instagram.com/nested.creator/",
  );
  expect(updated.items[0].note).toBe("My note");
  updated.items[0].creatorUrl = "javascript:alert(1)";
  expect(() => validateLibrary(updated)).toThrow();
  expect(preview.items[0].hashtags).toEqual(["pasta"]);
});

it("adding reviewed proposals preserves existing collections and memberships", async () => {
  let library = commitImport(
    emptyLibrary(),
    await parseExport(JSON.stringify([row()])),
    "fixture",
  );
  library = applyGroups(library, [{ name: "Existing", ids: ["Abc"] }]);
  library = applyGroups(
    library,
    [
      { name: "New", ids: ["Abc"] },
      { name: "Child", parentName: "New", ids: ["Abc"] },
    ],
    { preserveExisting: true },
  );
  expect(library.collections.map((c) => c.name)).toEqual([
    "Existing",
    "New",
    "Child",
  ]);
  expect(library.items[0].collections).toEqual([
    "auto-existing",
    "auto-new",
    "auto-new--child",
  ]);
  expect(validateLibrary(library)).toEqual(library);
});
