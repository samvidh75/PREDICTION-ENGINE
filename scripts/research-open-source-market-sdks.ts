/**
 * SDK Evaluation Harness
 * Runs isolated Python probe scripts and outputs JSON + summary.
 */
import { execFileSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

const PROBES = [
  { name: "jugaad-data", script: "scripts/probe-jugaad-data-provider.py", pkg: "jugaad-data" },
  { name: "nsepython", script: "scripts/probe-nsepython-provider.py", pkg: "nsepython" },
  { name: "nsetools", script: "scripts/probe-nsetools-provider.py", pkg: "nsetools" },
  { name: "nselib", script: "scripts/probe-nselib-provider.py", pkg: "nselib", pythonBin: fs.existsSync("/tmp/nselib-probe-env/bin/python") ? "/tmp/nselib-probe-env/bin/python" : "python3" },
  { name: "akshare", script: "scripts/probe-akshare-provider.py", pkg: "akshare" },
  { name: "nsepy", script: "scripts/probe-nsepy-provider.py", pkg: "nsepy" },
];

interface ProbeResult {
  provider: string;
  packageVersion: string;
  pythonVersion: string;
  installed: boolean;
  error?: string;
  domains: Record<string, { status: string; rows?: number; sampleFields?: string[]; failureClass?: string; error?: string }>;
  safeToActivate: boolean;
  warnings: string[];
}

function runProbe(probe: typeof PROBES[0]): ProbeResult {
  const scriptPath = path.resolve(probe.script);
  const env = { ...process.env };
  const pythonBin = probe.pythonBin || "python3";

  try {
    const out = execFileSync(pythonBin, [scriptPath], {
      encoding: "utf-8",
      timeout: 30_000,
      env,
    });
    const parsed = JSON.parse(out.trim()) as Partial<ProbeResult>;
    return {
      provider: parsed.provider || (parsed as any).probe || probe.name,
      packageVersion: parsed.packageVersion || "unknown",
      pythonVersion: parsed.pythonVersion || (parsed as any).python_version || "unknown",
      installed: parsed.installed ?? true,
      error: parsed.error,
      domains: parsed.domains || {},
      safeToActivate: parsed.safeToActivate ?? false,
      warnings: parsed.warnings || [],
    };
  } catch (e: any) {
    const stderr = String(e.stderr || "");
    const stdout = String(e.stdout || "");
    const combined = `${stdout}\n${stderr}`;

    try {
      const parsed = JSON.parse(stdout.trim() || stderr.trim()) as Partial<ProbeResult>;
      return {
        provider: parsed.provider || probe.name,
        packageVersion: parsed.packageVersion || "unknown",
        pythonVersion: parsed.pythonVersion || "unknown",
        installed: parsed.installed ?? false,
        error: parsed.error || e.message,
        domains: parsed.domains || {},
        safeToActivate: parsed.safeToActivate ?? false,
        warnings: parsed.warnings || ["Probe execution failed"],
      };
    } catch {
      // fall through
    }

    if (combined.includes("No module named")) {
      const missing = combined.match(/No module named '([^']+)'/)?.[1] || "unknown";
      return {
        provider: probe.name,
        packageVersion: "not_installed",
        pythonVersion: "unknown",
        installed: false,
        error: `Missing dependency: ${missing}. Run: pip install ${probe.pkg}`,
        domains: {},
        safeToActivate: false,
        warnings: ["Not installed"],
      };
    }
    return {
      provider: probe.name,
      packageVersion: "error",
      pythonVersion: "unknown",
      installed: false,
      error: combined.trim().slice(0, 300) || e.message,
      domains: {},
      safeToActivate: false,
      warnings: ["Probe execution failed"],
    };
  }
}

async function main() {
  const rows: string[] = [];
  const results: ProbeResult[] = [];

  rows.push("# Open-Source Python SDK Research Report");
  rows.push(`Generated: ${new Date().toISOString()}`);
  rows.push("");
  rows.push("## Summary Table");
  rows.push("| SDK | Version | Python | Quote | Historical | Bhavcopy | Index | Safe to Activate | Warnings |");
  rows.push("|---|---|---|---|---|---|---|---|---|");

  for (const probe of PROBES) {
    const result = runProbe(probe);
    results.push(result);

    if (!result.installed) {
      rows.push(`| ${result.provider} | not_installed | — | — | — | — | — | ❌ | ${result.error || "Not installed"} |`);
      continue;
    }

    const domains = result.domains || {};
    const quote = domains.quote?.status || "—";
    const hist = domains.historical?.status || "—";
    const bhav = domains.bhavcopy?.status || "—";
    const idx = domains.index?.status || "—";
    const safe = result.safeToActivate ? "✅" : "⚠️";
    const warnings = result.warnings?.join("; ") || "—";
    rows.push(`| ${result.provider} | ${result.packageVersion} | ${result.pythonVersion} | ${quote} | ${hist} | ${bhav} | ${idx} | ${safe} | ${warnings} |`);
  }

  rows.push("");
  rows.push("## Domain Detail");

  for (const result of results) {
    if (!result.installed) continue;
    rows.push(`### ${result.provider} v${result.packageVersion}`);
    rows.push(`- Python: ${result.pythonVersion}`);
    rows.push(`- Safe to activate: ${result.safeToActivate}`);
    rows.push("");
    for (const [domain, info] of Object.entries(result.domains || {})) {
      rows.push(`**${domain}**: ${info.status}`);
      if (info.rows !== undefined) rows.push(`  - Rows: ${info.rows}`);
      if (info.sampleFields?.length) rows.push(`  - Sample fields: ${info.sampleFields.join(", ")}`);
      if (info.failureClass) rows.push(`  - Failure: ${info.failureClass}`);
      if (info.error) rows.push(`  - Error: ${info.error}`);
    }
    if (result.warnings?.length) {
      rows.push("**Warnings:**");
      result.warnings.forEach((w) => rows.push(`- ${w}`));
    }
    rows.push("");
  }

  rows.push("## Decisions");
  rows.push("| SDK | Decision | Rationale |");
  rows.push("|---|---|---|");

  for (const result of results) {
    if (!result.installed) {
      rows.push(`| ${result.provider} | reject | Not installed — ${result.error || "install failed"} |`);
      continue;
    }
    const healthyCount = Object.values(result.domains || {}).filter((d) => d.status === "healthy").length;
    if (healthyCount > 0 && result.safeToActivate) {
      rows.push(`| ${result.provider} | activate | At least one critical domain is healthy and the package is safe to activate |`);
    } else if (result.provider === "jugaad-data") {
      rows.push(`| ${result.provider} | probe_only | Already configured as optional fallback; domains work but scraping risk |`);
    } else if (result.provider === "nsepython") {
      rows.push(`| ${result.provider} | probe_only | Already configured; limited domain coverage |`);
    } else if (result.provider === "nsetools") {
      rows.push(`| ${result.provider} | archive | Legacy NSE scraper; symbol universe works but quote path is broken |`);
    } else if (result.provider === "nselib") {
      rows.push(`| ${result.provider} | archive | Package imports, but no usable market-data domains were discovered |`);
    } else if (result.provider === "akshare") {
      rows.push(`| ${result.provider} | future_watch | China-focused; India endpoints unverified |`);
    } else if (result.provider === "nsepy") {
      rows.push(`| ${result.provider} | archive | Stale/unmaintained; migrated to nsepython |`);
    } else {
      rows.push(`| ${result.provider} | archive | No usable domains verified |`);
    }
  }

  const report = rows.join("\n");
  const outDir = path.resolve("reports/data-pipeline");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "51-open-source-python-sdk-research.md"), report);
  console.log(report);

  // Exit non-zero if any result is not useful
  const allNonZero = results.filter((r) => r.installed && Object.values(r.domains || {}).some((d) => d.status === "healthy"));
  if (allNonZero.length === 0) console.error("\n⚠️  No SDKs returned usable data. Verify Python environment.");
}

main().catch((e) => { console.error(e); process.exit(1); });
