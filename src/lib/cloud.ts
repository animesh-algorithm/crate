import { createClient } from "@supabase/supabase-js";
import { validateLibrary, type Library } from "./model";
const url = import.meta.env.VITE_SUPABASE_URL,
  key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloud =
  url && key
    ? createClient(url, key, {
        auth: {
          flowType: "pkce",
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
export async function readCloud() {
  if (!cloud) return null;
  const { data, error } = await cloud.rpc("open_library");
  if (error)
    throw Error(
      error.message.startsWith("Crate is full") ||
        error.message.startsWith("Online accounts are not open")
        ? error.message
        : "Your online library could not be opened. The saved copy on this device remains available.",
    );
  return {
    library: validateLibrary(data.state),
    revision: Number(data.revision),
  };
}
export async function writeCloud(
  next: Library,
  base: Library,
  revision: number,
) {
  if (!cloud) return revision;
  const old = new Map(base.items.map((x) => [x.id, x]));
  const patch = {
    erase:
      !next.items.length &&
      !next.collections.length &&
      !next.tombstones.length &&
      !next.imports.length &&
      !next.customCategories.length,
    items: next.items.filter(
      (x) => JSON.stringify(x) !== JSON.stringify(old.get(x.id)),
    ),
    remove: base.items
      .filter((x) => !next.items.some((i) => i.id === x.id))
      .map((x) => x.id),
    collections: next.collections,
    tombstones: next.tombstones,
    suppressed: next.suppressed,
    imports: next.imports,
    customCategories: next.customCategories,
  };
  const { data, error } = await cloud.rpc("patch_library", {
    expected_revision: revision,
    patch,
  });
  if (error) throw Error(error.message);
  return Number(data);
}
export async function deleteCloudAccount() {
  if (!cloud) return;
  const { error } = await cloud.functions.invoke("delete-account");
  if (error)
    throw Error("Your account could not be deleted. Please try again.");
}
