import { getApps, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  deleteUser,
  getAuth,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { emptyLibrary, validateLibrary, type Library } from "./model";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = Object.values(config).every(Boolean)
  ? getApps()[0] || initializeApp(config)
  : null;
export const auth = app ? getAuth(app) : null;
const firestore = app ? getFirestore(app) : null;
export { type User };
export const cloud = Boolean(auth && firestore);
const chunkBytes = 180_000;

function manifestRef(uid: string) {
  if (!firestore) throw Error("Cloud sync is not configured.");
  return doc(firestore, "users", uid, "library", "manifest");
}
function snapshotsRef(uid: string) {
  if (!firestore) throw Error("Cloud sync is not configured.");
  return collection(manifestRef(uid), "snapshots");
}
function toBase64(bytes: Uint8Array) {
  let value = "";
  for (let index = 0; index < bytes.length; index += 0x8000)
    value += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  return btoa(value);
}
function fromBase64(value: string) {
  const raw = atob(value), bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}
async function deleteSnapshot(uid: string, snapshotId: string) {
  if (!firestore) return;
  const snapshot = doc(snapshotsRef(uid), snapshotId);
  const chunks = await getDocs(collection(snapshot, "chunks"));
  for (let index = 0; index < chunks.docs.length; index += 400) {
    const batch = writeBatch(firestore);
    chunks.docs.slice(index, index + 400).forEach((entry) => batch.delete(entry.ref));
    await batch.commit();
  }
  await deleteDoc(snapshot);
}

export function listenAuth(callback: (user: User | null) => void) {
  return auth ? onAuthStateChanged(auth, callback) : () => undefined;
}
/** Complete Firebase's redirect handoff before relying on the auth observer. */
export async function finishSignInRedirect() {
  if (auth) await getRedirectResult(auth);
}
export async function signIn() {
  if (!auth) throw Error("Online accounts are not configured on this installation.");
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    // Browsers can block a popup before Firebase has started OAuth. Redirect is
    // still the dependable fallback for those browsers and for mobile webviews.
    if (
      error instanceof Error &&
      (error as Error & { code?: string }).code === "auth/popup-blocked"
    ) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}
export async function signOut() {
  if (auth) await firebaseSignOut(auth);
}
export async function readCloud() {
  const user = auth?.currentUser;
  if (!user || !firestore) return null;
  const manifest = await getDoc(manifestRef(user.uid));
  if (!manifest.exists()) return { library: emptyLibrary(), revision: 0 };
  const data = manifest.data(), snapshotId = data.snapshotId as string | undefined;
  const revision = Number(data.revision || 0);
  if (!snapshotId) return { library: emptyLibrary(), revision };
  const chunks = await getDocs(collection(doc(snapshotsRef(user.uid), snapshotId), "chunks"));
  const ordered = chunks.docs
    .map((entry) => entry.data() as { index: number; data: string })
    .sort((a, b) => a.index - b.index);
  const pieces = ordered.map((entry) => fromBase64(entry.data));
  const joined = new Uint8Array(pieces.reduce((size, entry) => size + entry.length, 0));
  let offset = 0;
  for (const piece of pieces) {
    joined.set(piece, offset);
    offset += piece.length;
  }
  return {
    library: validateLibrary(JSON.parse(new TextDecoder().decode(joined))),
    revision,
  };
}
export async function writeCloud(next: Library, _base: Library, revision: number) {
  const user = auth?.currentUser;
  if (!user || !firestore) return revision;
  const bytes = new TextEncoder().encode(JSON.stringify(next)), snapshotId = crypto.randomUUID();
  const snapshot = doc(snapshotsRef(user.uid), snapshotId);
  const chunks = Array.from({ length: Math.ceil(bytes.length / chunkBytes) || 1 }, (_, index) =>
    toBase64(bytes.subarray(index * chunkBytes, (index + 1) * chunkBytes)),
  );
  await setDoc(snapshot, { chunkCount: chunks.length, createdAt: serverTimestamp() });
  for (let index = 0; index < chunks.length; index += 400) {
    const batch = writeBatch(firestore);
    chunks.slice(index, index + 400).forEach((data, offset) =>
      batch.set(doc(snapshot, "chunks", String(index + offset)), { index: index + offset, data }),
    );
    await batch.commit();
  }
  let oldSnapshot = "";
  try {
    await runTransaction(firestore, async (transaction) => {
      const current = await transaction.get(manifestRef(user.uid));
      const currentRevision = current.exists() ? Number(current.data().revision || 0) : 0;
      if (currentRevision !== revision) throw Error("REVISION_CONFLICT");
      oldSnapshot = current.exists() ? String(current.data().snapshotId || "") : "";
      transaction.set(manifestRef(user.uid), {
        revision: revision + 1,
        snapshotId,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    await deleteSnapshot(user.uid, snapshotId);
    throw error;
  }
  if (oldSnapshot) void deleteSnapshot(user.uid, oldSnapshot);
  return revision + 1;
}
export async function deleteCloudAccount() {
  const user = auth?.currentUser;
  if (!user || !firestore) return;
  const snapshots = await getDocs(snapshotsRef(user.uid));
  for (const snapshot of snapshots.docs) await deleteSnapshot(user.uid, snapshot.id);
  await deleteDoc(manifestRef(user.uid));
  await deleteUser(user);
}
