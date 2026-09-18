import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { parseExport, commitImport } from "../src/lib/import";
import { emptyLibrary } from "../src/lib/model";
it.skipIf(!process.env.CRATE_PRIVATE_EXPORT)(
  "validates an external personal export without retaining or printing its content",
  async () => {
    const p = await parseExport(
      readFileSync(process.env.CRATE_PRIVATE_EXPORT!, "utf8"),
    );
    expect(p.issues).toHaveLength(0);
    expect(p.items).toHaveLength(1749);
    expect(p.duplicates).toBe(0);
    expect(p.items.every((item) => item.creator !== "Unknown creator")).toBe(
      true,
    );
    expect(p.items.filter((item) => Boolean(item.creatorName)).length).toBe(
      1694,
    );
    expect(p.items.filter((item) => Boolean(item.creatorUrl)).length).toBe(972);
    expect(p.items.some((item) => item.hashtags.length > 0)).toBe(true);
    expect(
      commitImport(emptyLibrary(), p, "private-validation").items,
    ).toHaveLength(1749);
  },
);
