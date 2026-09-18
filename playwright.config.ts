import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: process.env.CRATE_PRODUCTION_TEST
      ? "http://127.0.0.1:5174"
      : "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  webServer: {
    command: process.env.CRATE_PRODUCTION_TEST
      ? "node scripts/serve.mjs"
      : "npm run dev",
    url: process.env.CRATE_PRODUCTION_TEST
      ? "http://127.0.0.1:5174"
      : "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
