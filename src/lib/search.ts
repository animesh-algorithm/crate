import MiniSearch from "minisearch";
import { textFor, type Item, type Collection } from "./model";
export function exactSearch(
  items: Item[],
  collections: Collection[],
  query: string,
): Item[] {
  if (!query.trim()) return items;
  const names = new Map(collections.map((c) => [c.id, c.name]));
  const engine = new MiniSearch({
    fields: ["text", "creator", "url", "collections"],
    storeFields: ["id"],
    searchOptions: { prefix: true, fuzzy: 0.15, boost: { creator: 2 } },
  });
  engine.addAll(
    items.map((x) => ({
      id: x.id,
      text: textFor(x),
      creator: [x.creator, x.creatorName].filter(Boolean).join(" "),
      url: x.url,
      collections: x.collections.map((c) => names.get(c) || "").join(" "),
    })),
  );
  const ids = new Map(items.map((i) => [i.id, i]));
  return engine
    .search(query)
    .flatMap((r) => (ids.has(String(r.id)) ? [ids.get(String(r.id))!] : []));
}
export function cosine(a: number[], b: number[]) {
  let sum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) sum += a[i] * b[i];
  return sum;
}
export function hybridSearch(
  exact: Item[],
  items: Item[],
  vectors: Map<string, number[]>,
  query: number[],
): Item[] {
  const scores = new Map<string, number>();
  exact.slice(0, 50).forEach((x, i) => scores.set(x.id, 1 / (60 + i)));
  items
    .filter((x) => vectors.has(x.id))
    .map((x) => ({ x, score: cosine(vectors.get(x.id)!, query) }))
    .filter((x) => x.score >= 0.72)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50)
    .forEach(({ x }, i) =>
      scores.set(x.id, (scores.get(x.id) || 0) + 1 / (60 + i)),
    );
  const ids = new Map(items.map((i) => [i.id, i]));
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .flatMap(([id]) => (ids.has(id) ? [ids.get(id)!] : []));
}
