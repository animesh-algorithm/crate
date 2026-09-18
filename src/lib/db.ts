import Dexie, { type Table } from "dexie";
import { emptyLibrary, validateLibrary, type Library } from "./model";
import type { Group } from "./organize";
export interface StoredLibrary {
  id: string;
  data: Library;
  cloudRevision: number;
  dirty: boolean;
  at: number;
}
export interface Vector {
  key: string;
  owner: string;
  itemId: string;
  hash: string;
  values: number[];
}
export interface History {
  id?: number;
  owner: string;
  data: Library;
  at: number;
}
export interface ProposalDraft {
  owner: string;
  sourceRevision: number;
  mode: "smart" | "text" | "custom";
  groups: Group[];
  at: number;
}
class CrateDB extends Dexie {
  libraries!: Table<StoredLibrary, string>;
  vectors!: Table<Vector, string>;
  history!: Table<History, number>;
  proposals!: Table<ProposalDraft, string>;
  constructor() {
    super("crate-private-v1");
    this.version(1).stores({
      libraries: "id",
      vectors: "key,owner,[owner+itemId]",
      history: "++id,owner,at",
    });
    this.version(2).stores({
      libraries: "id",
      vectors: "key,owner,[owner+itemId]",
      history: "++id,owner,at",
      proposals: "owner",
    });
  }
}
export const db = new CrateDB();
export async function loadLocal(owner: string) {
  const stored = await db.libraries.get(owner);
  return stored
    ? { ...stored, data: validateLibrary(stored.data) }
    : {
        id: owner,
        data: emptyLibrary(),
        cloudRevision: 0,
        dirty: false,
        at: Date.now(),
      };
}
export async function saveLocal(
  owner: string,
  data: Library,
  cloudRevision: number,
  dirty: boolean,
  previous?: Library,
  expectedLocalRevision?: number,
) {
  validateLibrary(data);
  await db.transaction("rw", db.libraries, db.history, db.vectors, async () => {
    const stored = await db.libraries.get(owner);
    const expected = expectedLocalRevision ?? previous?.revision;
    if (expected !== undefined && stored && stored.data.revision !== expected)
      throw Error(
        "Your library changed in another tab. Reload before editing; your changes have not been overwritten.",
      );
    if (previous)
      await db.history.add({ owner, data: previous, at: Date.now() });
    const itemIds = new Set(data.items.map((x) => x.id));
    const vectors = await db.vectors.where("owner").equals(owner).toArray();
    await db.vectors.bulkDelete(
      vectors.filter((v) => !itemIds.has(v.itemId)).map((v) => v.key),
    );
    await db.libraries.put({
      id: owner,
      data,
      cloudRevision,
      dirty,
      at: Date.now(),
    });
    const history = await db.history.where("owner").equals(owner).toArray();
    if (history.length > 10)
      await db.history.bulkDelete(
        history
          .sort((a, b) => a.at - b.at)
          .slice(0, -10)
          .map((h) => h.id!),
      );
  });
}
export async function clearLocal(owner: string) {
  await db.transaction(
    "rw",
    db.libraries,
    db.vectors,
    db.history,
    db.proposals,
    async () => {
      await db.libraries.delete(owner);
      await db.vectors.where("owner").equals(owner).delete();
      await db.history.where("owner").equals(owner).delete();
      await db.proposals.delete(owner);
    },
  );
}
