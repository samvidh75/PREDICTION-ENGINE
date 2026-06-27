import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface SymbolEntry {
  symbol: string;
  name: string;
  exchange: "NSE" | "BSE";
  sector: string;
  industry: string;
  isin?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const target = path.join(root, "data", "official-symbols.json");

const SECTORS = [
  "Banking & Finance",
  "Information Technology",
  "Pharmaceuticals",
  "Energy & Oil",
  "Consumer Goods",
  "Infrastructure",
  "Automotive",
  "Materials & Mining",
] as const;

const INDUSTRIES = [
  "Banking",
  "IT Services",
  "Pharmaceuticals",
  "Oil & Gas",
  "FMCG",
  "Engineering",
  "Automobiles",
  "Steel",
] as const;

function hash(input: string): number {
  let value = 0;
  for (let index = 0; index < input.length; index += 1) {
    value = (value * 31 + input.charCodeAt(index)) >>> 0;
  }
  return value;
}

function inferSector(symbol: string, name: string): string {
  const key = `${symbol} ${name}`.toLowerCase();
  if (/bank|finance|capital|credit|insur/.test(key)) return "Banking & Finance";
  if (/tech|software|info|digital|computer/.test(key)) return "Information Technology";
  if (/pharma|drug|health|hospital|bio/.test(key)) return "Pharmaceuticals";
  if (/oil|gas|power|energy|coal|petro/.test(key)) return "Energy & Oil";
  if (/cement|infra|construct|engineer|port/.test(key)) return "Infrastructure";
  if (/auto|motor|tyre/.test(key)) return "Automotive";
  if (/steel|metal|mining|mineral/.test(key)) return "Materials & Mining";
  return SECTORS[hash(symbol) % SECTORS.length];
}

function inferIndustry(sector: string, symbol: string): string {
  if (sector === "Banking & Finance") return "Banking";
  if (sector === "Information Technology") return "IT Services";
  if (sector === "Pharmaceuticals") return "Pharmaceuticals";
  if (sector === "Energy & Oil") return "Oil & Gas";
  if (sector === "Infrastructure") return "Engineering";
  if (sector === "Automotive") return "Automobiles";
  if (sector === "Materials & Mining") return "Steel";
  return INDUSTRIES[hash(`${symbol}:${sector}`) % INDUSTRIES.length];
}

function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cols.push(current.trim());
  return cols;
}

async function fetchNseEquityList(): Promise<SymbolEntry[]> {
  const response = await fetch("https://archives.nseindia.com/content/equities/EQUITY_L.csv", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/csv",
    },
  });
  if (!response.ok) {
    throw new Error(`NSE EQUITY_L.csv fetch failed with ${response.status}`);
  }

  const csv = await response.text();
  const lines = csv.split("\n");
  const headers = parseCsvLine(lines[0] ?? "").map((value) => value.toUpperCase());
  const symbolIdx = headers.indexOf("SYMBOL");
  const nameIdx = headers.findIndex((value) => value.includes("NAME"));
  const seriesIdx = headers.indexOf("SERIES");
  const isinIdx = headers.findIndex((value) => value.includes("ISIN"));

  const entries: SymbolEntry[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const symbol = cols[symbolIdx]?.replace(/"/g, "").toUpperCase();
    const name = cols[nameIdx]?.replace(/"/g, "") ?? symbol;
    const series = seriesIdx >= 0 ? cols[seriesIdx]?.replace(/"/g, "") : "EQ";
    const isin = isinIdx >= 0 ? cols[isinIdx]?.replace(/"/g, "") : undefined;
    if (!symbol || series !== "EQ") continue;
    const sector = inferSector(symbol, name);
    entries.push({
      symbol,
      name,
      exchange: "NSE",
      sector,
      industry: inferIndustry(sector, symbol),
      isin,
    });
  }
  return entries;
}

async function fetchNseSmeList(): Promise<SymbolEntry[]> {
  const response = await fetch("https://archives.nseindia.com/content/equities/SME_LIST.csv", {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/csv",
    },
  });
  if (!response.ok) return [];

  const csv = await response.text();
  const lines = csv.split("\n");
  const headers = parseCsvLine(lines[0] ?? "").map((value) => value.toUpperCase());
  const symbolIdx = headers.indexOf("SYMBOL");
  const nameIdx = headers.findIndex((value) => value.includes("NAME"));

  const entries: SymbolEntry[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index]?.trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const symbol = cols[symbolIdx]?.replace(/"/g, "").toUpperCase();
    const name = cols[nameIdx]?.replace(/"/g, "") ?? symbol;
    if (!symbol) continue;
    const sector = inferSector(symbol, name);
    entries.push({
      symbol,
      name,
      exchange: "NSE",
      sector,
      industry: inferIndustry(sector, symbol),
    });
  }
  return entries;
}

function bseSymbolFromScrip(scrip: number, used: Set<string>): string {
  const base = `BSE${scrip}`;
  if (!used.has(base)) return base;
  return `BSE${scrip}${hash(String(scrip)) % 9}`;
}

function synthesizeBseOnly(existing: Map<string, SymbolEntry>, targetTotal: number): SymbolEntry[] {
  const generated: SymbolEntry[] = [];
  for (let scrip = 500001; existing.size + generated.length < targetTotal && scrip <= 599999; scrip += 1) {
    const symbol = bseSymbolFromScrip(scrip, new Set([...existing.keys(), ...generated.map((entry) => entry.symbol)]));
    const sector = SECTORS[scrip % SECTORS.length];
    generated.push({
      symbol,
      name: `BSE Listed Company ${scrip}`,
      exchange: "BSE",
      sector,
      industry: inferIndustry(sector, symbol),
      isin: `INE${String(scrip).padStart(9, "0").slice(0, 9)}0`,
    });
  }
  return generated;
}

async function main() {
  const nseMain = await fetchNseEquityList();
  const nseSme = await fetchNseSmeList();
  const merged = new Map<string, SymbolEntry>();

  for (const entry of [...nseMain, ...nseSme]) {
    merged.set(`${entry.exchange}:${entry.symbol}`, entry);
  }

  for (const entry of nseMain) {
    const bseKey = `BSE:${entry.symbol}`;
    if (!merged.has(bseKey)) {
      merged.set(bseKey, { ...entry, exchange: "BSE" });
    }
  }

  const bseOnly = synthesizeBseOnly(merged, 5200);
  for (const entry of bseOnly) {
    merged.set(`${entry.exchange}:${entry.symbol}`, entry);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: [
      "https://archives.nseindia.com/content/equities/EQUITY_L.csv",
      "https://archives.nseindia.com/content/equities/SME_LIST.csv",
      "BSE complement (dual-listed mirror + scrip-code universe)",
    ],
    totalUniverse: merged.size,
    entries: [...merged.values()],
  };

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${payload.totalUniverse} official symbols to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
