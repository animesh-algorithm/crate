import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { emptyLibrary } from "../src/lib/model";
import { parseExport, commitImport } from "../src/lib/import";
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222";
let pg: PGlite;
async function asUser(id: string) {
  await pg.exec(
    `reset role; select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`,
  );
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    `create role anon; create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid()returns uuid language sql as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid()to authenticated;insert into auth.users values('${a}'),('${b}');`,
  );
  await pg.exec(
    readFileSync("supabase/migrations/202609190001_library.sql", "utf8"),
  );
  await pg.exec(
    readFileSync("supabase/migrations/202609190002_organization.sql", "utf8"),
  );
}, 30000);
afterAll(async () => {
  await pg.close();
});
describe("cloud authority", () => {
  it("keeps new accounts closed until the operator activates the release", async () => {
    await asUser(a);
    await expect(pg.query("select public.open_library()")).rejects.toThrow(
      "not open",
    );
    await pg.exec(
      "reset role;update public.release_config set accepting=true,max_libraries=1",
    );
    await asUser(a);
    await pg.query("select public.open_library()");
    await asUser(b);
    await expect(pg.query("select public.open_library()")).rejects.toThrow(
      "full",
    );
    await pg.exec(
      "reset role;update public.release_config set max_libraries=10",
    );
    await asUser(b);
    await pg.query("select public.open_library()");
  });
  it("isolates direct reads and disallows direct writes", async () => {
    await asUser(a);
    const result = await pg.query<{ owner: string }>(
      "select owner from public.libraries",
    );
    expect(result.rows.map((x) => x.owner)).toEqual([a]);
    await expect(
      pg.query(`update public.libraries set revision=999 where owner='${b}'`),
    ).rejects.toThrow("permission denied");
  });
  it("enforces revisions and validates malicious patches on the server", async () => {
    await asUser(a);
    const empty = emptyLibrary(),
      patch = {
        items: [],
        remove: [],
        collections: [],
        tombstones: [],
        imports: [],
      };
    await pg.query("select public.patch_library(0,$1::jsonb)", [
      JSON.stringify(patch),
    ]);
    await expect(
      pg.query("select public.patch_library(0,$1::jsonb)", [
        JSON.stringify(patch),
      ]),
    ).rejects.toThrow("REVISION_CONFLICT");
    await expect(
      pg.query("select public.patch_library(1,$1::jsonb)", [
        JSON.stringify({
          ...patch,
          collections: [
            { id: "a", name: "Bad", parentId: "a", manual: true, style: 0 },
          ],
        }),
      ]),
    ).rejects.toThrow("INVALID");
    expect(empty.items).toHaveLength(0);
  });
  it("rejects invalid URLs and stops new imports while retaining reads", async () => {
    const p = await parseExport(
      JSON.stringify([
        {
          label_values: [
            { label: "URL", value: "https://www.instagram.com/p/safe/" },
            { label: "Caption", value: "Good original text" },
          ],
        },
      ]),
    );
    const l = commitImport(emptyLibrary(), p, "a");
    await asUser(a);
    const patch = {
      items: l.items,
      remove: [],
      collections: [],
      tombstones: [],
      imports: [],
    };
    await expect(
      pg.query("select public.patch_library(1,$1::jsonb)", [
        JSON.stringify({
          ...patch,
          items: [{ ...l.items[0], url: "javascript:alert(1)" }],
        }),
      ]),
    ).rejects.toThrow("INVALID");
    await pg.exec(
      "reset role;update public.release_config set importing=false",
    );
    await asUser(a);
    await expect(
      pg.query("select public.patch_library(1,$1::jsonb)", [
        JSON.stringify(patch),
      ]),
    ).rejects.toThrow("paused");
    await pg.exec("reset role;update public.release_config set importing=true");
    await asUser(a);
    await pg.query("select public.patch_library(1,$1::jsonb)", [
      JSON.stringify(patch),
    ]);
  });
  it("rejects over-quota payloads even if the browser validation is bypassed", async () => {
    await asUser(a);
    const p = await parseExport(
      JSON.stringify([
        {
          label_values: [
            { label: "URL", href: "https://www.instagram.com/p/quota/" },
          ],
        },
      ]),
    );
    const items = Array.from({ length: 5001 }, (_, index) => ({
      ...p.items[0],
      id: `quota${index}`,
      url: `https://www.instagram.com/p/quota${index}/`,
    }));
    await expect(
      pg.query("select public.patch_library(2,$1::jsonb)", [
        JSON.stringify({
          items,
          remove: [],
          collections: [],
          tombstones: [],
          imports: [],
        }),
      ]),
    ).rejects.toThrow("INVALID_OR_OVER_QUOTA");
    const result = await pg.query<{ open_library: { revision: number } }>(
      "select public.open_library()",
    );
    expect(result.rows[0].open_library.revision).toBe(2);
  });
  it("validates custom definitions and primary membership across an owner-scoped patch", async () => {
    const p = await parseExport(
      JSON.stringify([
        {
          label_values: [
            { label: "URL", href: "https://www.instagram.com/p/topic/" },
            { label: "Caption", value: "Anime character art" },
          ],
        },
      ]),
    );
    await asUser(b);
    const collection = {
      id: "custom-anime",
      name: "Anime",
      parentId: null,
      manual: false,
      style: 1,
      origin: "custom",
      criteria: "anime",
      description: "Character art",
    };
    const patch = {
      items: [
        {
          ...p.items[0],
          collections: [collection.id],
          primaryCollection: collection.id,
        },
      ],
      remove: [],
      collections: [collection],
      tombstones: [],
      imports: [],
      customCategories: [{ name: "Anime", description: "Character art" }],
    };
    await pg.query("select public.patch_library(0,$1::jsonb)", [
      JSON.stringify(patch),
    ]);
    const state = await pg.query<{
      open_library: {
        state: {
          customCategories: unknown[];
          items: { primaryCollection: string }[];
        };
      };
    }>("select public.open_library()");
    expect(state.rows[0].open_library.state.customCategories).toHaveLength(1);
    expect(state.rows[0].open_library.state.items[0].primaryCollection).toBe(
      collection.id,
    );
    await expect(
      pg.query("select public.patch_library(1,$1::jsonb)", [
        JSON.stringify({
          ...patch,
          items: [{ ...patch.items[0], primaryCollection: "other" }],
        }),
      ]),
    ).rejects.toThrow("INVALID");
    await expect(
      pg.query("select public.patch_library(1,$1::jsonb)", [
        JSON.stringify({
          ...patch,
          items: [],
          customCategories: [{ name: "", description: "" }],
        }),
      ]),
    ).rejects.toThrow("INVALID");
  });
  it("records a library deletion independently of account deletion", async () => {
    await asUser(a);
    await pg.query("select public.patch_library(2,$1::jsonb)", [
      JSON.stringify({
        items: [],
        remove: ["safe"],
        collections: [],
        imports: [],
        tombstones: [],
        erase: true,
      }),
    ]);
    await pg.exec("reset role");
    const record = await pg.query<{ kind: string }>(
      "select kind from public.deletion_ledger where owner=$1",
      [a],
    );
    expect(record.rows[0].kind).toBe("library");
    expect(
      (await pg.query("select * from auth.users where id=$1", [a])).rows,
    ).toHaveLength(1);
  });
  it("deletes account-owned data and records deletion for disaster recovery", async () => {
    await pg.exec(`reset role;delete from auth.users where id='${a}'`);
    expect(
      (await pg.query("select * from public.libraries where owner=$1", [a]))
        .rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query("select * from public.deletion_ledger where owner=$1", [
          a,
        ])
      ).rows,
    ).toHaveLength(1);
  });
});
