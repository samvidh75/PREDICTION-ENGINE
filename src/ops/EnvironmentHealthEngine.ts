export interface EnvCheck {
  variable: string;
  status: 'ok' | 'missing' | 'invalid';
  detail: string;
}

export interface EnvironmentHealth {
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'MISCONFIGURED';
  checks: EnvCheck[];
  missingRequired: string[];
}

export class EnvironmentHealthEngine {
  check(): EnvironmentHealth {
    const checks: EnvCheck[] = [];
    const missingRequired: string[] = [];

    const dbUrl = process.env.DATABASE_URL;
    const pgHost = process.env.PGHOST;
    if (dbUrl || pgHost) {
      checks.push({ variable: 'DATABASE_URL', status: 'ok', detail: dbUrl ? 'Configured' : `PGHOST=${pgHost}` });
    } else {
      checks.push({ variable: 'DATABASE_URL', status: 'missing', detail: 'Neither DATABASE_URL nor PGHOST set' });
      missingRequired.push('DATABASE_URL');
    }

    const indianapi = process.env.INDIANAPI_KEY;
    checks.push({
      variable: 'INDIANAPI_KEY',
      status: indianapi ? 'ok' : 'missing',
      detail: indianapi ? 'Configured' : 'Not set',
    });

    const yahoo = process.env.YAHOO_API_KEY || process.env.VITE_YAHOO_API_KEY;
    checks.push({
      variable: 'YAHOO_API_KEY',
      status: yahoo ? 'ok' : 'missing',
      detail: yahoo ? 'Configured' : 'Not set',
    });

    const port = process.env.PORT;
    if (port) {
      const p = parseInt(port);
      checks.push({
        variable: 'PORT',
        status: !isNaN(p) && p > 0 && p < 65536 ? 'ok' : 'invalid',
        detail: `Set to ${port}`,
      });
    } else {
      checks.push({ variable: 'PORT', status: 'missing', detail: 'Will use default (3000 or 5173)' });
    }

    const env = process.env.NODE_ENV;
    checks.push({
      variable: 'NODE_ENV',
      status: env ? 'ok' : 'missing',
      detail: env || 'Not set (defaults to development)',
    });

    const anyMissing = checks.some(c => c.status === 'missing');
    const anyInvalid = checks.some(c => c.status === 'invalid');

    return {
      status: anyMissing ? 'MISCONFIGURED' : anyInvalid ? 'DEGRADED' : 'ONLINE',
      checks,
      missingRequired,
    };
  }
}

let _instance: EnvironmentHealthEngine | null = null;
export function getEnvironmentHealthEngine(): EnvironmentHealthEngine {
  if (!_instance) _instance = new EnvironmentHealthEngine();
  return _instance;
}
export const environmentHealthEngine = new Proxy({} as EnvironmentHealthEngine, {
  get: (_, prop) => (getEnvironmentHealthEngine() as any)[prop],
});
