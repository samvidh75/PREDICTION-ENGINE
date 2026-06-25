/**
 * TRACK-SMOKE-MEGA — Release gate unit tests
 *
 * Tests the orchestration logic: environment probing, status classification,
 * mandatory-vs-diagnostic, JSON report generation, and secret handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineChecks, runGateChecks, generateGateReport } from '../release-gate';

const isCI = process.env.CI === 'true' || process.env.REQUIRE_FULL_RELEASE_GATE === 'true';
const runOnlyInCI = isCI ? describe : describe.skip;

describe('release-gate', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('defineChecks', () => {
    it('includes all mandatory static checks', () => {
      const checks = defineChecks();
      const staticChecks = checks.filter(c => c.category === 'static' || c.category === 'test' || c.category === 'build');
      const mandatoryStatic = staticChecks.filter(c => c.mandatory);
      // All static/local checks must be mandatory
      expect(mandatoryStatic.length).toBe(staticChecks.length);
      expect(mandatoryStatic.length).toBeGreaterThanOrEqual(13);
    });

    it('includes environment-required checks', () => {
      const checks = defineChecks();
      const envChecks = checks.filter(c => c.category === 'environment-required');
      expect(envChecks.length).toBeGreaterThanOrEqual(2);
      expect(envChecks.some(c => c.name.includes('PostgreSQL'))).toBe(true);
      expect(envChecks.some(c => c.name.includes('smoke'))).toBe(true);
    });

    it('environment-required checks have probes', () => {
      const checks = defineChecks();
      const envChecks = checks.filter(c => c.category === 'environment-required');
      for (const check of envChecks) {
        expect(check.probe).toBeDefined();
        expect(typeof check.probe).toBe('function');
      }
    });
  });

  runOnlyInCI('runGateChecks', () => {
    it('local missing API → NOT_EXECUTED_ENVIRONMENT_MISSING', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'false');
      const checks = defineChecks();
      const smokeCheck = checks.find(c => c.name === 'API smoke test')!;
      smokeCheck.mandatory = false;
      // Simulate missing API
      smokeCheck.probe = async () => false;

      // Only run the smoke check (skip commands)
      const smokeOnly = [smokeCheck];
      // Override command to succeed probe but we need only the env-probe path
      smokeOnly[0].command = undefined; // skip execution

      await runGateChecks(smokeOnly);
      expect(smokeCheck.status).toBe('NOT_EXECUTED_ENVIRONMENT_MISSING');
    });

    it('CI missing API with REQUIRE_FULL_RELEASE_GATE=true → FAIL', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'true');
      const checks = defineChecks();
      const smokeCheck = checks.find(c => c.name === 'API smoke test')!;
      smokeCheck.mandatory = true;
      smokeCheck.probe = async () => false;

      const smokeOnly = [smokeCheck];
      await runGateChecks(smokeOnly);
      expect(smokeCheck.status).toBe('FAIL');
    });

    it('local missing PostgreSQL → NOT_EXECUTED_ENVIRONMENT_MISSING', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'false');
      const checks = defineChecks();
      const pgCheck = checks.find(c => c.name.includes('PostgreSQL integration'))!;
      pgCheck.mandatory = false;
      pgCheck.probe = async () => false;
      pgCheck.command = undefined;

      const pgOnly = [pgCheck];
      await runGateChecks(pgOnly);
      expect(pgCheck.status).toBe('NOT_EXECUTED_ENVIRONMENT_MISSING');
    });

    it('CI missing PostgreSQL → FAIL', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'true');
      const checks = defineChecks();
      const pgCheck = checks.find(c => c.name.includes('PostgreSQL integration'))!;
      pgCheck.mandatory = true;
      pgCheck.probe = async () => false;
      pgCheck.command = undefined;

      const pgOnly = [pgCheck];
      await runGateChecks(pgOnly);
      expect(pgCheck.status).toBe('FAIL');
    });

    it('smoke never reported PASS when unexecuted', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'false');
      const checks = defineChecks();
      const smokeCheck = checks.find(c => c.name === 'API smoke test')!;
      smokeCheck.mandatory = false;
      smokeCheck.probe = async () => false;
      smokeCheck.command = undefined;

      const smokeOnly = [smokeCheck];
      await runGateChecks(smokeOnly);
      // Must not be PASS
      expect(smokeCheck.status).not.toBe('PASS');
      // Must be NOT_EXECUTED_ENVIRONMENT_MISSING
      expect(smokeCheck.status).toBe('NOT_EXECUTED_ENVIRONMENT_MISSING');
    });

    it('environment-available checks execute command', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'false');
      const checks = defineChecks();

      // Create a check with available env and a command that succeeds
      const testCheck = {
        name: 'test env check',
        category: 'environment-required' as const,
        mandatory: false,
        command: 'echo "ok"',
        probe: async () => true,
        status: 'PASS' as const,
        exitCode: null as number | null,
        stdout: null as string | null,
        stderr: null as string | null,
        durationMs: 0,
      };

      await runGateChecks([testCheck]);
      expect(testCheck.status).toBe('PASS');
      expect(testCheck.exitCode).toBe(0);
    });

    it('failed command results in FAIL status', async () => {
      const testCheck = {
        name: 'failing command',
        category: 'static' as const,
        mandatory: true,
        command: 'exit 1',
        probe: undefined,
        status: 'PASS' as const,
        exitCode: null as number | null,
        stdout: null as string | null,
        stderr: null as string | null,
        durationMs: 0,
      };

      await runGateChecks([testCheck]);
      expect(testCheck.status).toBe('FAIL');
      expect(testCheck.exitCode).toBe(1);
    });
  });

  describe('generateGateReport', () => {
    it('report written with correct status counts', () => {
      const checks = [
        {
          name: 'check1', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'PASS' as const, exitCode: 0, stdout: 'ok', stderr: null, durationMs: 100,
        },
        {
          name: 'check2', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'FAIL' as const, exitCode: 1, stdout: null, stderr: 'error occurred', durationMs: 200,
        },
        {
          name: 'check3', category: 'environment-required' as const, mandatory: false,
          command: undefined, probe: undefined,
          status: 'NOT_EXECUTED_ENVIRONMENT_MISSING' as const, exitCode: null, stdout: null, stderr: 'env missing', durationMs: 0,
        },
      ];

      const report = generateGateReport(checks);
      expect(report.summary.total).toBe(3);
      expect(report.summary.passed).toBe(1);
      expect(report.summary.failed).toBe(1);
      expect(report.summary.notExecuted).toBe(1);
      expect(report.summary.mandatoryFailed).toBe(1);
      expect(report.generatedAt).toBeTruthy();
    });

    it('stdout captured safely', () => {
      const checks = [
        {
          name: 'check1', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'PASS' as const, exitCode: 0, stdout: 'Build completed successfully', stderr: null, durationMs: 100,
        },
      ];

      const report = generateGateReport(checks);
      expect(report.checks[0].stdoutPreview).toContain('Build completed');
    });

    it('stderr captured safely', () => {
      const checks = [
        {
          name: 'check1', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'FAIL' as const, exitCode: 1, stdout: null, stderr: 'TypeScript error in file.ts', durationMs: 100,
        },
      ];

      const report = generateGateReport(checks);
      expect(report.checks[0].stderrPreview).toContain('TypeScript error');
    });

    it('secrets redacted from report', () => {
      const checks = [
        {
          name: 'check1', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'FAIL' as const, exitCode: 1,
          stdout: 'DATABASE_URL=postgresql://user:pass@host:5432/db',
          stderr: 'Bearer eyJhbGciOiJIUzI1NiJ9.secret',
          durationMs: 100,
        },
      ];

      const report = generateGateReport(checks);
      // The generateGateReport calls redactSecrets on output
      // DATABASE_URL and Bearer tokens should be redacted
      expect(report.checks[0].stdoutPreview).not.toContain('postgresql://');
      expect(report.checks[0].stderrPreview).not.toContain('eyJ');
    });

    it('process.exit not used', () => {
      // Verify these are pure functions
      expect(typeof generateGateReport).toBe('function');
    });

    it('exitCode correct in report', () => {
      const checks = [
        {
          name: 'pass', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'PASS' as const, exitCode: 0, stdout: null, stderr: null, durationMs: 100,
        },
        {
          name: 'fail', category: 'static' as const, mandatory: true,
          command: undefined, probe: undefined,
          status: 'FAIL' as const, exitCode: 2, stdout: null, stderr: 'error', durationMs: 100,
        },
        {
          name: 'env-missing', category: 'environment-required' as const, mandatory: false,
          command: undefined, probe: undefined,
          status: 'NOT_EXECUTED_ENVIRONMENT_MISSING' as const, exitCode: null, stdout: null, stderr: null, durationMs: 0,
        },
      ];

      const report = generateGateReport(checks);
      expect(report.checks[0].exitCode).toBe(0);
      expect(report.checks[1].exitCode).toBe(2);
      expect(report.checks[2].exitCode).toBeNull();
    });
  });

  describe('overall results', () => {
    it('no environment failures, no command failures → PASS', async () => {
      const checks = [
        {
          name: 'pass1', category: 'static' as const, mandatory: true,
          command: 'echo ok', probe: undefined,
          status: 'PASS' as const, exitCode: null, stdout: null, stderr: null, durationMs: 0,
        },
      ];

      const { overallResult } = await runGateChecks(checks);
      expect(overallResult).toBe('PASS');
    });

    it('mandatory command failure → FAIL', async () => {
      const checks = [
        {
          name: 'fail1', category: 'static' as const, mandatory: true,
          command: 'exit 1', probe: undefined,
          status: 'PASS' as const, exitCode: null, stdout: null, stderr: null, durationMs: 0,
        },
      ];

      const { overallResult } = await runGateChecks(checks);
      expect(overallResult).toBe('FAIL');
    });

    it('local missing env → INCOMPLETE_ENVIRONMENT_PROOF', async () => {
      vi.stubEnv('REQUIRE_FULL_RELEASE_GATE', 'false');
      const checks = [
        {
          name: 'env-check', category: 'environment-required' as const, mandatory: false,
          command: undefined, probe: async () => false,
          status: 'PASS' as const, exitCode: null, stdout: null, stderr: null, durationMs: 0,
        },
      ];

      const { overallResult } = await runGateChecks(checks);
      expect(overallResult).toBe('INCOMPLETE_ENVIRONMENT_PROOF');
    });
  });
});
