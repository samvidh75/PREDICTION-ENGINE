export function normalizePredictionSymbol(rawSymbol: string): string {
  return rawSymbol
    .trim()
    .toUpperCase()
    .replace(/\.(NS|BO)$/u, "");
}

export function predictionSymbolWhereExpression(columnName = "symbol"): string {
  return `REPLACE(REPLACE(UPPER(${columnName}), '.NS', ''), '.BO', '')`;
}

