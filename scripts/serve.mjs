// Local production verification server: applies Vercel's configured headers.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
const root = resolve("dist");
const vercel = JSON.parse(await readFile("vercel.json", "utf8"));
const configuredHeaders = Object.fromEntries(
  vercel.headers
    .find((entry) => entry.source === "/(.*)")
    .headers.map(({ key, value }) => [key, value]),
);

console.log(configuredHeaders["Content-Security-Policy"]);
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
  ".webp": "image/webp",
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
        ...configuredHeaders,
        "Content-Type": types[extname(file)] || "application/octet-stream",
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
