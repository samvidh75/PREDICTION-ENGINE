import { describe, it, expect } from 'vitest';
import { PmfMetricRegistry } from '../PmfMetricRegistry';

describe('Safety grep patterns', () => {
  it('pmf metric registry defines metrics', () => {
    const all = PmfMetricRegistry.getAll();
    expect(all.length).toBeGreaterThan(0);
    for (const m of all) {
      expect(m.key).toMatch(/^pmf\./);
      expect(m.label).toBeTruthy();
      expect(m.unit).toBeTruthy();
    }
  });

  it('no .only in test files', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const testDir = path.resolve(__dirname);
    const files = fs.readdirSync(testDir).filter((f: string) => f.endsWith('.test.ts'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
      // it.only and describe.only are red flags in committed tests
      expect(content).not.toMatch(/(it|describe)\.only\(/);
    }
  });

  it('no process.env references in tests (use fake/mock)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const testDir = path.resolve(__dirname);
    const files = fs.readdirSync(testDir).filter((f: string) => f.endsWith('.test.ts'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(testDir, file), 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        // Allow in pmf-launch-gate test which tests env configuration
        if (file === 'pmf-launch-gate.test.ts') continue;
        expect(lines[i]).not.toMatch(/process\.env\./);
      }
    }
  });
});
