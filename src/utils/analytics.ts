export interface QueryMetric {
  method: 'regex' | 'transformers' | 'groq' | 'error';
  duration: number;
  timestamp: Date;
  query: string;
  success: boolean;
}

const metrics: QueryMetric[] = [];
const MAX_LOCAL_METRICS = 1000;

export function trackQueryMetrics(
  method: 'regex' | 'transformers' | 'groq' | 'error',
  duration: number,
  query: string,
  success: boolean = true
) {
  const metric: QueryMetric = {
    method,
    duration,
    timestamp: new Date(),
    query,
    success,
  };

  metrics.push(metric);
  if (metrics.length > MAX_LOCAL_METRICS) {
    metrics.shift();
  }
}

export function getAggregatedMetrics() {
  const regexMetrics = metrics.filter((m) => m.method === 'regex');
  const transformersMetrics = metrics.filter((m) => m.method === 'transformers');
  const groqMetrics = metrics.filter((m) => m.method === 'groq');

  const avgDuration = (arr: QueryMetric[]) =>
    arr.length === 0 ? 0 : arr.reduce((acc, m) => acc + m.duration, 0) / arr.length;

  return {
    totalQueries: metrics.length,
    successRate: metrics.length === 0 ? 0 : (metrics.filter((m) => m.success).length / metrics.length) * 100,
    methods: {
      regex: {
        count: regexMetrics.length,
        avgDuration: avgDuration(regexMetrics),
        percentage: metrics.length === 0 ? 0 : (regexMetrics.length / metrics.length) * 100,
      },
      transformers: {
        count: transformersMetrics.length,
        avgDuration: avgDuration(transformersMetrics),
        percentage: metrics.length === 0 ? 0 : (transformersMetrics.length / metrics.length) * 100,
      },
      groq: {
        count: groqMetrics.length,
        avgDuration: avgDuration(groqMetrics),
        percentage: metrics.length === 0 ? 0 : (groqMetrics.length / metrics.length) * 100,
      },
    },
    lastQueries: metrics.slice(-10),
  };
}

export function exportMetricsAsJSON() {
  return JSON.stringify(getAggregatedMetrics(), null, 2);
}

export function persistMetricsToLocalStorage() {
  try {
    const aggregated = getAggregatedMetrics();
    localStorage.setItem('stockstory_metrics', JSON.stringify(aggregated));
  } catch (e) {
    // handle silently in production
  }
}

export function retrievePersistedMetrics() {
  try {
    const data = localStorage.getItem('stockstory_metrics');
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearMetrics() {
  metrics.length = 0;
  localStorage.removeItem('stockstory_metrics');
}
