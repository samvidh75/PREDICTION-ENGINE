/**
 * IntelligenceLogger
 *
 * Structured logger for intelligence engine operations.
 * Masks credentials, truncates long values, and supports
 * stdout (CLI) and JSON (machine parsing) output modes.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: Record<string, unknown>;
}

export class IntelligenceLogger {
  private module: string;
  private jsonMode: boolean;

  constructor(module: string, jsonMode = false) {
    this.module = module;
    this.jsonMode = jsonMode;
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log('error', message, data);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      message,
      data: data ? this.scrub(data) : undefined,
    };

    if (this.jsonMode) {
      process.stdout.write(JSON.stringify(entry) + '\n');
    } else {
      const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}] [${level.toUpperCase().padEnd(5)}] [${this.module}]`;

      if (data && Object.keys(data).length > 0) {
        const sanitized = this.scrub(data);
        for (const [k, v] of Object.entries(sanitized)) {
          const display = typeof v === 'string' && v.length > 150 ? v.slice(0, 150) + '...' : v;
        }
      }
    }
  }

  /**
   * Remove/mask sensitive fields before logging.
   */
  private scrub(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'secret', 'token', 'apiKey', 'api_key', 'authorization', 'key', 'apikey'];
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (sensitiveKeys.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        result[key] = '***';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.scrub(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
