// Zero-dependency static server for local development: `npm run dev`.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT) || 5173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url, "http://localhost");
    const target = resolve(root, `.${decodeURIComponent(pathname)}`);
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const file = (await stat(target)).isDirectory() ? join(target, "index.html") : target;
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch (error) {
    const status = error instanceof URIError ? 400 : error?.code === "ENOENT" ? 404 : 500;
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" }).end(status === 404 ? "Not found" : "Error");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Portfolio running at http://localhost:${port}`);
});
