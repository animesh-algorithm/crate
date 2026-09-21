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

const manifest = (revision = 1, snapshotId = "snapshot-1", snapshotWriterId = `writer-${revision}`) => ({
  revision,
  snapshotId,
  snapshotWriterId,
  updatedAt: Timestamp.now(),
});
const snapshot = (revision = 1, writerId = `writer-${revision}`, chunkCount = 1) => ({
  revision,
  writerId,
  chunkCount,
  createdAt: Timestamp.now(),
});
const chunk = (revision = 1, writerId = `writer-${revision}`, index = 0, data = "e30=") => ({
  revision,
  writerId,
  index,
  data,
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

  it("allows a schema-valid first library only in slot one while admission is open", async () => {
    await seed("config/release", { accepting: true });
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-0"), snapshot()));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1/chunks/0"), chunk()));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest()));
  });

  it("allows only the next inactive slot and never arbitrary parent ids", async () => {
    await seed("config/release", { accepting: true });
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/arbitrary"), snapshot(2)));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-2"), snapshot(2)));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot(2)));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-0"), snapshot(2)));
  });

  it("recovers an interrupted inactive-slot stage by fencing writers", async () => {
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();
    const slot = doc(alice, "users/alice/library/manifest/snapshots/snapshot-0");

    await assertSucceeds(setDoc(slot, snapshot(2, "interrupted")));
    await assertSucceeds(setDoc(slot, snapshot(2, "retry")));
    await assertFails(setDoc(doc(slot, "chunks", "0"), chunk(2, "interrupted")));
    await assertSucceeds(setDoc(doc(slot, "chunks", "0"), chunk(2, "retry")));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-0", "interrupted")));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-0", "retry")));
  });

  it("protects the active slot until the manifest is deleted for account cleanup", async () => {
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest/snapshots/snapshot-1/chunks/0", chunk());
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();
    const active = doc(alice, "users/alice/library/manifest/snapshots/snapshot-1");

    await assertFails(setDoc(active, snapshot(2)));
    await assertFails(setDoc(doc(active, "chunks", "0"), chunk(1, "writer-1", 0, "changed")));
    await assertFails(deleteDoc(doc(active, "chunks", "0")));
    await assertFails(deleteDoc(active));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/library/manifest")));
    await assertSucceeds(deleteDoc(doc(active, "chunks", "0")));
    await assertSucceeds(deleteDoc(active));
  });

  it("blocks every second-tab write after deletion starts while allowing cleanup", async () => {
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest/snapshots/snapshot-1/chunks/0", chunk());
    await seed("users/alice/library/manifest/snapshots/snapshot-0", snapshot(2));
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();
    const secondTab = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    const deletion = doc(alice, "users/alice/library/deletion");
    const active = doc(alice, "users/alice/library/manifest/snapshots/snapshot-1");

    await assertSucceeds(setDoc(deletion, { blocked: true }));
    await assertSucceeds(getDoc(deletion));
    await assertFails(getDoc(doc(bob, "users/alice/library/deletion")));
    await assertFails(setDoc(doc(bob, "users/alice/library/deletion"), { blocked: true }));
    await assertFails(setDoc(deletion, { blocked: false }));
    await assertFails(deleteDoc(deletion));

    await assertFails(setDoc(doc(secondTab, "users/alice/library/manifest/snapshots/snapshot-0"), snapshot(2)));
    await assertFails(setDoc(doc(secondTab, "users/alice/library/manifest/snapshots/snapshot-0/chunks/0"), chunk(2)));
    await assertFails(setDoc(doc(secondTab, "users/alice/library/manifest"), manifest(2, "snapshot-0")));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-0")));
    await assertSucceeds(deleteDoc(doc(active, "chunks", "0")));
    await assertSucceeds(deleteDoc(active));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/library/manifest")));
    await assertFails(setDoc(doc(secondTab, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
  });

  it("reuses only the two fixed namespaces across later revisions", async () => {
    await seed("users/alice/library/manifest/snapshots/snapshot-0", snapshot(2));
    await seed("users/alice/library/manifest", manifest(2, "snapshot-0"));
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    const alice = env.authenticatedContext("alice").firestore();

    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot(3)));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1/chunks/0"), chunk(3)));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(3, "snapshot-1")));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-2"), snapshot(4)));
  });

  it("denies cross-owner snapshot writes and client release changes", async () => {
    await seed("config/release", { accepting: true });
    const bob = env.authenticatedContext("bob").firestore();

    await assertFails(setDoc(doc(bob, "users/alice/library/manifest/snapshots/snapshot-1"), snapshot()));
    await assertFails(setDoc(doc(bob, "config/release"), { accepting: false }));
  });

  it("lets an established owner sync and delete while admission is closed", async () => {
    await seed("config/release", { accepting: false });
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest", manifest());
    const alice = env.authenticatedContext("alice").firestore();

    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-0"), snapshot(2)));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-0/chunks/0"), chunk(2)));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-0")));
    await assertSucceeds(deleteDoc(doc(alice, "users/alice/library/manifest/snapshots/snapshot-1")));
  });

  it("rejects malformed, oversized, and out-of-order cloud documents", async () => {
    await seed("config/release", { accepting: true });
    const alice = env.authenticatedContext("alice").firestore();
    const snapshotRef = doc(alice, "users/alice/library/manifest/snapshots/snapshot-1");

    await assertFails(setDoc(snapshotRef, { ...snapshot(), extra: true }));
    await assertFails(setDoc(snapshotRef, snapshot(1, "writer-1", 0)));
    await assertFails(setDoc(snapshotRef, snapshot(1, "writer-1", 129)));
    await assertSucceeds(setDoc(snapshotRef, snapshot(1, "writer-1", 2)));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), chunk(2, "writer-1")));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), chunk(1, "wrong-writer")));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), chunk(1, "writer-1", 1)));
    await assertFails(setDoc(doc(snapshotRef, "chunks", "0"), chunk(1, "writer-1", 0, "x".repeat(240_001))));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), { ...manifest(), owner: "alice" }));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(1, "missing-snapshot")));
  });

  it("enforces monotonic manifest revisions", async () => {
    await seed("config/release", { accepting: true });
    await seed("users/alice/library/manifest/snapshots/snapshot-1", snapshot());
    await seed("users/alice/library/manifest", manifest());
    await seed("users/alice/library/manifest/snapshots/snapshot-0", snapshot(2));
    const alice = env.authenticatedContext("alice").firestore();

    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(3, "snapshot-1", "writer-3")));
    await assertFails(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-0", "wrong-writer")));
    await assertSucceeds(setDoc(doc(alice, "users/alice/library/manifest"), manifest(2, "snapshot-0")));
  });
});
