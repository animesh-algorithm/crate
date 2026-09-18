import { defineConfig, type Plugin } from "vitest/config";
import react from "@vitejs/plugin-react";
// ORT bundles an optional asyncify binary even with an explicit plain-WASM backend.
// We never use that backend; omitting it keeps Pages' 25 MiB single-asset limit.
const freeHostingAssets: Plugin = {
  name: "free-hosting-assets",
  generateBundle(_options, bundle) {
    for (const [name, entry] of Object.entries(bundle)) {
      if (
        name.includes("ort-wasm-simd-threaded.asyncify-") &&
        name.endsWith(".wasm")
      ) {
        delete bundle[name];
        continue;
      }
      if (
        entry.type === "asset" &&
        Buffer.byteLength(entry.source) > 25 * 1024 * 1024
      )
        throw Error(
          `Asset ${name} exceeds free hosting's single-file allowance.`,
        );
    }
  },
};
export default defineConfig({
  plugins: [react(), freeHostingAssets],
  test: { include: ["tests/**/*.test.ts"] },
  build: { chunkSizeWarningLimit: 650 },
});
