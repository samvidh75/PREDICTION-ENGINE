import React from 'react';
import styles from './ShareholdingChart.module.css';

interface ShareholdingData {
  promoter: number;
  fii: number;
  dii: number;
  retails: number;
  qoqChange?: {
    promoter: number;
    fii: number;
    dii: number;
    retails: number;
  };
}

export function ShareholdingChart({ data }: { data: ShareholdingData }) {
  if (!data) return null;

  const shareholdings = [
    { label: 'Promoter', value: data.promoter, color: '#6366F1', change: data.qoqChange?.promoter },
    { label: 'FII', value: data.fii, color: '#8B5CF6', change: data.qoqChange?.fii },
    { label: 'DII', value: data.dii, color: '#EC4899', change: data.qoqChange?.dii },
    { label: 'Retails & Others', value: data.retails, color: '#F3F4F6', change: data.qoqChange?.retails },
  ];

  return (
    <section className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Shareholdings</h3>
        <span className={styles.info}>ℹ️</span>
      </div>

      <div className={styles.list}>
        {shareholdings.map((item) => (
          <div key={item.label} className={styles.item}>
            <div className={styles.labelRow}>
              <span className={styles.label}>{item.label}</span>
              <span className={styles.stats}>
                {item.change !== undefined && (
                  <span className={item.change >= 0 ? styles.positive : styles.negative}>
                    {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change).toFixed(2)}%
                  </span>
                )}
                <span className={styles.value}>{item.value.toFixed(2)}%</span>
              </span>
            </div>
            <div className={styles.barContainer}>
              <div
                className={styles.bar}
                style={{
                  width: `${item.value}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}