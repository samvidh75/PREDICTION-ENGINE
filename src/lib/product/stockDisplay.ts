export interface PriceContext {
  price: string;
  change: string | null;
  positive: boolean | null;
}

export function buildSinglePriceContext(price: string, change: string | null, positive: boolean | null): PriceContext {
  return { price, change, positive };
}

export interface ProductActionItem { id: "invest" | "track" | "compare" | "methodology" | "scanner"; primary: boolean }

export function buildSingleActionCluster(readiness: "ready" | "partial" | "limited", tracked: boolean): ProductActionItem[] {
  if (readiness === "ready") return [
    { id: "invest", primary: true },
    { id: "track", primary: false },
    { id: "compare", primary: false },
  ];
  if (readiness === "partial") return [
    { id: "track", primary: true },
    { id: "compare", primary: false },
    { id: "methodology", primary: false },
  ];
  const actions: ProductActionItem[] = [
    { id: "scanner", primary: true },
    { id: "track", primary: false },
    { id: "compare", primary: false },
  ];
  return actions.filter((item) => !(tracked && item.id === "track"));
}
