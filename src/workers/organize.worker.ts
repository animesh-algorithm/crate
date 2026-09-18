import { discover, groupId } from "../lib/organize";
import type { Item } from "../lib/model";
self.onmessage = (
  e: MessageEvent<{
    items: Item[];
    vectors?: Map<string, number[]>;
    suppressed?: string[];
  }>,
) => {
  try {
    const lookup = new Map(e.data.items.map((x) => [x.id, x]));
    const candidates = discover(e.data.items, e.data.vectors)
      .map((g) => ({
        ...g,
        ids: g.ids.filter(
          (id) => !lookup.get(id)?.excluded.includes(groupId(g)),
        ),
      }))
      .filter(
        (g) =>
          g.ids.length >= 5 &&
          !e.data.suppressed?.includes(groupId(g)) &&
          (!g.parentName ||
            !e.data.suppressed?.includes(
              `auto-${g.parentName.toLocaleLowerCase()}`,
            )),
      );
    const names = new Set(
      candidates.filter((g) => !g.parentName).map((g) => g.name),
    );
    self.postMessage({
      groups: candidates.filter(
        (g) => !g.parentName || names.has(g.parentName),
      ),
    });
  } catch {
    self.postMessage({
      error:
        "Your saves could not be grouped right now. Your library is unchanged.",
    });
  }
};
