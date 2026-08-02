// Curated PSE (Philippine Stock Exchange) Index universe — symbols only, no prices or fabricated scores.
// Used by public scanner flows for batch pipeline runs.

export const PSEI_SYMBOLS: string[] = [
  'SM', 'SMPH', 'AC', 'ALI', 'BDO',
  'BPI', 'MBT', 'ICT', 'JFC', 'URC',
  'AEV', 'MER', 'TEL', 'GLO', 'LTG',
  'MPI', 'AGI', 'GTCAP', 'JGS', 'SECB',
  'CNPF', 'EMI', 'WLCON', 'MONDE', 'PGOLD',
  'RRHI', 'RLC', 'DMC', 'ACEN', 'BLOOM',
  'AP', 'FGEN', 'MWIDE', 'ANI', 'CEB',
  'DD', 'FLI', 'HLCM', 'IMI', 'MEG',
  'NIKL', 'PCOR', 'PXP', 'ROCK', 'SCC',
  'SSI', 'TFHI', 'VLL', 'CHP',
];

/** Symbol display names (API symbol → human-readable name) */
export const SYMBOL_DISPLAY_MAP: Record<string, string> = {
  SM: "SM Investments Corporation",
  SMPH: "SM Prime Holdings, Inc.",
  AC: "Ayala Corporation",
  ALI: "Ayala Land, Inc.",
  BDO: "BDO Unibank, Inc.",
  BPI: "Bank of the Philippine Islands",
  MBT: "Metropolitan Bank & Trust Co.",
  ICT: "International Container Terminal Services",
  JFC: "Jollibee Foods Corporation",
  URC: "Universal Robina Corporation",
  AEV: "Aboitiz Equity Ventures, Inc.",
  MER: "Manila Electric Company",
  TEL: "PLDT Inc.",
  GLO: "Globe Telecom, Inc.",
  LTG: "LT Group, Inc.",
  MPI: "Metro Pacific Investments Corporation",
  AGI: "Alliance Global Group, Inc.",
  GTCAP: "GT Capital Holdings, Inc.",
  JGS: "JG Summit Holdings, Inc.",
  SECB: "Security Bank Corporation",
  CNPF: "Century Pacific Food, Inc.",
  EMI: "Emperador Inc.",
  WLCON: "Wilcon Depot, Inc.",
  MONDE: "Monde Nissin Corporation",
  PGOLD: "Puregold Price Club, Inc.",
  RRHI: "Robinsons Retail Holdings, Inc.",
  RLC: "Robinsons Land Corporation",
  DMC: "DMCI Holdings, Inc.",
  ACEN: "ACEN Corporation",
  BLOOM: "Bloomberry Resorts Corporation",
  AP: "Aboitiz Power Corporation",
  FGEN: "First Gen Corporation",
  MWIDE: "Megawide Construction Corporation",
  ANI: "Atlas Consolidated Mining and Development Corp.",
  CEB: "Cebu Air, Inc. (Cebu Pacific)",
  DD: "DoubleDragon Corporation",
  FLI: "Filinvest Land, Inc.",
  HLCM: "Holcim Philippines, Inc.",
  IMI: "Integrated Micro-Electronics, Inc.",
  MEG: "Megaworld Corporation",
  NIKL: "Nickel Asia Corporation",
  PCOR: "Petron Corporation",
  PXP: "PXP Energy Corporation",
  ROCK: "Rockwell Land Corporation",
  SCC: "Semirara Mining and Power Corporation",
  SSI: "SSI Group, Inc.",
  TFHI: "Turks Shawarma Franchise / Total Food Holdings, Inc.",
  VLL: "Vista Land & Lifescapes, Inc.",
  CHP: "Chelsea Logistics and Infrastructure Holdings Corp.",
};

/** Symbol API aliases (display symbol → API-safe symbol) */
export const SYMBOL_API_MAP: Record<string, string> = {};

export const PSEI_FIRST_BATCH = PSEI_SYMBOLS.slice(0, 10);

export function getUniverseSample(count: number): string[] {
  return PSEI_SYMBOLS.slice(0, count);
}

/** Return symbols in batches of the given size. */
export function* getUniverseBatches(batchSize: number): Generator<string[]> {
  for (let i = 0; i < PSEI_SYMBOLS.length; i += batchSize) {
    yield PSEI_SYMBOLS.slice(i, i + batchSize);
  }
}
