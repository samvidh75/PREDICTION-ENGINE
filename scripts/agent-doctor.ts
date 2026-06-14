import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

type GateStatus = 'pass' | 'fail';

interface GateResult {
  name: string;
  command: string;
  status: GateStatus;
  exitCode: number | null;
  durationMs: number;
  outputTail: string;
}

const apply = process.argv.includes('--apply');
const applyAllowed = process.env.AGENT_DOCTOR_APPLY === 'true';

const gates = [
  ['lint', 'npm run lint'],
  ['typecheck', 'npm run typecheck:all'],
  ['provider-broker', 'npm run test:provider-broker'],
  ['unit', 'npm run test:unit'],
  ['schema', 'npm run validate:schema'],
  ['query-schema', 'npm run validate:query-schema'],
  ['data-integrity', 'npm run validate:data-integrity'],
  ['hygiene', 'npm run validate:hygiene'],
] as const;

function runGate(name: string, command: string): GateResult {
  const started = Date.now();
  const result = spawnSync(command, {
    shell: true,
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
  return {
    name,
    command,
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    durationMs: Date.now() - started,
    outputTail: output.slice(-8000),
  };
}

async function main(): Promise<void> {
  if (apply && !applyAllowed) {
    throw new Error('Apply mode requires AGENT_DOCTOR_APPLY=true');
  }

  const results: GateResult[] = [];
  for (const [name, command] of gates) {
    process.stdout.write(`agent:doctor ${name}... `);
    const result = runGate(name, command);
    results.push(result);
    console.log(result.status.toUpperCase());
  }

  let repair: GateResult | null = null;
  if (apply) {
    process.stdout.write('agent:doctor auto-repair... ');
    repair = runGate('auto-repair', 'npm run repair:auto:apply');
    console.log(repair.status.toUpperCase());
  }

  const failed = results.filter(r => r.status === 'fail');
  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'diagnose',
    ok: failed.length === 0 && (!repair || repair.status === 'pass'),
    failed: failed.map(r => r.name),
    gates: results,
    repair,
  };

  const reportDir = path.join(process.cwd(), 'reports', 'agent');
  fs.mkdirSync(reportDir, { recursive: true });
  const reportPath = path.join(reportDir, 'doctor-latest.json');
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

  console.log(`agent:doctor report: ${reportPath}`);
  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
