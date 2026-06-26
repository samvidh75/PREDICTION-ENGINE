import React from 'react';
import styles from './UpgradeBanner.module.css';

export function UpgradeBanner() {
  return (
    <div className={styles.banner}>
      <div className={styles.icon}>ℹ️</div>
      <div className={styles.content}>
        <p className={styles.text}>
          Connect your broker to see live updates
        </p>
      </div>
      <button className={styles.button}>
        →
      </button>
    </div>
  );
}