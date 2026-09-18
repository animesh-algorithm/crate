import { pipeline, env } from "@huggingface/transformers";
import { MODEL, MODEL_REVISION } from "../lib/model-config";
env.allowLocalModels = false;
env.useWasmCache = false;
// Serve the pinned runtime ourselves; no executable code is loaded from a third-party CDN.
env.backends.onnx.wasm!.wasmPaths = {
  mjs: new URL(
    "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs",
    import.meta.url,
  ).href,
  wasm: new URL(
    "../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm",
    import.meta.url,
  ).href,
};
env.backends.onnx.wasm!.numThreads = 1;
type Extractor = (
  text: string,
  options: unknown,
) => Promise<{ data: Float32Array }>;
let extractor: Extractor | null = null;
let sequence = Promise.resolve();
self.onmessage = (e: MessageEvent<{ id: number; text: string }>) => {
  sequence = sequence.then(async () => {
    try {
      if (!extractor)
        extractor = (await pipeline("feature-extraction", MODEL, {
          revision: MODEL_REVISION,
          dtype: "q8",
          device: "wasm",
          progress_callback: (p: unknown) => {
            const v = p as { status: string; loaded?: number; total?: number };
            if (v.status === "progress")
              self.postMessage({
                type: "download",
                loaded: v.loaded || 0,
                total: v.total || 0,
              });
          },
        })) as unknown as Extractor;
      const output = await (
        extractor as unknown as (
          t: string,
          o: unknown,
        ) => Promise<{ data: Float32Array }>
      )(e.data.text, { pooling: "mean", normalize: true });
      self.postMessage({ id: e.data.id, vector: Array.from(output.data) });
    } catch {
      self.postMessage({
        id: e.data.id,
        error:
          "Smarter search is unavailable right now. You can keep using exact search and try again later.",
      });
    }
  });
};
