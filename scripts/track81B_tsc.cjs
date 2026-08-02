const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'reports', 'track-81B');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const beforePath = path.join(outDir, 'tsc-before.txt');

try {
  execSync('npx tsc --noEmit', { stdio: 'pipe', cwd: path.join(__dirname, '..'), encoding: 'utf8' });
  fs.writeFileSync(beforePath, '0 errors\n');
  console.log('TSC: 0 errors');
} catch (e) {
  const output = e.stdout || '' + '\n' + (e.stderr || '');
  fs.writeFileSync(beforePath, output);
  const lines = output.split('\n').filter(l => l.includes('error TS'));
  console.log('TSC errors:', lines.length);
  console.log(output.slice(0, 2000));
}
