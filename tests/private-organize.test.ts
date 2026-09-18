import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseExport } from "../src/lib/import";
import { discover } from "../src/lib/organize";
import { textFor } from "../src/lib/model";

// External, owner-reviewed files only. Do not commit labels, exports, or vectors.
it.skipIf(
  !process.env.CRATE_PRIVATE_EXPORT || !process.env.CRATE_PRIVATE_REVIEW,
)(
  "reports owner-reviewed assignment precision, coverage, and Unsorted rate without printing private content",
  async () => {
    const parsed = await parseExport(
      readFileSync(process.env.CRATE_PRIVATE_EXPORT!, "utf8"),
    );
    const review = JSON.parse(
      readFileSync(process.env.CRATE_PRIVATE_REVIEW!, "utf8"),
    ) as { labels: Record<string, string[]> };
    if (
      !review.labels ||
      Object.values(review.labels).some(
        (v) => !Array.isArray(v) || v.some((name) => typeof name !== "string"),
      )
    )
      throw Error(
        "Expected an external review file with labels keyed by save ID.",
      );
    const items = parsed.items.filter((item) =>
      Object.hasOwn(review.labels, item.id),
    );
    expect(
      items.length,
      "Review at least 150 stratified saves before claiming quality.",
    ).toBeGreaterThanOrEqual(150);
    let vectors: Map<string, number[]> | undefined;
    if (process.env.CRATE_PRIVATE_VECTORS) {
      const raw = JSON.parse(
        readFileSync(process.env.CRATE_PRIVATE_VECTORS, "utf8"),
      ) as Record<string, number[]>;
      vectors = new Map(
        Object.entries(raw).filter(
          ([id, values]) =>
            items.some((item) => item.id === id) &&
            Array.isArray(values) &&
            values.length === 384 &&
            values.every(Number.isFinite),
        ),
      );
      expect(vectors.size).toBe(items.filter((item) => textFor(item).trim()).length);
    }
    const groups = discover(items, vectors);
    const assigned = new Map<string, string[]>();
    for (const group of groups)
      for (const id of group.ids)
        assigned.set(id, [...(assigned.get(id) || []), group.name]);
    const assignments = [...assigned.values()].reduce(
      (sum, names) => sum + names.length,
      0,
    );
    const relevant = items.reduce(
      (sum, item) =>
        sum +
        (assigned.get(item.id) || []).filter((name) =>
          review.labels[item.id].some(
            (label) => label.toLocaleLowerCase() === name.toLocaleLowerCase(),
          ),
        ).length,
      0,
    );
    const coverage = assigned.size / items.length;
    const unsorted = 1 - coverage;
    const precision = assignments ? relevant / assignments : 0;
    console.info(
      `Private ${vectors ? "model-assisted" : "text-only"} organization: reviewed=${items.length} assignments=${assignments} precision=${(precision * 100).toFixed(1)}% coverage=${(coverage * 100).toFixed(1)}% Unsorted=${(unsorted * 100).toFixed(1)}%`,
    );
    expect(
      precision,
      "The 85% relevant-assignment target is not met.",
    ).toBeGreaterThanOrEqual(0.85);
  },
);
