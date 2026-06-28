/**
 * V1 Launch Verification Script
 * Run: npx tsx scripts/launch/verify-v1-launch.ts
 * Checks that all V1 content, pages, components, and infrastructure are ready.
 */

interface Check {
  name: string;
  status: "pass" | "fail" | "warn";
  detail: string;
}

async function main() {
  const checks: Check[] = [];

  // 1. Critical content files exist
  const contentFiles = [
    "src/stockstory/content/sector/SectorTypes.ts",
    "src/stockstory/content/sector/SectorContentService.ts",
    "src/stockstory/content/methodology/MethodologyContent.ts",
    "src/stockstory/content/PublicContentSafetyValidator.ts",
    "src/stockstory/content/ContentOpportunityTypes.ts",
    "src/stockstory/content/GrowthContentPipeline.ts",
  ];
  for (const file of contentFiles) {
    const exists = await fsExists(file);
    checks.push({
      name: `Content file: ${file}`,
      status: exists ? "pass" : "fail",
      detail: exists ? "Found" : "Missing",
    });
  }

  // 2. All V1 pages exist
  const pages = [
    "src/pages/Sectors.tsx",
    "src/pages/SectorResearch.tsx",
    "src/pages/ScannerLanding.tsx",
    "src/pages/Methodology.tsx",
    "src/pages/Trust.tsx",
    "src/pages/Invite.tsx",
    "src/pages/SharedResearchSnapshot.tsx",
    "src/pages/CompanyResearchReport.tsx",
  ];
  for (const page of pages) {
    const exists = await fsExists(page);
    checks.push({
      name: `Page: ${page}`,
      status: exists ? "pass" : "fail",
      detail: exists ? "Found" : "Missing",
    });
  }

  // 3. All share/report services exist
  const services = [
    "src/stockstory/share/ResearchShareTypes.ts",
    "src/stockstory/share/ResearchShareService.ts",
    "src/stockstory/reports/CompanyResearchReportTypes.ts",
    "src/stockstory/reports/CompanyResearchReportBuilder.ts",
    "src/stockstory/growth/referral/ReferralTypes.ts",
    "src/stockstory/growth/referral/ReferralService.ts",
    "src/stockstory/growth/experiments/ExperimentConfig.ts",
  ];
  for (const svc of services) {
    const exists = await fsExists(svc);
    checks.push({
      name: `Service: ${svc}`,
      status: exists ? "pass" : "fail",
      detail: exists ? "Found" : "Missing",
    });
  }

  // 4. Route definitions include V1 pages
  const routesContent = await readFile("src/app/routes.tsx");
  const routeChecks = [
    { page: "Sectors", path: "/sectors" },
    { page: "SectorResearch", path: "/sectors/:sectorSlug" },
    { page: "ScannerLanding", path: "/scanner/:preset" },
    { page: "Methodology", path: "/methodology" },
    { page: "Trust", path: "/trust" },
    { page: "Invite", path: "/invite" },
    { page: "SharedResearchSnapshot", path: "/share/research/:shareId" },
    { page: "CompanyResearchReport", path: "/research/:symbol" },
  ];
  for (const rc of routeChecks) {
    const hasImport = routesContent.includes(rc.page);
    const hasRoute = routesContent.includes(rc.path);
    checks.push({
      name: `Route: ${rc.path}`,
      status: hasImport && hasRoute ? "pass" : "fail",
      detail: hasImport ? (hasRoute ? "Imported and defined" : "Imported but route missing") : "Not imported",
    });
  }

  // 5. SEBI compliance present on key pages
  const disclosurePages = [
    "src/pages/Sectors.tsx",
    "src/pages/Methodology.tsx",
    "src/pages/Trust.tsx",
    "src/pages/Invite.tsx",
  ];
  for (const dp of disclosurePages) {
    const content = await readFile(dp);
    checks.push({
      name: `SEBI compliance on: ${dp}`,
      status: content.includes("SEBIComplianceBanner") ? "pass" : "warn",
      detail: content.includes("SEBIComplianceBanner")
        ? "Compliance banner present"
        : "No compliance banner",
    });
  }

  // 6. SafetyValidator applied to content
  const safetyImports = ["src/pages/Sectors.tsx", "src/pages/Trust.tsx", "src/pages/Methodology.tsx"].map(async (f) => {
    const content = await readFile(f);
    return { file: f, hasSafety: content.includes("SafetyValidator") || content.includes("validateContent") || content.includes("ResearchOnlyDisclosure") };
  });
  for (const r of await Promise.all(safetyImports)) {
    checks.push({
      name: `Safety on: ${r.file}`,
      status: r.hasSafety ? "pass" : "warn",
      detail: r.hasSafety ? "Safety disclosure present" : "No safety validator referenced",
    });
  }

  // 7. Compliance footer present
  const footerPages = ["src/pages/Sectors.tsx", "src/pages/Methodology.tsx", "src/pages/Trust.tsx"];
  for (const fp of footerPages) {
    const content = await readFile(fp);
    checks.push({
      name: `Footer disclosure on: ${fp}`,
      status: content.includes("Not investment advice") ? "pass" : "warn",
      detail: content.includes("Not investment advice") ? "Footer present" : "No footer",
    });
  }

  // Summary
  const pass = checks.filter((c) => c.status === "pass").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const warn = checks.filter((c) => c.status === "warn").length;

  console.log("═══════════════════════════════════════");
  console.log("  V1 Launch Verification Results");
  console.log("═══════════════════════════════════════");
  console.log(`  Total: ${checks.length}  |  ✅ Pass: ${pass}  |  ⚠️  Warn: ${warn}  |  ❌ Fail: ${fail}`);
  console.log("─────────────────────────────────────");
  for (const check of checks) {
    const icon = check.status === "pass" ? "✅" : check.status === "fail" ? "❌" : "⚠️ ";
    console.log(`  ${icon}  ${check.name}`);
    if (check.status !== "pass") {
      console.log(`       ${check.detail}`);
    }
  }
  console.log("─────────────────────────────────────");

  process.exit(fail > 0 ? 1 : 0);
}

async function fsExists(relPath: string): Promise<boolean> {
  try {
    const path = await import("path");
    const fs = await import("fs");
    return fs.existsSync(path.join(process.cwd(), relPath));
  } catch {
    return false;
  }
}

async function readFile(relPath: string): Promise<string> {
  try {
    const path = await import("path");
    const fs = await import("fs");
    return fs.readFileSync(path.join(process.cwd(), relPath), "utf-8");
  } catch {
    return "";
  }
}

main().catch(console.error);
