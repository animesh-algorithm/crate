import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type VercelConfig = {
  headers: Array<{
    source: string;
    headers: Array<{ key: string; value: string }>;
  }>;
};

function productionCsp() {
  const config = JSON.parse(
    readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
  ) as VercelConfig;
  return config.headers
    .find(({ source }) => source === "/(.*)")
    ?.headers.find(({ key }) => key === "Content-Security-Policy")?.value;
}

describe("production content security policy", () => {
  it("allows only the external script required by Firebase Google sign-in", () => {
    const csp = productionCsp();

    expect(csp).toContain(
      "script-src 'self' 'wasm-unsafe-eval' https://apis.google.com",
    );
    expect(csp).not.toContain("script-src *");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("keeps the Firebase auth handler in the frame allowlist", () => {
    expect(productionCsp()).toContain(
      "frame-src https://www.instagram.com https://crate-a34ae.firebaseapp.com",
    );
  });
});
