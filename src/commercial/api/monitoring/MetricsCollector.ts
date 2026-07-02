import { dbAdapter } from '../../../db/DatabaseAdapter';

export class MetricsCollector {
  private static heartbeatTimer: NodeJS.Timeout | null = null;

  /**
   * Captures raw engine resource statistics and logs them directly to the production tables.
   */
  public static async recordSystemHeartbeat(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMb = parseFloat((memoryUsage.heapUsed / 1024 / 1024).toFixed(2));
    const rssMb = parseFloat((memoryUsage.rss / 1024 / 1024).toFixed(2));
    const activeUptime = Math.floor(process.uptime());

    try {
      // Direct pass-through insert to Neon PostgreSQL
      await dbAdapter.query(
        `INSERT INTO system_perf_logs (uptime_seconds, heap_used_mb, rss_mb)
         VALUES ($1, $2, $3)`,
        [activeUptime, heapUsedMb, rssMb]
      );
    } catch (err) {
      console.error("⚠️ Failed to record system performance heartbeats:", err);
    }
  }

  /**
   * Initializes the automated background telemetry loops.
   */
  public static startCollector() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      this.recordSystemHeartbeat().catch(console.error);
    }, 60000); // Sample performance metrics every 60 seconds
    console.log("📈 MetricsCollector telemetry system activated.");
  }

  public static stopCollector() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
