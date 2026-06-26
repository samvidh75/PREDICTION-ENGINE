type MetricName = "LCP" | "FID" | "CLS" | "INP" | "TTFB";

interface PerfMetric {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
}

type PerfCallback = (metric: PerfMetric) => void;

const thresholds: Record<MetricName, [number, number]> = {
  LCP:   [2500, 4000],
  FID:   [100, 300],
  CLS:   [0.1, 0.25],
  INP:   [200, 500],
  TTFB:  [800, 1800],
};

function getRating(name: MetricName, value: number): PerfMetric["rating"] {
  const [good, poor] = thresholds[name];
  if (value <= good) return "good";
  if (value <= poor) return "needs-improvement";
  return "poor";
}

const listeners = new Set<PerfCallback>();

export function onPerformanceMetric(cb: PerfCallback): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

function emit(metric: PerfMetric): void {
  for (const cb of listeners) cb(metric);
}

function initObserver(): void {
  if (typeof window === "undefined") return;

  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const name = entry.name as MetricName;
        if (!(name in thresholds)) continue;
        const value = (entry as any).value ?? entry.startTime;
        emit({ name, value, rating: getRating(name, value), timestamp: Date.now() });
      }
    }).observe({ type: "web-vital", buffered: true });

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) {
      emit({ name: "TTFB", value: nav.responseStart - nav.requestStart, rating: getRating("TTFB", nav.responseStart - nav.requestStart), timestamp: Date.now() });
    }
  } catch {
    // Web-vitals not supported in all browsers
  }
}

export function initPerformanceMonitoring(): void {
  initObserver();
}

export function measureRender(label: string): () => void {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    if (duration > 16) {
      emit({ name: "INP", value: duration, rating: getRating("INP", duration), timestamp: Date.now() });
    }
  };
}

export default { onPerformanceMetric, initPerformanceMonitoring, measureRender };
