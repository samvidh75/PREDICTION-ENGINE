/**
 * Render a dc-runtime design page (public/frontend/*.dc.html) to static HTML.
 *
 * The design pages are not static markup — they are templates for support.js,
 * a generated design-tool React runtime. Rather than reimplementing that
 * template engine server-side (which would drift from the design), this loads
 * each template in headless Chromium and lets the *actual* runtime render it,
 * then captures the resulting DOM. Pixel-perfection therefore holds by
 * construction, and the captured HTML is crawler-visible without JS.
 *
 * Data is supplied through the runtime's own `data-props` seam: props are
 * merged over the page's renderVals(), so a partial object overrides only the
 * keys given and every other value falls back to the design's own default.
 */
import { createServer, type Server } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import type { Browser } from "playwright";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

export interface StaticServer {
  origin: string;
  close(): Promise<void>;
}

/**
 * Serve a directory over HTTP so the templates' relative asset paths
 * (./vendor/react.production.min.js, ./support.js, _ds/...) resolve exactly
 * as they do when the design is opened directly.
 *
 * `propsByKey` lets the server rewrite the `data-props` attribute per request
 * (?props=<key>), which is how real data reaches the runtime without editing
 * files on disk.
 */
export async function serveDirectory(
  root: string,
  propsByKey: Map<string, unknown> = new Map(),
): Promise<StaticServer> {
  const server: Server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      // decodeURIComponent so filenames with spaces resolve ("StockStory Stock Detail.dc.html").
      const rel = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, "");
      const filePath = join(root, rel);

      const info = await stat(filePath).catch(() => null);
      if (!info?.isFile()) {
        res.writeHead(404).end("not found");
        return;
      }

      let body = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();

      if (ext === ".html") {
        const propsKey = url.searchParams.get("props");
        const props = propsKey ? propsByKey.get(propsKey) : undefined;
        if (props !== undefined) {
          body = Buffer.from(injectDataProps(body.toString("utf-8"), props), "utf-8");
        }
      }

      res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
      res.end(body);
    } catch (err) {
      res.writeHead(500).end(String(err));
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("static server did not bind to a port");
  }

  return {
    origin: `http://127.0.0.1:${address.port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/**
 * Replace the `data-props="{}"` attribute on the dc script tag with real data.
 * Uses the JSON-in-attribute form the runtime already parses (support.js
 * parseDataProps), so nothing about the load path changes.
 */
export function injectDataProps(html: string, props: unknown): string {
  const encoded = JSON.stringify(props).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return html.replace(
    /(<script[^>]*\bdata-dc-script\b[^>]*\bdata-props=")([^"]*)(")/,
    `$1${encoded}$3`,
  );
}

/** Render one template and return its fully-rendered HTML. */
export async function renderTemplate(
  browser: Browser,
  url: string,
  opts: { timeoutMs?: number } = {},
): Promise<string> {
  const timeout = opts.timeoutMs ?? 30_000;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    await page.goto(url, { waitUntil: "networkidle", timeout });

    // The runtime hides <x-dc> and mounts a sibling tree. Wait for real
    // content rather than a fixed sleep, so a slow page is never captured
    // half-rendered.
    await page.waitForFunction(
      () => {
        const rendered = Array.from(document.body?.children ?? []).filter((el) => {
          const tag = el.tagName.toLowerCase();
          return tag !== "x-dc" && tag !== "script" && tag !== "style";
        });
        return rendered.some((el) => ((el as HTMLElement).innerText ?? "").trim().length > 0);
      },
      undefined,
      { timeout },
    );

    return await page.content();
  } finally {
    await page.close();
  }
}

/**
 * Strip the template machinery from captured HTML.
 *
 * The output is a finished static page; leaving support.js and the <x-dc>
 * template in place would make the browser re-render from renderVals()
 * defaults on load, visibly reverting real data back to the design's mock
 * values. Interactivity is intentionally out of scope for these pages.
 */
export function stripRuntime(html: string): string {
  return html
    .replace(/<x-dc[\s\S]*?<\/x-dc>/gi, "")
    .replace(/<script[^>]*\bdata-dc-script\b[\s\S]*?<\/script>/gi, "")
    .replace(
      /<script[^>]*src="[^"]*(?:react(?:-dom)?\.production\.min|support)\.js"[^>]*>\s*<\/script>/gi,
      "",
    )
    .replace(/<script[^>]*src="[^"]*_ds_bundle\.js"[^>]*>\s*<\/script>/gi, "");
}
