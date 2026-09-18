import { franc } from "franc-min";
import {
  canonicalUrl,
  ItemSchema,
  type Item,
  type Library,
  MAX_FILE_BYTES,
  MAX_SAVES,
  MAX_TEXT_BYTES,
  validateLibrary,
} from "./model";
export interface Issue {
  row: number;
  reason: string;
}
export interface Preview {
  items: Item[];
  issues: Issue[];
  duplicates: number;
  total: number;
  digest: string;
}
function strings(values: unknown[], label: string): string[] {
  const result: string[] = [];
  const visit = (entries: unknown[], depth: number) => {
    if (depth > 8) return;
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const x = entry as Record<string, unknown>;
      if (x.label === label && typeof x.value === "string" && x.value.trim())
        result.push(x.value.trim());
      if (Array.isArray(x.dict)) visit(x.dict, depth + 1);
    }
  };
  visit(values, 0);
  return result;
}
function nestedNames(
  values: unknown[],
  title: string,
  label: string,
): string[] {
  return values.flatMap((v) => {
    if (!v || typeof v !== "object") return [];
    const x = v as Record<string, unknown>;
    return x.title === title && Array.isArray(x.dict)
      ? strings(x.dict, label)
      : [];
  });
}
export async function parseExport(text: string): Promise<Preview> {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw Error("Choose a JSON file smaller than 25 MiB.");
  let root: unknown;
  try {
    root = JSON.parse(text);
  } catch {
    throw Error(
      "This file is not valid JSON. Export your saved posts as JSON and try again.",
    );
  }
  if (!Array.isArray(root))
    throw Error(
      "This export format is not supported. Choose saved_posts.json from your Instagram export.",
    );
  if (root.length > 50000) throw Error("This file has too many entries.");
  const entries = new Map<string, Item>(),
    issues: Issue[] = [];
  let duplicates = 0;
  root.forEach((entry: unknown, index) => {
    try {
      if (
        !entry ||
        typeof entry !== "object" ||
        !Array.isArray((entry as Record<string, unknown>).label_values)
      )
        throw Error("Unsupported entry format.");
      const e = entry as Record<string, unknown>,
        values = e.label_values as unknown[];
      const href = values.find(
        (v) =>
          v &&
          typeof v === "object" &&
          (v as Record<string, unknown>).label === "URL",
      ) as Record<string, unknown> | undefined;
      if (!href) throw Error("Missing Instagram link.");
      const { id, url } = canonicalUrl(String(href.href || href.value || ""));
      const captions = strings(values, "Caption");
      if (captions.length > 10 || captions.some((c) => c.length > 100000))
        throw Error("Caption data is too large.");
      const owner = values.find(
        (v) =>
          v &&
          typeof v === "object" &&
          (v as Record<string, unknown>).title === "Owner",
      ) as Record<string, unknown> | undefined;
      const ownerValues = Array.isArray(owner?.dict) ? owner.dict : [];
      const creator =
        strings(ownerValues, "Username")[0] ||
        strings(ownerValues, "Name")[0] ||
        "Unknown creator";
      const creatorName = strings(ownerValues, "Name")[0];
      const rawCreatorUrl = strings(ownerValues, "URL")[0];
      let creatorUrl: string | undefined;
      if (rawCreatorUrl) {
        try {
          const url = new URL(rawCreatorUrl);
          if (
            ["https:", "http:"].includes(url.protocol) &&
            !url.username &&
            !url.password &&
            rawCreatorUrl.length <= 2048
          )
            creatorUrl = rawCreatorUrl;
        } catch {
          /* Invalid source links remain non-clickable. */
        }
      }
      const hashtags = [...new Set(nestedNames(values, "Hashtags", "Name"))];
      const timestamp =
        typeof e.timestamp === "number" &&
        Number.isFinite(e.timestamp) &&
        e.timestamp > 0 &&
        e.timestamp < 253402300800
          ? e.timestamp
          : null;
      const item: Item = {
        id,
        url,
        fbid: typeof e.fbid === "string" ? e.fbid : "",
        captions,
        creator,
        creatorName,
        creatorUrl,
        language:
          captions.join(" ").length >= 80
            ? franc(captions.join(" "), { minLength: 80 })
            : null,
        hashtags,
        timestamp,
        importedAt: Date.now(),
        favorite: false,
        archived: false,
        note: "",
        tags: [],
        intent: null,
        collections: [],
        excluded: [],
      };
      if (entries.has(id)) {
        duplicates++;
        const previous = entries.get(id)!;
        item.captions = [...new Set([...previous.captions, ...captions])];
        item.hashtags = [...new Set([...previous.hashtags, ...hashtags])];
      }
      entries.set(id, ItemSchema.parse(item));
    } catch (error) {
      issues.push({
        row: index + 1,
        reason: error instanceof Error ? error.message : "Invalid entry.",
      });
    }
  });
  if (root.length && !entries.size)
    throw Error("No supported saved posts were found in this file.");
  const digest = Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
  return {
    items: [...entries.values()],
    issues,
    duplicates,
    total: root.length,
    digest,
  };
}
export function previewCounts(l: Library, p: Preview) {
  const ids = new Map(l.items.map((x) => [x.id, x]));
  let added = 0,
    updated = 0,
    unchanged = 0,
    removed = 0;
  for (const x of p.items) {
    if (l.tombstones.includes(x.id)) {
      removed++;
      continue;
    }
    const old = ids.get(x.id);
    if (!old) added++;
    else if (
      JSON.stringify([
        old.captions,
        old.hashtags,
        old.creator,
        old.creatorName,
        old.creatorUrl,
        old.timestamp,
      ]) !==
      JSON.stringify([
        x.captions,
        x.hashtags,
        x.creator,
        x.creatorName,
        x.creatorUrl,
        x.timestamp,
      ])
    )
      updated++;
    else unchanged++;
  }
  return { added, updated, unchanged, removed };
}
export function commitImport(l: Library, p: Preview, name: string): Library {
  const counts = previewCounts(l, p);
  if (l.items.length + counts.added > MAX_SAVES)
    throw Error(
      "This import would exceed your 5,000-save allowance. Nothing has been changed.",
    );
  const items = new Map(l.items.map((x) => [x.id, x]));
  for (const x of p.items) {
    if (l.tombstones.includes(x.id)) continue;
    const old = items.get(x.id);
    items.set(
      x.id,
      old
        ? {
            ...old,
            url: x.url,
            fbid: x.fbid || old.fbid,
            captions: x.captions,
            creator: x.creator,
            creatorName: x.creatorName,
            creatorUrl: x.creatorUrl,
            language: x.language,
            hashtags: x.hashtags,
            timestamp: x.timestamp,
          }
        : x,
    );
  }
  const next = {
    ...l,
    items: [...items.values()],
    imports: [
      {
        id: p.digest,
        name,
        at: Date.now(),
        added: counts.added,
        updated: counts.updated,
        skipped: p.issues.length + counts.removed,
      },
      ...l.imports.filter((i) => i.id !== p.digest),
    ].slice(0, 100),
  };
  if (
    new TextEncoder().encode(JSON.stringify(next.items)).length > MAX_TEXT_BYTES
  )
    throw Error(
      "This import would exceed your library’s 15 MiB allowance. Nothing has been changed.",
    );
  return validateLibrary(next);
}
