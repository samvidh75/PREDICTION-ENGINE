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
  // The composite score, its verdict word, and the coverage figure are all
  // hardcoded. Without binding these, every stock would advertise "88 /100
  // Excellent" regardless of what its fundamentals actually say.
  {
    find: `<span class="n" style="font-size:34px; font-weight:600; line-height:1;">88</span>`,
    replace: `<span class="n" style="font-size:34px; font-weight:600; line-height:1;">{{ scoreText }}</span>`,
    defaultKey: "scoreText",
    defaultValue: "88",
  },
  {
    find: `<span style="font-size:10.5px; font-weight:600; color:#1A7F37; margin-top:2px;">Excellent</span>`,
    replace: `<span style="font-size:10.5px; font-weight:600; color:{{ scoreLabelColor }}; margin-top:2px;">{{ scoreLabel }}</span>`,
    defaultKey: "scoreLabel",
    defaultValue: "Excellent",
  },
  {
    find: `<span style="color:#1A7F37; font-weight:600;">88% of key metrics</span>`,
    replace: `<span style="color:#1A7F37; font-weight:600;">{{ coverageText }}</span>`,
    defaultKey: "coverageText",
    defaultValue: "88% of key metrics",
  },
  // Asserted closing time, shown even when the market state is unknown.
  {
    find: `<div class="lb" style="font-size:11.5px; white-space:nowrap;">Closes 3:30 PM PHT</div>`,
    replace: `<div class="lb" style="font-size:11.5px; white-space:nowrap;">{{ closesText }}</div>`,
    defaultKey: "closesText",
    defaultValue: "Closes 3:30 PM PHT",
  },
  // "Overall: High" is a trust claim about our own data quality, asserted
  // unconditionally. It must reflect measured coverage, not be a constant.
  {
    find: `<span style="font-size:12.5px; font-weight:600; color:#1A7F37;">High</span>`,
    replace: `<span style="font-size:12.5px; font-weight:600; color:{{ confidenceColor }};">{{ confidenceOverall }}</span>`,
    defaultKey: "confidenceOverall",
    defaultValue: "High",
  },
  // Benchmark return for the comparison line on the performance chart.
  {
    find: `background:#C4C4BD;"></span>PSE Index <span class="n" style="font-weight:600;">+38.4%</span>`,
    replace: `background:#C4C4BD;"></span>PSE Index <span class="n" style="font-weight:600;">{{ benchReturnText }}</span>`,
    defaultKey: "benchReturnText",
    defaultValue: "+38.4%",
  },
  // The "to estimate" badge is derived from a fair value we do not compute
  // here; hardcoded, it would claim an upside for every stock.
  {
    find: `color:#166B2E;">+11.2% to estimate</span>`,
    replace: `color:#166B2E;">{{ upsideText }}</span>`,
    defaultKey: "upsideText",
    defaultValue: "+11.2% to estimate",
  },
  // A BDO-specific research summary sitting in the markup. Unbound, this
  // paragraph would describe BDO on all 282 pages, including companies in
  // unrelated sectors.
  {
    find: `BDO is the country's largest bank by assets, with a low-cost deposit franchise, disciplined provisioning, and a lending book that has compounded through two rate cycles.</div>`,
    replace: `{{ narrativeText }}</div>`,
    defaultKey: "narrativeText",
    defaultValue:
      "BDO is the country's largest bank by assets, with a low-cost deposit franchise, disciplined provisioning, and a lending book that has compounded through two rate cycles.",
  },
];

/** Colour default paired with changeText; green matches the original markup. */
const EXTRA_DEFAULTS: Record<string, string> = {
  changeColor: "#1A7F37",
  scoreLabelColor: "#1A7F37",
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

/**
 * Make injected props take precedence over the design's own values.
 *
 * support.js:1085 computes `vals = { ...userProps, ...renderVals() }` — the
 * page's own values spread LAST, so anything passed via data-props is
 * overwritten by the design defaults. Injection alone therefore has no effect.
 *
 * Rather than rewrite every key in the return object, the original method is
 * renamed and a wrapper re-spreads props after it. Precedence flips for every
 * key at once, and an unsupplied key still falls through to the design value.
 * `this.props` here is already stripped of runtime internals (support.js:964).
 */
function addPropsPrecedence(html: string): string {
  const marker = "  renderVals() {";
  if (!html.includes(marker)) throw new Error("renderVals() declaration not found");

  return html.replace(
    marker,
    `  renderVals() {
    // Design values first, real injected data last — see prepareTemplates.ts.
    return { ...this.__dcDesignVals(), ...(this.props || {}) };
  }

  __dcDesignVals() {`,
  );
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
      out = addPropsPrecedence(out);
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
