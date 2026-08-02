/**
 * Tests: researchAiRuntimeRegistry — runtime capability detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initRuntimeRegistry,
  getRuntimeRegistry,
  getFallbackOrder,
  isRuntimeAvailable,
  getBestAvailableRuntime,
  hasAIRuntime,
  enableServerLocalRuntime,
} from './researchAiRuntimeRegistry';

beforeEach(() => {
  // Re-init to restore defaults before each test
  initRuntimeRegistry();
});

/* ── initRuntimeRegistry ─────────────────────────────────────── */

describe('initRuntimeRegistry', () => {
  it('deterministic is always available and ready', () => {
    const reg = getRuntimeRegistry();
    expect(reg.deterministic.available).toBe(true);
    expect(reg.deterministic.ready).toBe(true);
    expect(reg.deterministic.label).toBe('Algorithmic assessment');
  });

  it('browser-edge starts unavailable', () => {
    expect(getRuntimeRegistry()['browser-edge'].available).toBe(false);
  });

  it('user-local starts unavailable', () => {
    expect(getRuntimeRegistry()['user-local'].available).toBe(false);
  });

  it('does not throw when called multiple times', () => {
    expect(() => {
      initRuntimeRegistry();
      initRuntimeRegistry();
    }).not.toThrow();
  });
});

/* ── getRuntimeRegistry ──────────────────────────────────────── */

describe('getRuntimeRegistry', () => {
  it('returns a snapshot (immutable copy) of all 5 runtimes', () => {
    const reg = getRuntimeRegistry();
    expect(Object.keys(reg).sort()).toEqual([
      'browser-edge',
      'browser_local',
      'deterministic',
      'server-local',
      'user-local',
    ]);
  });

  it('mutating the returned object does not mutate internal state', () => {
    const reg = getRuntimeRegistry();
    reg.deterministic.available = false;
    expect(isRuntimeAvailable('deterministic')).toBe(true);
  });
});

/* ── getFallbackOrder ────────────────────────────────────────── */

describe('getFallbackOrder', () => {
  it('returns all 5 runtimes in correct fallback order', () => {
    expect(getFallbackOrder()).toEqual([
      'browser-edge',
      'browser_local',
      'user-local',
      'server-local',
      'deterministic',
    ]);
  });
});

/* ── isRuntimeAvailable ──────────────────────────────────────── */

describe('isRuntimeAvailable', () => {
  it('returns true for deterministic', () => {
    expect(isRuntimeAvailable('deterministic')).toBe(true);
  });

  it('returns false for uninitialised browser-edge', () => {
    expect(isRuntimeAvailable('browser-edge')).toBe(false);
  });

  it('returns true for server-local after enableServerLocalRuntime', () => {
    enableServerLocalRuntime();
    expect(isRuntimeAvailable('server-local')).toBe(true);
  });
});

/* ── getBestAvailableRuntime ─────────────────────────────────── */

describe('getBestAvailableRuntime', () => {
  it('returns deterministic when no AI runtime is available', () => {
    expect(getBestAvailableRuntime()).toBe('deterministic');
  });

  it('returns server-local when enabled', () => {
    enableServerLocalRuntime();
    expect(getBestAvailableRuntime()).toBe('server-local');
  });
});

/* ── hasAIRuntime ────────────────────────────────────────────── */

describe('hasAIRuntime', () => {
  it('returns false when no AI runtimes are available', () => {
    expect(hasAIRuntime()).toBe(false);
  });

  it('returns true after enabling server-local', () => {
    enableServerLocalRuntime();
    expect(hasAIRuntime()).toBe(true);
  });
});

/* ── enableServerLocalRuntime ────────────────────────────────── */

describe('enableServerLocalRuntime', () => {
  it('marks server-local as available and ready', () => {
    enableServerLocalRuntime();
    const reg = getRuntimeRegistry();
    expect(reg['server-local'].available).toBe(true);
    expect(reg['server-local'].ready).toBe(true);
  });
});
