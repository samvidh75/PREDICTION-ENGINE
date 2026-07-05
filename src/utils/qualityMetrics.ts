/**
 * Quality Metrics Tracking
 * Track routing effectiveness and response quality
 */

export interface QualityMetric {
  tier: string;
  totalQuestions: number;
  helpfulResponses: number;
  unhelpfulResponses: number;
  avgResponseTime: number;
  satisfactionRate: number;
}

class QualityMetrics {
  private metrics = new Map<string, {
    totalQuestions: number;
    helpful: number;
    unhelpful: number;
    responseTimes: number[];
  }>();

  /**
   * Record a question-response pair
   */
  recordQuestion(
    tier: string,
    responseTime: number,
    rating?: 'helpful' | 'not-helpful'
  ): void {
    if (!this.metrics.has(tier)) {
      this.metrics.set(tier, {
        totalQuestions: 0,
        helpful: 0,
        unhelpful: 0,
        responseTimes: [],
      });
    }

    const metric = this.metrics.get(tier)!;
    metric.totalQuestions++;
    metric.responseTimes.push(responseTime);

    if (rating === 'helpful') {
      metric.helpful++;
    } else if (rating === 'not-helpful') {
      metric.unhelpful++;
    }

    // Keep only last 1000 measurements to avoid memory buildup
    if (metric.responseTimes.length > 1000) {
      metric.responseTimes = metric.responseTimes.slice(-1000);
    }
  }

  /**
   * Get metrics for a specific tier
   */
  getMetrics(tier: string): QualityMetric | null {
    const metric = this.metrics.get(tier);
    if (!metric) return null;

    const rated = metric.helpful + metric.unhelpful;
    const satisfactionRate = rated > 0 ? (metric.helpful / rated) * 100 : 0;
    const avgResponseTime =
      metric.responseTimes.length > 0
        ? metric.responseTimes.reduce((a, b) => a + b, 0) / metric.responseTimes.length
        : 0;

    return {
      tier,
      totalQuestions: metric.totalQuestions,
      helpfulResponses: metric.helpful,
      unhelpfulResponses: metric.unhelpful,
      avgResponseTime: Math.round(avgResponseTime),
      satisfactionRate: Math.round(satisfactionRate * 100) / 100,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): QualityMetric[] {
    const allMetrics: QualityMetric[] = [];

    for (const tier of this.metrics.keys()) {
      const metric = this.getMetrics(tier);
      if (metric) {
        allMetrics.push(metric);
      }
    }

    return allMetrics;
  }

  /**
   * Get routing distribution
   */
  getRoutingDistribution(): { tier: string; percentage: number }[] {
    const allMetrics = this.getAllMetrics();
    const total = allMetrics.reduce((sum, m) => sum + m.totalQuestions, 0);

    return allMetrics.map((m) => ({
      tier: m.tier,
      percentage: total > 0 ? Math.round((m.totalQuestions / total) * 100 * 100) / 100 : 0,
    }));
  }

  /**
   * Export metrics as JSON
   */
  export(): {
    timestamp: string;
    metrics: QualityMetric[];
    routing: { tier: string; percentage: number }[];
  } {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.getAllMetrics(),
      routing: this.getRoutingDistribution(),
    };
  }
}

// Export singleton
export const qualityMetrics = new QualityMetrics();
