import React, { useState } from 'react';
import styles from './FinancialChart.module.css';

interface FinancialData {
  quarters: string[];
  revenue: number[];
  netProfit: number[];
  ebitda?: number[];
}

type MetricType = 'revenue' | 'netProfit' | 'ebitda';
type FrequencyType = 'quarterly' | 'yearly';

export function FinancialChart({ data }: { data: FinancialData }) {
  const [metric, setMetric] = useState<MetricType>('revenue');
  const [frequency, setFrequency] = useState<FrequencyType>('quarterly');

  if (!data) return null;

  const getChartData = () => {
    switch (metric) {
      case 'revenue':
        return data.revenue;
      case 'netProfit':
        return data.netProfit;
      case 'ebitda':
        return data.ebitda || [];
      default:
        return data.revenue;
    }
  };

  const chartData = getChartData();
  const maxValue = Math.max(...chartData);
  const minValue = Math.min(...chartData);
  const range = maxValue - minValue || 1;

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Financials</h3>
        <span className={styles.info}>ℹ️</span>
      </div>

      {/* METRIC TABS */}
      <div className={styles.tabsMetric}>
        {['Revenue', 'Net profit', 'EBITDA'].map((tab, idx) => {
          const key = ['revenue', 'netProfit', 'ebitda'][idx] as MetricType;
          return (
            <button
              key={key}
              onClick={() => setMetric(key)}
              className={`${styles.tab} ${metric === key ? styles.active : ''}`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* CHART */}
      <div className={styles.chartContainer}>
        <div className={styles.chart}>
          {data.quarters.map((quarter, idx) => {
            const value = chartData[idx];
            const height = ((value - minValue) / range) * 100;
            return (
              <div key={quarter} className={styles.bar_wrapper}>
                <div className={styles.value_label}>₹{value.toLocaleString()}</div>
                <div className={styles.bar} style={{ height: `${height}%` }} />
                <div className={styles.quarter_label}>{quarter}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FREQUENCY TABS */}
      <div className={styles.tabsFrequency}>
        <button
          onClick={() => setFrequency('quarterly')}
          className={`${styles.tab} ${frequency === 'quarterly' ? styles.active : ''}`}
        >
          Quarterly
        </button>
        <button
          onClick={() => setFrequency('yearly')}
          className={`${styles.tab} ${frequency === 'yearly' ? styles.active : ''}`}
        >
          Yearly
        </button>
      </div>

      <p className={styles.note}>all values are in ₹ Cr</p>
    </section>
  );
}