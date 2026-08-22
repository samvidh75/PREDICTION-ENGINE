/**
 * Prepare design templates for real data.
 *
 * The design pages bind most content through `{{ }}` + renderVals(), but a
 * dozen headline values are hardcoded literal text in the markup — the price,
 * company name, ticker, fair value, chart legend. Left alone, every one of the
 * 282 stock pages would display BDO's mock numbers.
 *
 * This rewrites those literals into `{{ }}` bindings and seeds renderVals()
 * with defaults equal to the original literals. Two consequences:
 *   - With no data supplied, output is byte-identical to the design (the
 *     identity invariant Stage 2 verifies).
 *   - With data-props supplied, real values override — no layout change.
 *
 * Originals in public/frontend/ are never modified; edited copies go to
 * public/frontend/templates/ so the originals remain the parity reference.
 */
import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "..");
const SRC_DIR = path.join(root, "public", "frontend");
const OUT_DIR = path.join(root, "public", "frontend", "templates");

interface Replacement {
  /** Exact source substring. Must be unique in the file. */
  find: string;
  /** Replacement, normally introducing a `{{ binding }}`. */
  replace: string;
  /** renderVals() default — the literal this binding replaced. */
  defaultKey?: string;
  defaultValue?: string;
}

/**
 * Stock Detail literals. Each default reproduces the original text exactly, so
 * an un-supplied key renders the design unchanged.
 */
const STOCK_DETAIL: Replacement[] = [
  {
    find: `font-weight:700; flex-shrink:0;">BDO</div>`,
    replace: `font-weight:700; flex-shrink:0;">{{ avatarText }}</div>`,
    defaultKey: "avatarText",
    defaultValue: "BDO",
  },
  {
    find: `line-height:1.12;">BDO Unibank, Inc.</h1>`,
    replace: `line-height:1.12;">{{ companyNameText }}</h1>`,
    defaultKey: "companyNameText",
    defaultValue: "BDO Unibank, Inc.",
  },
  {
    find: `<span style="font-size:13px; font-weight:600;">BDO</span>`,
    replace: `<span style="font-size:13px; font-weight:600;">{{ tickerText }}</span>`,
    defaultKey: "tickerText",
    defaultValue: "BDO",
  },
  {
    find: `<span class="lb" style="font-size:11.5px;">Financials · Banks</span>`,
    replace: `<span class="lb" style="font-size:11.5px;">{{ sectorText }}</span>`,
    defaultKey: "sectorText",
    defaultValue: "Financials · Banks",
  },
  {
    find: `line-height:1;">₱142.50</div>`,
    replace: `line-height:1;">{{ priceText }}</div>`,
    defaultKey: "priceText",
    defaultValue: "₱142.50",
  },
  // The change line's colour is hardcoded green. A stock that closed down must
  // not render its loss in the gain colour, so bind the colour too.
  {
    find: `<div class="n" style="font-size:14px; font-weight:500; color:#1A7F37; margin-top:7px;">+2.55 (+1.82%)</div>`,
    replace: `<div class="n" style="font-size:14px; font-weight:500; color:{{ changeColor }}; margin-top:7px;">{{ changeText }}</div>`,
    defaultKey: "changeText",
    defaultValue: "+2.55 (+1.82%)",
  },
  {
    find: `>As of 14 Aug 2026, 11:15 AM PHT</div>`,
    replace: `>{{ asOfText }}</div>`,
    defaultKey: "asOfText",
    defaultValue: "As of 14 Aug 2026, 11:15 AM PHT",
  },
  {
    find: `letter-spacing:-0.03em;">₱158.40</span>`,
    replace: `letter-spacing:-0.03em;">{{ fairValueText }}</span>`,
    defaultKey: "fairValueText",
    defaultValue: "₱158.40",
  },
  {
    find: `background:#1A7F37;"></span>BDO <span class="n" style="font-weight:600;">+142.6%</span>`,
    replace: `background:#1A7F37;"></span>{{ tickerText }} <span class="n" style="font-weight:600;">{{ chartReturnText }}</span>`,
    defaultKey: "chartReturnText",
    defaultValue: "+142.6%",
  },
  {
    find: `Market is Open</div>`,
    replace: `{{ marketStatusText }}</div>`,
    defaultKey: "marketStatusText",
    defaultValue: "Market is Open",
  },
];

/** Colour default paired with changeText; green matches the original markup. */
const EXTRA_DEFAULTS: Record<string, string> = {
  changeColor: "#1A7F37",
};

function applyReplacements(html: string, reps: Replacement[], file: string): string {
  let out = html;
  for (const rep of reps) {
    const count = out.split(rep.find).length - 1;
    if (count === 0) {
      throw new Error(`[${file}] literal not found (design changed?): ${rep.find.slice(0, 60)}…`);
    }
    if (count > 1) {
      throw new Error(`[${file}] literal is ambiguous (${count} matches): ${rep.find.slice(0, 60)}…`);
    }
    out = out.replace(rep.find, rep.replace);
  }
  return out;
}

/** Seed renderVals()'s returned object with the defaults for the new bindings. */
function injectDefaults(html: string, defaults: Record<string, string>): string {
  const entries = Object.entries(defaults)
    .map(([k, v]) => `      ${k}: ${JSON.stringify(v)},`)
    .join("\n");

  const marker = "    return {";
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error("renderVals() return block not found");

  return (
    html.slice(0, idx + marker.length) +
    `\n      // Defaults for bindings converted from hardcoded literals. Supplying\n` +
    `      // the same key via data-props overrides these with real data.\n` +
    entries +
    html.slice(idx + marker.length)
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  // Copy every asset the templates load relatively, so the prepared directory
  // renders standalone exactly as the design directory does.
  for (const asset of ["support.js", "vendor", "_ds"]) {
    const from = path.join(SRC_DIR, asset);
    const to = path.join(OUT_DIR, asset);
    await copyDir(from, to).catch(async () => {
      await copyFile(from, to);
    });
  }

  const files = (await readdir(SRC_DIR)).filter((f) => f.endsWith(".dc.html"));
  let converted = 0;

  for (const file of files) {
    const src = await readFile(path.join(SRC_DIR, file), "utf-8");
    let out = src;

    if (file === "StockStory Stock Detail.dc.html") {
      out = applyReplacements(out, STOCK_DETAIL, file);
      const defaults: Record<string, string> = { ...EXTRA_DEFAULTS };
      for (const r of STOCK_DETAIL) {
        if (r.defaultKey && r.defaultValue !== undefined) defaults[r.defaultKey] = r.defaultValue;
      }
      out = injectDefaults(out, defaults);
      converted++;
    }

    await writeFile(path.join(OUT_DIR, file), out);
  }

  console.log(`Prepared ${files.length} templates in ${OUT_DIR}`);
  console.log(`  literal→binding conversions applied to ${converted} page(s)`);
  console.log(`  bindings added: ${Object.keys(EXTRA_DEFAULTS).length + STOCK_DETAIL.length}`);
}

async function copyDir(from: string, to: string): Promise<void> {
  const entries = await readdir(from, { withFileTypes: true });
  await mkdir(to, { recursive: true });
  for (const entry of entries) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await copyFile(s, d);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
