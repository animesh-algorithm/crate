import { z } from "zod";
export const MAX_SAVES = 5000;
export const MAX_TEXT_BYTES = 15 * 1024 * 1024;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const Intent = z.enum(["Learn", "Try", "Buy", "Visit", "Enjoy"]);
export type Intent = z.infer<typeof Intent>;
export const ItemSchema = z.object({
  id: z.string().max(150),
  url: z.string().url().max(2048),
  fbid: z.string().max(150).default(""),
  captions: z.array(z.string()).max(10),
  creator: z.string().max(500),
  creatorName: z.string().max(500).optional(),
  creatorUrl: z
    .string()
    .url()
    .max(2048)
    .refine((value) => {
      try {
        const url = new URL(value);
        return (
          ["https:", "http:"].includes(url.protocol) &&
          !url.username &&
          !url.password
        );
      } catch {
        return false;
      }
    })
    .optional(),
  language: z
    .string()
    .regex(/^[a-z]{3}$/)
    .nullable()
    .optional(),
  hashtags: z.array(z.string()).max(500),
  timestamp: z.number().nullable(),
  importedAt: z.number(),
  favorite: z.boolean().default(false),
  archived: z.boolean().default(false),
  note: z.string().max(10000).default(""),
  tags: z.array(z.string().max(100)).max(50).default([]),
  intent: Intent.nullable().default(null),
  collections: z.array(z.string()).default([]),
  excluded: z.array(z.string()).default([]),
  primaryCollection: z.string().nullable().optional(),
});
export type Item = z.infer<typeof ItemSchema>;
export const CollectionSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1).max(80),
  parentId: z.string().nullable(),
  manual: z.boolean(),
  style: z.number().int().min(0).max(3),
  description: z.string().max(500).optional(),
  origin: z.enum(["automatic", "custom", "manual"]).optional(),
  criteria: z.string().max(500).optional(),
});
export type Collection = z.infer<typeof CollectionSchema>;
export const ImportSchema = z.object({
  id: z.string(),
  name: z.string().max(255),
  at: z.number(),
  added: z.number(),
  updated: z.number(),
  skipped: z.number(),
});
export type ImportRecord = z.infer<typeof ImportSchema>;
export const CategorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().max(500).default(""),
});
export type Category = z.infer<typeof CategorySchema>;
export const LibrarySchema = z.object({
  version: z.literal(1),
  items: z.array(ItemSchema).max(MAX_SAVES),
  collections: z.array(CollectionSchema).max(500),
  tombstones: z.array(z.string()).max(50000),
  suppressed: z.array(z.string().max(200)).max(10000).default([]),
  imports: z.array(ImportSchema).max(100),
  customCategories: z.array(CategorySchema).max(50).default([]),
  revision: z.number().int().nonnegative(),
});
export type Library = z.infer<typeof LibrarySchema>;
export const emptyLibrary = (): Library => ({
  version: 1,
  items: [],
  collections: [],
  tombstones: [],
  suppressed: [],
  imports: [],
  customCategories: [],
  revision: 0,
});
export function validateLibrary(value: unknown): Library {
  const parsed = LibrarySchema.safeParse(value);
  if (!parsed.success)
    throw Error(
      "This library contains unsupported or oversized data. Use a valid Crate backup.",
    );
  const l = parsed.data;
  if (
    new Set(l.items.map((x) => x.id)).size !== l.items.length ||
    new Set(l.collections.map((x) => x.id)).size !== l.collections.length
  )
    throw Error("This backup contains duplicate identities.");
  const c = new Map(l.collections.map((x) => [x.id, x]));
  for (const x of l.collections)
    if (
      x.parentId &&
      (!c.has(x.parentId) || c.get(x.parentId)?.parentId || x.parentId === x.id)
    )
      throw Error("Collections may have only one level of subcollections.");
  for (const x of l.items) {
    if (canonicalUrl(x.url).id !== x.id)
      throw Error("A save identity does not match its Instagram link.");
    if (x.collections.some((id) => !c.has(id)))
      throw Error("This backup refers to a missing collection.");
    if (
      x.primaryCollection != null &&
      !x.collections.includes(x.primaryCollection)
    )
      throw Error("A primary collection must contain its save.");
  }
  if (new TextEncoder().encode(JSON.stringify(l.items)).length > MAX_TEXT_BYTES)
    throw Error("Your library exceeds the 15 MiB allowance.");
  return l;
}
export function canonicalUrl(raw: string): { id: string; url: string } {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    !["instagram.com", "www.instagram.com"].includes(u.hostname)
  )
    throw Error("Expected an Instagram post link.");
  const m = u.pathname.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)\/?$/);
  if (!m) throw Error("Expected an Instagram post, reel, or video link.");
  return { id: m[2], url: `https://www.instagram.com/${m[1]}/${m[2]}/` };
}
export function textFor(item: Item) {
  return [...item.captions, ...item.hashtags, item.note, ...item.tags].join(
    "\n",
  );
}
export function collectionItems(l: Library, id: string) {
  const ids = new Set([
    id,
    ...l.collections.filter((c) => c.parentId === id).map((c) => c.id),
  ]);
  return l.items.filter((x) => x.collections.some((c) => ids.has(c)));
}
export function withoutCollection(l: Library, id: string): Library {
  const ids = new Set([
    id,
    ...l.collections.filter((c) => c.parentId === id).map((c) => c.id),
  ]);
  return {
    ...l,
    suppressed: [...new Set([...l.suppressed, ...ids])],
    collections: l.collections.filter((c) => !ids.has(c.id)),
    items: l.items.map((x) => ({
      ...x,
      collections: x.collections.filter((c) => !ids.has(c)),
      primaryCollection: ids.has(x.primaryCollection || "")
        ? null
        : x.primaryCollection,
    })),
  };
}
export function mergeCollections(
  l: Library,
  from: string,
  to: string,
): Library {
  if (from === to) return l;
  const source = l.collections.find((c) => c.id === from),
    dest = l.collections.find((c) => c.id === to);
  if (!source || !dest || dest.parentId === from)
    throw Error("Choose a different collection.");
  const result = withoutCollection(l, from);
  const members = new Set(collectionItems(l, from).map((x) => x.id));
  return {
    ...result,
    collections: result.collections.map((c) =>
      c.id === to ? { ...c, manual: true } : c,
    ),
    items: result.items.map((x) =>
      members.has(x.id)
        ? {
            ...x,
            collections: [...new Set([...x.collections, to])],
            primaryCollection:
              x.primaryCollection === from ? to : x.primaryCollection,
          }
        : x,
    ),
  };
}
