import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";

const projectId = "crate-rules-test";
let env: RulesTestEnvironment;

const manifest = (revision = 1, snapshotId = "snapshot-1") => ({
  revision,
  snapshotId,
  updatedAt: Timestamp.now(),
});
const snapshot = (chunkCount = 1) => ({
  chunkCount,
  createdAt: Timestamp.now(),
});

async function seed(path: string, data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => env.clearFirestore());
afterAll(async () => env.cleanup());

describe("Firestore owner and release boundaries", () => {
  it("keeps every library document private to its authenticated owner", async () => {
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    const anonymous = env.unauthenticatedContext().firestore();

    await assertSucceeds(getDoc(doc(alice, "users/alice/library/manifest")));
    await assertFails(getDoc(doc(bob, "users/alice/library/manifest")));
    await assertFails(getDoc(doc(anonymous, "users/alice/library/manifest")));
    await assertFails(setDoc(doc(bob, "users/alice/library/manifest"), manifest(2)));
  });

  it("denies a first library while admission is closed", async () => {
    await seed("config/release", { accepting: false });
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest()));
  });

  it("denies a first library when the release document is absent", async () => {
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest()));
  });

  it("allows a schema-valid first library only while admission is open", async () => {
    await seed("config/release", { accepting: true });
    const alice = env.authenticatedContext("alice").firestore();

    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1/chunks/0"), { index: 0, data: "e30=" }));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest()));
  });

  it("lets an established owner sync and delete while admission is closed", async () => {
    await seed("config/release", { accepting: false });
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();

    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-2"), snapshot()));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-2/chunks/0"), { index: 0, data: "e30=" }));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-2")));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1")));
  });

  it("rejects malformed, oversized, and out-of-order cloud documents", async () => {
    await seed("config/release", { accepting: true });
    const alice = env.authenticatedContext("alice").firestore();
    const snapshotRef = doc(alice, "users/alice/library/manifest/snapshots/snapshot-1");

    await assertFails(setDoc(snapshotRef, { ...snapshot(), extra: true }));
    await assertFails(setDoc(snapshotRef, snapshot(0)));
    await assertFails(setDoc(snapshotRef, snapshot(129)));
    await assertSucceeds(setDoc(snapshotRef, snapshot(2)));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), { index: 1, data: "e30=" }));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), { index: 0, data: "x".repeat(240_001) }));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), { ...manifest(), owner: "alice" }));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(1, "missing-snapshot")));
  });

  it("enforces monotonic manifest revisions", async () => {
    await seed("config/release", { accepting: true });
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest", manifest());
    await seed("users/alice/library/manifest/snapshots/snapshot-2", snapshot());
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(3, "snapshot-2")));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-2")));
  });
});
