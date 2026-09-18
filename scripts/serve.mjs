// Local production verification server: applies the same CSP as Pages.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const headerFile = await readFile("public/_headers", "utf8");
const csp = headerFile
  .split("\n")
  .find((x) => x.trim().startsWith("Content-Security-Policy:"))
  .trim()
  .slice("Content-Security-Policy:".length)
  .trim();
const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".svg": "image/svg+xml",
};
http
  .createServer(async (req, res) => {
    try {
      const path = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let file = resolve(root, "." + path);
      if (!file.startsWith(root + "/")) file = root + "/index.html";
      try {
        if (!(await stat(file)).isFile()) file = root + "/index.html";
      } catch {
        file = root + "/index.html";
      }
      res.writeHead(200, {
        "Content-Type": types[extname(file)] || "application/octet-stream",
        "Content-Security-Policy": csp,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(500);
      res.end("Unavailable");
    }
  })
  .listen(5174, "127.0.0.1", () =>
    console.log("Production verification: http://127.0.0.1:5174"),
  );
