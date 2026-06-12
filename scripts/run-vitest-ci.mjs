import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const vitestBin = resolve(process.cwd(), "node_modules", ".bin", "vitest");
const result = spawnSync(vitestBin, ["run", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  encoding: "utf8",
  env: process.env,
});

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const exitCode = result.status ?? 1;

if (exitCode === 0) {
  process.stdout.write(output);
} else {
  const lines = output.split(/\r?\n/);
  const failureTail = lines.slice(-180).join("\n");
  process.stderr.write(`${failureTail}\n`);
}

if (result.error) {
  process.stderr.write(`[run-vitest-ci] ${result.error.message}\n`);
}

process.exitCode = exitCode;
