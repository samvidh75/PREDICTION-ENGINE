# Generated Nano Banana assets

This folder is where the **nano-banana** MCP server / CLI writes real generated
images for the StockEx marketing pages (see `docs/nano-banana.md`).

- Generate: `npm run nano:generate -- --generate "<prompt>" --filename <name>`
  or via the `nano-banana` MCP server in Claude Code.
- Consume: `NANOBANANA_ASSETS` in `src/lib/nanoAssets.ts` + the
  `<BananaBanner>` component (`src/components/nano/BananaBanner.tsx`), which
  falls back to a branded gradient when a file is absent.

Every file here is a real, generated PNG/JPEG — never a fake placeholder.
