import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { User } from "firebase/auth";
import {
  cloud,
  finishSignInRedirect,
  listenAuth,
  readCloud,
  writeCloud,
  deleteCloudAccount,
  signIn as signInCloud,
  signOut as signOutCloud,
} from "./cloud";
import { db, loadLocal, saveLocal, clearLocal } from "./db";
import { emptyLibrary, type Library, validateLibrary } from "./model";
import { demoLibrary } from "./demo";
interface Store {
  library: Library;
  owner: string;
  user: User | null;
  loading: boolean;
  busy: boolean;
  error: string;
  notice: string;
  demo: boolean;
  conflict: boolean;
  dirty: boolean;
  change: (fn: (l: Library) => Library) => Promise<void>;
  undo: () => Promise<void>;
  startDemo: () => Promise<void>;
  exitDemo: () => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
  resolve: (keepLocal: boolean) => Promise<void>;
  deleteAccount: () => Promise<void>;
  deleteLibrary: () => Promise<void>;
  setError: (v: string) => void;
}
const Context = createContext<Store | null>(null);
export function Provider({ children }: { children: ReactNode }) {
  const [library, setLibrary] = useState<Library>(emptyLibrary),
    [user, setUser] = useState<User | null>(null),
    [demo, setDemo] = useState(
      () => sessionStorage.getItem("crate-demo") === "yes",
    ),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [conflict, setConflict] = useState(false),
    [dirty, setDirty] = useState(false);
  const current = useRef(library),
    base = useRef(emptyLibrary()),
    revision = useRef(0),
    lock = useRef(false),
    generation = useRef(0);
  const owner = demo ? "demo" : user?.uid || "local";
  useEffect(() => {
    if (!cloud) {
      setLoading(false);
      return;
    }
    const unsubscribe = listenAuth((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    void finishSignInRedirect().catch(() => {
      setError("Sign-in could not finish. Please try again.");
      setLoading(false);
    });
    return unsubscribe;
  }, []);
  useEffect(() => {
    let active = true;
    const g = ++generation.current;
    setLoading(true);
    setError("");
    setConflict(false);
    setNotice("");
    void (async () => {
      try {
        const stored = await loadLocal(owner);
        if (!active) return;
        current.current = stored.data;
        setLibrary(stored.data);
        setDirty(stored.dirty);
        revision.current = stored.cloudRevision;
        base.current = stored.data;
        if (user && !demo) {
          const remote = await readCloud();
          if (!active || g !== generation.current) return;
          if (remote) {
            revision.current = remote.revision;
            base.current = remote.library;
            if (stored.dirty) {
              if (stored.cloudRevision !== remote.revision) setConflict(true);
              setNotice("Changes on this device are waiting to sync.");
            } else {
              current.current = remote.library;
              setLibrary(remote.library);
              await saveLocal(owner, remote.library, remote.revision, false);
            }
          }
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error
              ? e.message
              : "Your library could not be opened.",
          );
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [owner, user?.uid, demo]);
  const change = async (
    fn: (l: Library) => Library,
    after?: () => Promise<void>,
  ) => {
    if (lock.current)
      throw Error("Please wait for your last change to finish.");
    lock.current = true;
    setBusy(true);
    setError("");
    const g = generation.current;
    try {
      const previous = current.current,
        next = validateLibrary({
          ...fn(previous),
          revision: previous.revision + 1,
        });
      await saveLocal(
        owner,
        next,
        revision.current,
        Boolean(user && !demo),
        previous,
      );
      if (g !== generation.current) return;
      current.current = next;
      setLibrary(next);
      setDirty(Boolean(user && !demo));
      setNotice(
        user && !demo
          ? "Saved on this device. Syncing…"
          : "Saved on this device.",
      );
      if (user && !demo && !conflict) {
        try {
          const rev = await writeCloud(next, base.current, revision.current);
          if (g !== generation.current) return;
          revision.current = rev;
          base.current = next;
          await saveLocal(owner, next, rev, false, undefined, next.revision);
          setDirty(false);
          setNotice("Your library is up to date.");
        } catch (e) {
          const message = e instanceof Error ? e.message : "Unable to sync.";
          if (message.includes("REVISION_CONFLICT")) setConflict(true);
          setError(
            message.includes("REVISION_CONFLICT")
              ? "Your library changed on another device. Choose which version to keep in Settings."
              : "Saved on this device. Cloud sync is paused; retry in Settings.",
          );
        }
      }
      if (g === generation.current) await after?.();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Your change could not be saved.",
      );
      throw e;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const retrySync = async () => {
    if (!user || demo || !cloud) return;
    setBusy(true);
    try {
      const rev = await writeCloud(
        current.current,
        base.current,
        revision.current,
      );
      revision.current = rev;
      base.current = current.current;
      await saveLocal(owner, current.current, rev, false);
      setDirty(false);
      setError("");
      setNotice("Your library is up to date.");
    } catch (e) {
      const message = e instanceof Error ? e.message : "";
      if (message.includes("REVISION_CONFLICT")) setConflict(true);
      setError("Your changes remain on this device. Sync could not finish.");
    } finally {
      setBusy(false);
    }
  };
  const resolve = async (keepLocal: boolean) => {
    setBusy(true);
    try {
      const remote = await readCloud();
      if (!remote) return;
      if (keepLocal) {
        const rev = await writeCloud(
          current.current,
          remote.library,
          remote.revision,
        );
        revision.current = rev;
        base.current = current.current;
        await saveLocal(owner, current.current, rev, false);
      } else {
        await saveLocal(
          owner,
          remote.library,
          remote.revision,
          false,
          current.current,
        );
        current.current = remote.library;
        setLibrary(remote.library);
        base.current = remote.library;
        revision.current = remote.revision;
      }
      setConflict(false);
      setDirty(false);
      setError("");
      setNotice("Your library is up to date.");
    } catch {
      setError("Could not resolve the change. Your local library is safe.");
    } finally {
      setBusy(false);
    }
  };
  const undoLock = useRef(false);
  const undo = async () => {
    if (undoLock.current || lock.current) return;
    undoLock.current = true;
    setBusy(true);
    try {
      const history = (
        await db.history.where("owner").equals(owner).toArray()
      ).sort((a, b) => b.at - a.at);
      if (!history.length) {
        setNotice("No earlier change to undo.");
        return;
      }
      await change(
        () => history[0].data,
        async () => {
          const all = (
            await db.history.where("owner").equals(owner).toArray()
          ).sort((a, b) => b.at - a.at);
          await db.history.bulkDelete([history[0].id!, all[0].id!]);
          setNotice("Last change undone.");
        },
      );
    } finally {
      undoLock.current = false;
      setBusy(false);
    }
  };
  const startDemo = async () => {
    await clearLocal("demo");
    await saveLocal("demo", demoLibrary(), 0, false);
    sessionStorage.setItem("crate-demo", "yes");
    setDemo(true);
  };
  const signIn = async () => {
    if (!cloud) {
      setError(
        "Online accounts are not configured on this installation. You can use a private library on this device.",
      );
      return;
    }
    sessionStorage.removeItem("crate-demo");
    setDemo(false);
    try {
      await signInCloud();
    } catch {
      setError("Sign-in could not start. Please try again.");
    }
  };
  const signOut = async () => {
    if (dirty || (user && (await loadLocal(user.uid)).dirty))
      throw Error("Sync or export your changes before signing out.");
    if (cloud) await signOutCloud();
    await clearLocal(owner);
    if (user && user.uid !== owner) await clearLocal(user.uid);
    setUser(null);
    sessionStorage.removeItem("crate-demo");
    setDemo(false);
  };
  const deleteLibrary = async () => {
    if (lock.current)
      throw Error("Please wait for your last change to finish.");
    lock.current = true;
    setBusy(true);
    try {
      const next = {
        ...emptyLibrary(),
        revision: current.current.revision + 1,
      };
      let rev = 0;
      if (user && !demo) {
        const remote = await readCloud();
        if (!remote) throw Error("Your online library could not be opened.");
        rev = await writeCloud(next, remote.library, remote.revision);
      }
      await clearLocal(owner);
      await saveLocal(owner, next, rev, false);
      current.current = next;
      base.current = next;
      revision.current = rev;
      setLibrary(next);
      setDirty(false);
      setConflict(false);
      setError("");
      setNotice("Your library has been deleted.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const deleteAccount = async () => {
    if (lock.current)
      throw Error("Please wait for your last change to finish.");
    lock.current = true;
    setBusy(true);
    try {
      if (demo) {
        await clearLocal("demo");
        sessionStorage.removeItem("crate-demo");
        setDemo(false);
        return;
      }
      if (user && !demo) await deleteCloudAccount();
      await clearLocal(owner);
      current.current = emptyLibrary();
      setLibrary(emptyLibrary());
      setUser(null);
      setDirty(false);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Context.Provider
      value={{
        library,
        owner,
        user,
        loading,
        busy,
        error,
        notice,
        demo,
        conflict,
        dirty,
        change,
        undo,
        startDemo,
        exitDemo: () => {
          sessionStorage.removeItem("crate-demo");
          setDemo(false);
        },
        signIn,
        signOut,
        retrySync,
        resolve,
        deleteAccount,
        deleteLibrary,
        setError,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useLibrary() {
  const ctx = useContext(Context);
  if (!ctx) throw Error("Library context missing");
  return ctx;
}
