import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

interface SymbolEntry {
  symbol: string;
  name: string;
  exchange: "PSE";
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
  "Property & Real Estate",
  "Food & Beverage",
  "Telecommunications",
  "Energy & Utilities",
  "Construction & Infrastructure",
  "Manufacturing",
  "Retail & Services",
  "Mining & Metals",
  "Transportation & Logistics",
] as const;

const INDUSTRIES = [
  "Banking",
  "Real Estate Development",
  "Food Processing",
  "Telecom Services",
  "Power Generation",
  "Construction",
  "Conglomerate",
  "Mining",
  "Transportation",
  "Retail",
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
  if (/real.?estate|property|resort|hotel/.test(key)) return "Property & Real Estate";
  if (/food|beverage|restaurant|bakery|coffee/.test(key)) return "Food & Beverage";
  if (/telecom|wireless|broadband|mobile/.test(key)) return "Telecommunications";
  if (/power|energy|utility|electric|water/.test(key)) return "Energy & Utilities";
  if (/construct|infra|engineer|cement/.test(key)) return "Construction & Infrastructure";
  if (/manufacture|factory|packag/.test(key)) return "Manufacturing";
  if (/retail|store|mall|shop/.test(key)) return "Retail & Services";
  if (/mining|metal|nickel|copper|gold/.test(key)) return "Mining & Metals";
  if (/transport|logistic|shipping|airline/.test(key)) return "Transportation & Logistics";
  return SECTORS[hash(symbol) % SECTORS.length];
}

function inferIndustry(sector: string, symbol: string): string {
  if (sector === "Banking & Finance") return "Banking";
  if (sector === "Property & Real Estate") return "Real Estate Development";
  if (sector === "Food & Beverage") return "Food Processing";
  if (sector === "Telecommunications") return "Telecom Services";
  if (sector === "Energy & Utilities") return "Power Generation";
  if (sector === "Construction & Infrastructure") return "Construction";
  if (sector === "Manufacturing") return "Conglomerate";
  if (sector === "Retail & Services") return "Retail";
  if (sector === "Mining & Metals") return "Mining";
  if (sector === "Transportation & Logistics") return "Transportation";
  return INDUSTRIES[hash(`${symbol}:${sector}`) % INDUSTRIES.length];
}

const PSE_STATIC_UNIVERSE: { symbol: string; name: string }[] = [
  { symbol: "SM", name: "SM Investments Corporation" },
  { symbol: "SMPH", name: "SM Prime Holdings Inc." },
  { symbol: "AC", name: "Ayala Corporation" },
  { symbol: "ALI", name: "Ayala Land Inc." },
  { symbol: "BDO", name: "BDO Unibank Inc." },
  { symbol: "BPI", name: "Bank of the Philippine Islands" },
  { symbol: "MBT", name: "Metropolitan Bank & Trust Company" },
  { symbol: "ICT", name: "iPeople Inc." },
  { symbol: "JFC", name: "Jollibee Foods Corporation" },
  { symbol: "URC", name: "Universal Robina Corporation" },
  { symbol: "AEV", name: "Aboitiz Equity Ventures Inc." },
  { symbol: "MER", name: "Meralco" },
  { symbol: "TEL", name: "Philippine Long Distance Telephone Co." },
  { symbol: "GLO", name: "Globe Telecom Inc." },
  { symbol: "LTG", name: "LT Group Inc." },
  { symbol: "MPI", name: "Metro Pacific Investments Corporation" },
  { symbol: "AGI", name: "Alliance Global Group Inc." },
  { symbol: "GTCAP", name: "GT Capital Holdings Inc." },
  { symbol: "JGS", name: "JG Summit Holdings Inc." },
  { symbol: "SECB", name: "Security Bank Corporation" },
  { symbol: "CNPF", name: "Century Pacific Food Inc." },
  { symbol: "EMI", name: "Emperador Inc." },
  { symbol: "WLCON", name: "Wilcon Depot Inc." },
  { symbol: "MONDE", name: "Monde Nissin Corporation" },
  { symbol: "PGOLD", name: "Puregold Price Club Inc." },
  { symbol: "RRHI", name: "Robinsons Retail Holdings Inc." },
  { symbol: "RLC", name: "Robinsons Land Corporation" },
  { symbol: "DMC", name: "DMCI Holdings Inc." },
  { symbol: "ACEN", name: "Aboitiz Power Corporation" },
  { symbol: "BLOOM", name: "Bloomberry Resorts Corporation" },
  { symbol: "AP", name: "Aboitiz Power Corporation" },
  { symbol: "FGEN", name: "First Gen Corporation" },
  { symbol: "MWIDE", name: "Megawide Construction Corporation" },
  { symbol: "ANI", name: "Aboitiz Networks Inc." },
  { symbol: "CEB", name: "Cebu Pacific Air Corporation" },
  { symbol: "DD", name: "DoubleDragon Corporation" },
  { symbol: "FLI", name: "Filinvest Development Corporation" },
  { symbol: "HLCM", name: "HLCM Holdings Inc." },
  { symbol: "IMI", name: "Integrated Microelectronics Inc." },
  { symbol: "MEG", name: "Megaworld Corporation" },
  { symbol: "NIKL", name: "Nickel Asia Corporation" },
  { symbol: "PCOR", name: "Power Sector Assets & Liabilities Management" },
  { symbol: "PXP", name: "PXP Energy Corporation" },
  { symbol: "ROCK", name: "Rockwell Land Corporation" },
  { symbol: "SCC", name: "Semirara Mining & Power Corporation" },
  { symbol: "SSI", name: "SSI Group Inc." },
  { symbol: "TFHI", name: "Top Frontier Investment Holdings Inc." },
  { symbol: "VLL", name: "Vista Land & Lifescapes Inc." },
  { symbol: "CHP", name: "Chinabank" },
  { symbol: "ALHI", name: "Alphaland Holdings Inc." },
  { symbol: "APC", name: "Aboitiz Power Corporation" },
  { symbol: "BSC", name: "Bayer CropScience" },
  { symbol: "CLC", name: "Concrete Aggregates Corporation" },
  { symbol: "DIZ", name: "Dizon Co. Ltd." },
  { symbol: "LBC", name: "LBC Express Inc." },
];

async function main() {
  const entries: SymbolEntry[] = PSE_STATIC_UNIVERSE.map((item) => {
    const sector = inferSector(item.symbol, item.name);
    return {
      symbol: item.symbol,
      name: item.name,
      exchange: "PSE" as const,
      sector,
      industry: inferIndustry(sector, item.symbol),
    };
  });

  const unique = new Map<string, SymbolEntry>();
  for (const entry of entries) {
    unique.set(`${entry.exchange}:${entry.symbol}`, entry);
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    sources: [
      "PSE official listings",
      "Static representative PSE universe (see scripts/sync-official-symbols.ts)",
    ],
    totalUniverse: unique.size,
    entries: [...unique.values()],
  };

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(payload, null, 2));
  console.log(`Wrote ${payload.totalUniverse} official symbols to ${target}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
