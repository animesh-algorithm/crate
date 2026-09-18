import { textFor, type Item, type Library, type Collection } from "./model";
import { cosine } from "./search";
export interface Group {
  name: string;
  ids: string[];
  parentName?: string;
  id?: string;
  description?: string;
  criteria?: string;
  origin?: "automatic" | "custom";
}
export function groupId(g: Group) {
  return (
    g.id ||
    `auto-${g.parentName ? g.parentName.toLocaleLowerCase() + "--" : ""}${g.name.toLocaleLowerCase()}`
  );
}
const topics: [string, string[]][] = [
  [
    "Humor & Memes",
    [
      "meme",
      "memes",
      "funny",
      "comedy",
      "humor",
      "humour",
      "joke",
      "jokes",
      "satire",
    ],
  ],
  [
    "Coding",
    [
      "coding",
      "code",
      "programming",
      "developer",
      "javascript",
      "typescript",
      "python",
      "software development",
    ],
  ],
  [
    "Study",
    [
      "study",
      "studying",
      "exam",
      "revision",
      "learning notes",
      "student",
      "school",
      "college",
    ],
  ],
  [
    "Productivity",
    [
      "productivity",
      "workflow",
      "focus",
      "habits",
      "time management",
      "planning",
      "routine",
    ],
  ],
  [
    "AI Tools",
    [
      "ai tools",
      "artificial intelligence",
      "chatgpt",
      "llm",
      "prompt engineering",
      "generative ai",
      "machine learning",
    ],
  ],
  [
    "Careers",
    [
      "career",
      "careers",
      "interview",
      "resume",
      "job search",
      "hiring",
      "workplace",
    ],
  ],
  [
    "Fitness",
    [
      "fitness",
      "workout",
      "exercise",
      "gym",
      "strength training",
      "running",
      "yoga",
    ],
  ],
  [
    "Food",
    [
      "food",
      "recipe",
      "recipes",
      "cooking",
      "pasta",
      "baking",
      "dinner",
      "breakfast",
    ],
  ],
  [
    "Fashion",
    ["fashion", "outfit", "style guide", "wardrobe", "streetwear", "clothing"],
  ],
  [
    "Design",
    [
      "design",
      "typography",
      "branding",
      "interiors",
      "graphic design",
      "illustration",
      "ui design",
    ],
  ],
  [
    "Travel",
    [
      "travel",
      "itinerary",
      "destination",
      "trip",
      "vacation",
      "backpacking",
      "tourism",
    ],
  ],
  [
    "Technology",
    ["technology", "gadgets", "hardware", "tech news", "devices", "smartphone"],
  ],
];
const noise = new Set(
  "but follow comment comments share subscribe link bio viral trending explore reels instagram ig content creator post posts like save followme fyp giveaway ad sponsored discount sale shop buy now check this that here there today tomorrow really very good great best new more your just things amazing watch read click learn tips".split(
    " ",
  ),
);
function normalized(value: string) {
  return ` ${value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()} `;
}
function matches(text: string, term: string) {
  return text.includes(normalized(term));
}
function evidence(item: Item, terms: string[]) {
  const caption = normalized(item.captions.join(" "));
  const hashtags = normalized(item.hashtags.join(" "));
  const personal = normalized([item.note, ...item.tags].join(" "));
  return terms.reduce(
    (score, term) =>
      score +
      (matches(caption, term) ? 2 : 0) +
      (matches(hashtags, term) ? 2 : 0) +
      (matches(personal, term) ? 3 : 0),
    0,
  );
}
function safeName(value: string) {
  const word = value
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .trim();
  return (
    word.length >= 4 &&
    word.length <= 35 &&
    !noise.has(word) &&
    !/\d{3,}|https|www|\.com|follow|comment|subscribe|promo/i.test(word) &&
    word.split(/\s+/).length <= 3
  );
}
const customStopwords = new Set(
  "about also because could from into just more only other should some that their them these those through using want where which while with would yours saved saves posts videos ideas things".split(
    " ",
  ),
);
function customTerms(category: { name: string; description: string }) {
  const phrases = [category.name, ...category.description.split(/[,;\n]/)]
    .map((s) => s.trim())
    .filter(Boolean);
  const words = normalized(phrases.join(" "))
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !customStopwords.has(word));
  const singular = words.map((word) =>
    word.endsWith("ies")
      ? `${word.slice(0, -3)}y`
      : word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
  );
  return [...new Set([...phrases, ...words, ...singular])];
}
export function customGroups(
  items: Item[],
  categories: { name: string; description: string }[],
): Group[] {
  return categories.map((category) => {
    const terms = customTerms(category);
    return {
      id: `custom-${normalized(category.name).trim().replace(/ /g, "-")}`,
      name: category.name,
      description: category.description,
      criteria: [category.name, category.description]
        .filter(Boolean)
        .join(", "),
      origin: "custom" as const,
      ids: items
        .filter((item) => !item.archived && evidence(item, terms) >= 2)
        .map((item) => item.id),
    };
  });
}
export function discover(
  items: Item[],
  vectors?: Map<string, number[]>,
): Group[] {
  const eligible = items.filter(
    (x) => !x.archived && textFor(x).trim().length >= 12,
  );
  const emergent = new Map<string, Set<string>>();
  for (const item of eligible)
    for (const tag of [...item.hashtags, ...item.tags]) {
      const name = tag.replace(/^#/, "").trim().toLocaleLowerCase();
      if (
        !safeName(name) ||
        topics.some(([, terms]) =>
          terms.some((t) => normalized(t) === normalized(name)),
        )
      )
        continue;
      const ids = emergent.get(name) || new Set<string>();
      ids.add(item.id);
      emergent.set(name, ids);
    }
  const definitions = [
    ...topics,
    ...[...emergent]
      .filter(([, ids]) => ids.size >= 5)
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 8)
      .map(
        ([name]) =>
          [name[0].toUpperCase() + name.slice(1), [name]] as [string, string[]],
      ),
  ];
  const candidates = definitions
    .map(([name, terms]) => {
      const anchors = eligible.filter((item) => evidence(item, terms) >= 2);
      const centroid =
        vectors && anchors.length >= 5
          ? anchors
              .map((x) => vectors.get(x.id))
              .filter((v): v is number[] => !!v)
          : [];
      const ranked = eligible
        .map((item) => {
          const ownCaption = terms.some((term) =>
            matches(normalized(item.captions.join(" ")), term),
          );
          const competingCaption = definitions.some(
            ([other, words]) =>
              other !== name &&
              words.some((term) =>
                matches(normalized(item.captions.join(" ")), term),
              ),
          );
          const direct =
            !ownCaption &&
            competingCaption &&
            !terms.some((term) =>
              matches(normalized([item.note, ...item.tags].join(" ")), term),
            )
              ? 0
              : evidence(item, terms);
          const vector = vectors?.get(item.id);
          const related =
            vector && centroid.length >= 5 && direct === 0 && !competingCaption
              ? centroid
                  .map((v) => cosine(vector, v))
                  .sort((a, b) => b - a)
                  .slice(0, 5)
              : [];
          const similarity = related.length
            ? related.reduce((a, b) => a + b, 0) / related.length
            : 0;
          return {
            id: item.id,
            score: direct || (similarity >= 0.84 ? similarity : 0),
          };
        })
        .filter((x) => x.score > 0);
      return { name, terms, ranked };
    })
    .filter((g) => g.ranked.filter((r) => r.score >= 2).length >= 5);
  const assigned = new Map<string, { name: string; score: number }[]>();
  for (const g of candidates)
    for (const r of g.ranked) {
      const list = assigned.get(r.id) || [];
      list.push({ name: g.name, score: r.score });
      assigned.set(r.id, list);
    }
  const groups = candidates
    .map((g) => ({
      name: g.name,
      criteria: g.terms.join(", "),
      origin: "automatic" as const,
      ids: g.ranked
        .filter((r) =>
          (assigned.get(r.id) || [])
            .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
            .slice(0, 3)
            .some((a) => a.name === g.name),
        )
        .map((r) => r.id),
    }))
    .filter((g) => g.ids.length >= 5);
  return groups
    .filter(
      (g, index) =>
        !groups.slice(0, index).some((other) => {
          const shared = g.ids.filter((id) => other.ids.includes(id)).length;
          return shared / Math.min(g.ids.length, other.ids.length) >= 0.85;
        }),
    )
    .sort((a, b) => b.ids.length - a.ids.length)
    .slice(0, 15);
}
export function applyGroups(
  l: Library,
  groups: Group[],
  options: { preserveExisting?: boolean } = {},
): Library {
  groups = groups.filter(
    (g) =>
      !l.suppressed.includes(groupId(g)) &&
      (!g.parentName ||
        !l.suppressed.includes(`auto-${g.parentName.toLocaleLowerCase()}`)),
  );
  const protectedIds = new Set(
    l.collections.filter((c) => c.manual).map((c) => c.id),
  );
  for (const c of l.collections)
    if (c.manual && c.parentId) protectedIds.add(c.parentId);
  for (const c of l.collections)
    if (c.parentId && protectedIds.has(c.parentId)) protectedIds.add(c.id);
  const manual = l.collections.filter(
      (c) => options.preserveExisting || protectedIds.has(c.id),
    ),
    collections: Collection[] = [...manual];
  for (const [index, g] of groups.entries()) {
    const id = groupId(g);
    const old = l.collections.find((c) => c.id === id);
    if (old && (options.preserveExisting || protectedIds.has(old.id))) continue;
    collections.push({
      id,
      name: g.name,
      parentId: g.parentName
        ? `auto-${g.parentName.toLocaleLowerCase()}`
        : null,
      manual: false,
      origin: g.origin || "automatic",
      description: g.description || "",
      criteria: g.criteria || "",
      style:
        old?.style ??
        [...id].reduce(
          (hash, char) => (hash * 31 + char.codePointAt(0)!) >>> 0,
          0,
        ) % 4,
    });
  }
  const valid = new Set(collections.map((c) => c.id));
  return {
    ...l,
    collections,
    items: l.items.map((x) => ({
      ...x,
      collections: [
        ...new Set([
          ...x.collections.filter((id) => manual.some((c) => c.id === id)),
          ...groups
            .filter((g) => g.ids.includes(x.id))
            .map(groupId)
            .filter(
              (id) =>
                valid.has(id) &&
                !protectedIds.has(id) &&
                !x.excluded.includes(id),
            )
            .slice(0, 3),
        ]),
      ],
      primaryCollection:
        x.primaryCollection &&
        valid.has(x.primaryCollection) &&
        x.collections.includes(x.primaryCollection)
          ? x.primaryCollection
          : groups.find(
                (g) =>
                  g.ids.includes(x.id) &&
                  valid.has(groupId(g)) &&
                  !x.excluded.includes(groupId(g)),
              )
            ? groupId(
                groups.find(
                  (g) =>
                    g.ids.includes(x.id) &&
                    valid.has(groupId(g)) &&
                    !x.excluded.includes(groupId(g)),
                )!,
              )
            : null,
    })),
  };
}

export function saveSuggestion(l: Library, group: Group): Library {
  const proposedId = groupId(group);
  if (l.suppressed.includes(proposedId))
    throw Error("This suggestion was previously dismissed.");
  const protectedCollection = l.collections.find(
    (c) => c.id === proposedId && c.manual,
  );
  const id = protectedCollection
    ? `auto-${normalized(group.name).trim().replace(/ /g, "-")}`
    : proposedId;
  if (
    protectedCollection &&
    (id === proposedId || l.collections.some((c) => c.id === id))
  )
    throw Error(
      "This collection has personal edits. Give the suggestion a different name to save it separately.",
    );
  if (l.suppressed.includes(id))
    throw Error("This suggestion was previously dismissed.");
  const old = l.collections.find((c) => c.id === id);
  const members = new Set(group.ids);
  const collection: Collection = {
    id,
    name: group.name,
    parentId: null,
    manual: false,
    origin: group.origin || "automatic",
    criteria: group.criteria || "",
    description: group.description || "",
    style:
      old?.style ??
      [...id].reduce((h, char) => (h * 31 + char.codePointAt(0)!) >>> 0, 0) % 4,
  };
  return {
    ...l,
    collections: old
      ? l.collections.map((c) => (c.id === id ? collection : c))
      : [...l.collections, collection],
    items: l.items.map((item) => {
      const permitted =
        members.has(item.id) &&
        !item.excluded.includes(id) &&
        !item.excluded.includes(proposedId);
      const existing = item.collections.filter((c) => c !== id);
      const next = permitted ? [...existing, id] : existing;
      return {
        ...item,
        collections: next,
        primaryCollection:
          item.primaryCollection === id
            ? permitted
              ? id
              : next[0] || null
            : item.primaryCollection || (permitted ? id : null),
      };
    }),
  };
}
