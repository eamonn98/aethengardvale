import { join, normalize } from "node:path";

const distDir = join(import.meta.dir, "..", "dist");
const port = Number(process.env.PORT ?? 4173);

const server = Bun.serve({
  port,
  async fetch(req) {
    const url = new URL(req.url);
    const reqPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(reqPath).replace(/^(\.\.(\/|\\|$))+/, "");
    const filePath = join(distDir, safePath);
    const file = Bun.file(filePath);

    if (await file.exists()) {
      return new Response(file);
    }

    const fallback = Bun.file(join(distDir, "index.html"));
    if (await fallback.exists()) {
      return new Response(fallback);
    }

    return new Response("Not Found — run `bun run build` first.", {
      status: 404,
    });
  },
});

console.log(`Aethelgard Vale preview server running at ${server.url}`);
