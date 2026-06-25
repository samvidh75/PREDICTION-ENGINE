export const fINR = (v: number | null, decimals = 2): string => {
  if (v === null || v <= 0) return '—'
  return '₹\u2009' + v.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export const fChange = (v: number | null): string =>
  v === null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`

export const fPercent = (v: number | null): string =>
  v === null ? '—' : `${v.toFixed(1)}%`

export const fPrice = fINR

export const fRatio = (v: number | null): string =>
  v === null ? '—' : `${v.toFixed(1)}x`

export const fNumber = (v: number | null): string =>
  v === null ? '—' : v.toFixed(1)

export const fMarketCap = (v: number | null): string => {
  if (v === null) return '—'
  if (v >= 100_000) return `₹${(v / 100_000).toFixed(1)}L Cr`
  if (v >= 1_000)   return `₹${(v / 1_000).toFixed(1)}K Cr`
  return `₹${v.toFixed(0)} Cr`
}

export const fScore = (v: number | null): string =>
  v === null ? '—' : Math.round(v).toString()

export const fRelativeTime = (iso: string | null): string => {
  if (!iso) return '—'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
