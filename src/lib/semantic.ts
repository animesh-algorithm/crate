import { db } from "./db";
import { textFor, type Item } from "./model";
import { MODEL_REVISION } from "./model-config";
export async function sourceHash(item: Item) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(MODEL_REVISION + textFor(item)),
      ),
    ),
  )
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
export class Semantic {
  private worker: Worker | null = null;
  private pending = new Map<
    number,
    { resolve: (v: number[]) => void; reject: (e: Error) => void }
  >();
  private sequence = 0;
  private generation = 0;
  constructor(private onDownload: (loaded: number, total: number) => void) {}
  private init() {
    if (this.worker) return;
    this.worker = new Worker(
      new URL("../workers/semantic.worker.ts", import.meta.url),
      { type: "module" },
    );
    this.worker.onmessage = (e) => {
      if (e.data.type === "download") {
        this.onDownload(e.data.loaded, e.data.total);
        return;
      }
      const entry = this.pending.get(e.data.id);
      if (!entry) return;
      this.pending.delete(e.data.id);
      if (e.data.error) entry.reject(Error(e.data.error));
      else entry.resolve(e.data.vector);
    };
    this.worker.onerror = () => {
      for (const p of this.pending.values())
        p.reject(
          Error(
            "Smarter search could not start on this device. Exact search is still available.",
          ),
        );
      this.pending.clear();
      this.worker?.terminate();
      this.worker = null;
    };
  }
  private run(text: string) {
    this.init();
    const id = ++this.sequence;
    return new Promise<number[]>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ id, text });
    });
  }
  async passage(owner: string, item: Item) {
    const generation = this.generation;
    const hash = await sourceHash(item),
      key = `${owner}:${item.id}`;
    const cached = await db.vectors.get(key);
    if (generation !== this.generation)
      throw Error("Paused. Your progress is saved.");
    if (cached?.hash === hash) return cached.values;
    const values = await this.run("passage: " + textFor(item));
    if (generation !== this.generation)
      throw Error("Paused. Your progress is saved.");
    if (values.length !== 384 || values.some((v) => !Number.isFinite(v)))
      throw Error("Smarter search could not read this save. Please try again.");
    await db.vectors.put({ key, owner, itemId: item.id, hash, values });
    return values;
  }
  query(text: string) {
    return this.run("query: " + text);
  }
  cancel() {
    this.generation++;
    this.worker?.terminate();
    this.worker = null;
    for (const p of this.pending.values())
      p.reject(Error("Paused. Your progress is saved."));
    this.pending.clear();
  }
}
