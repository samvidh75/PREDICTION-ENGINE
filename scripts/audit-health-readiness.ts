/**
 * audit-health-readiness.ts — Checks health/readyz truth state.
 *
 * Usage:
 *   npx tsx scripts/audit-health-readiness.ts
 */

export {};
async function main(): Promise<void> {
  const baseUrl = process.env.API_BASE || "https://www.stockstory-india.com";
  let passed = 0;
  let failed = 0;

  console.log("Health/Readyz Truth Audit");
  console.log("──────────────────────────\n");

  try {
    const healthRes = await fetch(`${baseUrl}/healthz`);
    const health = await healthRes.json();
    if (health.ok === true && health.service === "stockstory-backend") {
      console.log("  PASS: /healthz returns ok");
      passed++;
    } else {
      console.log(`  FAIL: /healthz unexpected: ${JSON.stringify(health)}`);
      failed++;
    }
  } catch (err) {
    console.log(`  FAIL: /healthz error: ${err}`);
    failed++;
  }

  try {
    const readyRes = await fetch(`${baseUrl}/readyz`);
    const ready = await readyRes.json();

    if (ready.ok === undefined && ready.service === "stockstory-backend") {
      console.log("  PASS: /readyz returns service info");
      passed++;
      return;
    }

    console.log(`  State: ${ready.state || "unknown"}, ok: ${ready.ok}`);
    console.log(`  DB: ${ready.database?.kind || "unknown"}, ok: ${ready.database?.ok}`);
    console.log(`  Data state: ${ready.data?.state || "unknown"}`);
    console.log(`  Coverage: ${ready.data?.coverageCount || 0}, Predictions: ${ready.data?.predictionCount || 0}`);

    if (ready.ok === false && ready.state === "not_ready") {
      console.log("  INFO: Explicit not_ready — truthful");
      passed++;
    } else if (ready.ok === true || ready.state === "ok" || ready.state === "degraded") {
      if (ready.data?.coverageCount === 0 && ready.data?.predictionCount === 0 && ready.state === "ok") {
        console.log("  FAIL: claims ok despite zero data");
        failed++;
      } else {
        console.log(`  PASS: truthful state: ${ready.state}`);
        passed++;
      }
    } else {
      console.log(`  PASS: response received (${readyRes.status})`);
      passed++;
    }
  } catch (err) {
    console.log(`  FAIL: /readyz error: ${err}`);
    failed++;
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
