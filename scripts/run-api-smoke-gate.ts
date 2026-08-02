import { spawnSync } from 'node:child_process';

function run(command: string, args: string[], env: NodeJS.ProcessEnv = process.env): void {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });
  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

const fullGate = process.env.REQUIRE_FULL_RELEASE_GATE === 'true';

if (fullGate) {
  run('npm', ['run', 'migrate']);
}

run('npm', ['run', 'seed:ci'], {
  ...process.env,
  CI_FIXTURE_SEED: 'true',
});

run('npm', ['run', 'smoke:api']);
