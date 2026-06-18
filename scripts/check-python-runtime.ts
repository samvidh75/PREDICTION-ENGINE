import { execSync } from 'child_process';

interface RuntimeReport {
  pythonVersion: string;
  pipVersion: string;
  packages: Record<string, string>;
  nodeVersion: string;
}

function run(): RuntimeReport {
  const report: RuntimeReport = {
    pythonVersion: 'not_found',
    pipVersion: 'not_found',
    packages: {},
    nodeVersion: process.version,
  };

  // Python version
  try {
    const pyOut = execSync('python3 --version 2>&1', { encoding: 'utf-8', timeout: 5000 }).trim();
    report.pythonVersion = pyOut.replace(/^Python\s+/i, '');
  } catch { report.pythonVersion = 'not_found'; }

  // pip version
  try {
    const pipOut = execSync('pip3 --version 2>&1', { encoding: 'utf-8', timeout: 5000 }).trim();
    report.pipVersion = pipOut.replace(/^pip\s+/, '').split(/\s+/)[0];
  } catch { report.pipVersion = 'not_found'; }

  // Package imports
  const packages: [string, string][] = [
    ['jugaad_data', 'import jugaad_data; print(getattr(jugaad_data, "__version__", "unknown"))'],
    ['nselib', 'import nselib; print(getattr(nselib, "__version__", "unknown"))'],
    ['nsepython', 'import nsepython; print(getattr(nsepython, "__version__", "unknown"))'],
    ['nsepythonserver', 'import nsepythonserver; print(getattr(nsepythonserver, "__version__", "unknown"))'],
  ];

  for (const [name, code] of packages) {
    try {
      const out = execSync(`python3 -c '${code}' 2>/dev/null`, { encoding: 'utf-8', timeout: 5000 }).trim();
      report.packages[name] = out;
    } catch { report.packages[name] = 'not_installed'; }
  }

  return report;
}

const report = run();
console.log(JSON.stringify(report, null, 2));

const ok = report.packages.jugaad_data !== 'not_installed'
  || report.packages.nselib !== 'not_installed'
  || report.packages.nsepython !== 'not_installed'
  || report.packages.nsepythonserver !== 'not_installed';

process.exit(ok ? 0 : 1);
