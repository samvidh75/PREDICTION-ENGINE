function formatCompactRupees(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e12) {
    const lakhC = value / 1e12;
    return `₹${lakhC.toFixed(2)} lakh crore`;
  }
  if (abs >= 1e7) {
    const crore = value / 1e7;
    return `₹${crore.toFixed(2)} crore`;
  }
  if (abs >= 1e5) {
    const lakh = value / 1e5;
    return `₹${lakh.toFixed(2)} lakh`;
  }
  return `₹${Math.round(value).toLocaleString(undefined)}`;
}

function formatINRWithCommas(value: number): string {
  const isNeg = value < 0;
  const abs = Math.abs(Math.round(value));
  const s = abs.toString();
  if (s.length <= 3) return `${isNeg ? "-" : ""}₹${s}`;

  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);

  // Indian grouping: 12,34,56,789 => rest groups from right with 2 digits
  const restReversed = rest.split("").reverse();
  const groups: string[] = [];
  let i = 0;

  while (i < restReversed.length) {
    const take = i === 0 ? 3 : 2;
    const part = restReversed.slice(i, i + take).reverse().join("");
    groups.unshift(part);
    i += take;
  }

  return `${isNeg ? "-" : ""}₹${groups.join(",")},${last3}`;
}

export function formatMarketCap(value: number): { exact: string; words: string } {
  return {
    exact: formatINRWithCommas(value),
    words: formatCompactRupees(value),
  };
}

export function formatPE(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value >= 100) return value.toFixed(0);
  if (value >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatDebtRatio(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${(value * 100).toFixed(1)}%`;
}

export function hashStringToSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function deriveDeterministicFinance(ticker: string, healthSeed: number): { marketCap: number; pe: number; industryPe: number; fiveYearPeAvg: number } {
  const seed = hashStringToSeed(`${ticker}_${healthSeed}_valuation`);
  const v1 = (seed % 997) / 997; // 0..1
  const v2 = ((seed * 3) % 991) / 991;
  const v3 = ((seed * 7) % 983) / 983;

  // Market cap: 25k crore .. 18 lakh crore (range for readability)
  const marketCap = Math.round((2.5e11 + v1 * 1.55e13) * (0.92 + v2 * 0.18));

  const pe = 9 + v2 * 28; // 9..37
  const industryPe = 10 + v3 * 30; // 10..40
  const fiveYearPeAvg = 11 + v1 * 26; // 11..37

  return {
    marketCap,
    pe,
    industryPe,
    fiveYearPeAvg,
  };
}
