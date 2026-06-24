export const fPrice = (v: number | null): string =>
  v === null ? "—" : v <= 0 ? "—" : new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v).replace("₹", "₹ ");

export const fChange = (v: number | null): string =>
  v === null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

export const fPercent = (v: number | null): string =>
  v === null ? "—" : `${v.toFixed(1)}%`;

export const fRatio = (v: number | null): string =>
  v === null ? "—" : `${v.toFixed(1)}x`;

export const fNumber = (v: number | null): string =>
  v === null ? "—" : v.toFixed(1);

export const fMarketCap = (v: number | null): string => {
  if (v === null) return "—";
  if (v >= 1e12) return `₹${(v / 1e12).toFixed(1)}L Cr`;
  if (v >= 1e9) return `₹${(v / 1e9).toFixed(0)} Cr`;
  return `₹${(v / 1e7).toFixed(0)} Cr`;
};

export const fScore = (v: number | null): string =>
  v === null ? "—" : Math.round(v).toString();

export const fRelativeTime = (iso: string | null): string => {
  if (!iso) return "—";
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};
