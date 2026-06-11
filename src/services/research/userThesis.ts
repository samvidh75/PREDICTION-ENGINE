export interface ThesisBreaker {
  id: string;
  condition: string;
  metricKey?: string;
  operator?: "lt" | "lte" | "gt" | "gte" | "eq";
  threshold?: number;
  active: boolean;
}

export interface UserThesis {
  symbol: string;
  thesis: string;
  createdAt: string;
  updatedAt: string;
  breakers: ThesisBreaker[];
  driftAlerts: string[];
}

const STORAGE_PREFIX = "ss_user_thesis_v1";

function key(symbol: string): string {
  return `${STORAGE_PREFIX}_${symbol.toUpperCase().trim()}`;
}

export function loadThesis(symbol: string): UserThesis {
  if (typeof window === "undefined") {
    return createEmptyThesis(symbol);
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key(symbol)) || "null") as UserThesis | null;
    return parsed?.symbol ? parsed : createEmptyThesis(symbol);
  } catch {
    return createEmptyThesis(symbol);
  }
}

export function saveThesis(next: UserThesis): UserThesis {
  const stamped = { ...next, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(key(next.symbol), JSON.stringify(stamped));
  }
  return stamped;
}

export function createEmptyThesis(symbol: string): UserThesis {
  const now = new Date().toISOString();
  return {
    symbol: symbol.toUpperCase().trim(),
    thesis: "",
    createdAt: now,
    updatedAt: now,
    breakers: [],
    driftAlerts: [],
  };
}

export function evaluateThesisDrift(
  thesis: UserThesis,
  metrics: Record<string, number | null | undefined>
): string[] {
  return thesis.breakers
    .filter((breaker) => breaker.active && breaker.metricKey && breaker.operator && typeof breaker.threshold === "number")
    .flatMap((breaker) => {
      const value = metrics[breaker.metricKey as string];
      if (typeof value !== "number" || !Number.isFinite(value)) return [];
      const triggered =
        breaker.operator === "lt" ? value < breaker.threshold! :
        breaker.operator === "lte" ? value <= breaker.threshold! :
        breaker.operator === "gt" ? value > breaker.threshold! :
        breaker.operator === "gte" ? value >= breaker.threshold! :
        value === breaker.threshold;
      return triggered ? [`${breaker.condition} triggered by ${breaker.metricKey}=${value}`] : [];
    });
}
