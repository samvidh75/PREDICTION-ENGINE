# Nano Banana image pipeline (Claude Code MCP)

StockEx uses **Google's Nano Banana** (`gemini-2.5-flash-image`) to generate
premium marketing visuals for the public pages, wiring them in through Claude
Code. This is a **real** generation pipeline — no fake/placeholder images are
committed; every asset is generated and verified as a real PNG/JPEG before use.

## How it's wired

- **`scripts/mcp/nano-banana-server.mjs`** — a zero-dependency MCP server.
  It implements the MCP stdio (JSON-RPC) protocol directly and calls the Gemini
  REST API with Node's built-in `https`, writing images into
  `public/assets/nano-banana/`. Zero-dependency because this repo keeps
  `node_modules` pruned (`.ignored_*` dirs), so extra scoped packages don't
  reliably land where `require` can see them.
- **`.mcp.json`** — registers the server for Claude Code CLI:
  ```json
  {
    "mcpServers": {
      "nano-banana": {
        "type": "stdio",
        "command": "node",
        "args": ["scripts/mcp/nano-banana-server.mjs"]
      }
    }
  }
  ```
- **`src/components/nano/BananaBanner.tsx`** — the page component that renders a
  generated asset with a graceful CSS-gradient fallback (never a broken image).
- **`src/lib/nanoAssets.ts`** — manifest mapping logical names to asset paths.
- **`src/lib/nanoPromptPack.ts`** — the canonical prompts for each asset.

## 1. Get an API key

Add your Google AI Studio key to **`.env.local`** (already gitignored):
```
GEMINI_API_KEY=...
```
The server also accepts `GOOGLE_API_KEY` or the shell env var. Restart Claude
Code after adding it.

## 2. Verify the server is registered

`claude mcp list` should show `nano-banana`. Quick smoke test:
```bash
npm run nano:smoke
# expect: serverInfo{...}  +  tools[generate_image, edit_image]
```

## 3. Generate the marketing assets

Run each prompt from `src/lib/nanoPromptPack.ts` — via Claude Code:

> Use the `generate_image` tool in the nano-banana MCP server with the
> `landingHero` prompt, filename `stockex-landing-hero`, aspect `16:9`.

Or from the terminal (no Claude Code needed):
```bash
npm run nano:generate -- --generate "<prompt text>" --filename stockex-landing-hero --aspect 16:9
```

Assets are saved to `public/assets/nano-banana/`. Because they live under
`public/`, Vite copies them into the build automatically. They are committed to
git (they are real generated content and the site references them).

## Pages that reference generated assets

| Page | Route | Asset (`NANOBANANA_ASSETS`) |
|------|-------|------------------------------|
| Landing (About) | `/about` | `landingHero` (16:9 showcase band) |
| Pricing | `/pricing` | `pricingHero` (16:9 hero) |
| Trust | `/trust` | `trustHero` (16:9 hero) |
| (optional) social card | — | `ogCard` (16:9) |

Until an asset is generated, `BananaBanner` shows a branded gradient — designed
to look intentional, not broken. Once the file exists it immediately switches
to the real image.

## Community slash-command (optional)

The article referenced a community plugin (`jawhnycooke/claude-code-nano-banana`).
Note: that plugin is **only a JSON-prompt translator** (it outputs structured
Nano Banana Pro schemas) — it does **not** generate images. The MCP server above
is the actual generation path. If you still want the translator:
```
/plugin marketplace add https://github.com/jawhnycooke/claude-code-nano-banana
/plugin   # browse → select nano-banana → i to install → /exit and restart
```

## Safety / anti-fabrication

- The server refuses to write non-image payloads (byte-sniffs PNG/JPEG) so a
  text error is never saved as an image.
- `BananaBanner` only shows an image it successfully loaded; otherwise it shows
  the gradient. It never pretends an asset exists.
- Prompts deliberately avoid embedding fake tickers, prices, or logos — the
  assets are abstract artwork, not fabricated market data.
