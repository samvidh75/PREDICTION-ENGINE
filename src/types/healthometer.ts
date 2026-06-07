export type HealthStatus = 'very-healthy' | 'healthy' | 'stable' | 'weakening' | 'unhealthy';

export interface HealthMetric {
  id: string;
  label: string;
  value: number; // Normalized 0-100
  weight: number; // Contribution to total score
  trend: 'improving' | 'declining' | 'neutral';
}

export interface HealthometerScore {
  total: number;
  status: HealthStatus;
  lastUpdated: string;
  metrics: HealthMetric[];
}
