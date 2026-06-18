import { chromium, type Browser, type Page } from "@playwright/test";

const VIEWPORTS = [
  { w: 1440, h: 900, label: "desktop-1440" },
  { w: 1920, h: 1080, label: "desktop-1920" },
  { w: 390, h: 844, label: "mobile-390" },
  { w: 768, h: 1024, label: "tablet-768" },
];

const ROUTES: Array<[string, string, boolean]> = [
  ["landing", "/?page=landing", false],
  ["rankings", "/?page=rankings", false],
  ["signals", "/?page=predictions", false],
  ["trust", "/?page=trust", false],
  ["about", "/?page=about", false],
  ["dashboard-auth", "/?page=dashboard", true],
  ["search-auth", "/?page=search", true],
  ["compare-auth", "/?page=compare", true],
  ["watchlist-auth", "/?page=watchlist", true],
  ["company-reliance-auth", "/?page=stock&id=RELIANCE", true],
];

interface LayoutAudit {
  contentWidthPx: number;
  viewportWidth: number;
  emptyRightAreaPx: number;
  hasBottomDock: boolean;
  bottomDockVisible: boolean;
  horizontalOverflow: boolean;
  mainContentUnder900: boolean;
  errors: string[];
}

async function auditPageLayout(page: Page, url: string, viewportW: number): Promise<LayoutAudit> {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });

  if (url.includes("auth") || url.includes("dashboard") || url.includes("search") || url.includes("stock")) {
    await page.addInitScript(() => {
      window.localStorage.setItem("ss_auth_session_v1", JSON.stringify({
        status: "authenticated", uid: "audit-user", createdAtMs: Date.now(),
      }));
    });
  }

  await page.goto(url, { waitUntil: "load", timeout: 15000 }).catch(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {})
  );
  await page.waitForTimeout(800);

  const audit = await page.evaluate((vw) => {
    const doc = document.documentElement;
    const body = document.body;
    const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - vw;

    // Find main content width
    const main = document.querySelector("main");
    const mainRect = main ? main.getBoundingClientRect() : null;
    const contentWidth = mainRect ? mainRect.width : 0;

    // Check for bottom nav on desktop
    const bottomNav = document.querySelector("[class*='bottom-nav'], .ssi-bottom-nav, [class*='bottom dock'], nav.fixed.bottom-0");
    const bottomNavVisible = bottomNav ? true : false;

    // Check for large empty right area (if main content is significantly narrower than viewport)
    const emptyRight = mainRect ? vw - mainRect.right : vw;

    // Check for any max-w-7xl or narrow container
    const containers = document.querySelectorAll("[class*='max-w-7xl'], [class*='max-w-5xl']");
    const hasNarrowContainer = containers.length > 0;

    // Check viewport for main content under 900px
    const contentUnder900 = contentWidth > 0 && contentWidth < 900;

    // Check for raw undefined/null/NaN in text
    const rawToken = /\b(undefined|null|NaN|Infinity)\b/.test(body.innerText);

    return {
      contentWidthPx: Math.round(contentWidth),
      viewportWidth: vw,
      emptyRightAreaPx: Math.round(emptyRight),
      hasBottomDock: bottomNavVisible,
      bottomDockVisible: bottomNavVisible,
      horizontalOverflow: overflow > 8,
      mainContentUnder900: contentUnder900 && vw >= 1440,
      errors: [
        ...(rawToken ? ["raw undefined/null/NaN visible"] : []),
        ...(overflow > 8 ? [`horizontal overflow ${overflow}px`] : []),
        ...(contentUnder900 && vw >= 1440 ? ["main content under 900px on desktop viewport"] : []),
        ...(bottomNavVisible && vw >= 1024 ? ["bottom nav visible on desktop/tablet"] : []),
      ],
    };
  }, viewportW);

  if (consoleErrors.length > 0) {
    audit.errors.push(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  }

  return audit;
}

async function main() {
  const results: string[] = [
    "# Visual Layout Audit",
    "",
    `Date: ${new Date().toISOString().split("T")[0]}`,
    "Checks: content width, empty right area, bottom dock on desktop, horizontal overflow, raw tokens",
    "",
    "## Results",
    "",
  ];

  const browser: Browser = await chromium.launch();
  let anyFailed = false;

  for (const [routeName, routeUrl, _isAuth] of ROUTES) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
      const audit = await auditPageLayout(page, routeUrl, vp.w);
      await page.close();

      const status = audit.errors.length === 0 ? "PASS" : "FAIL";
      if (audit.errors.length > 0) anyFailed = true;

      results.push(`### ${routeName} @ ${vp.label}`);
      results.push(`- Content: ${audit.contentWidthPx}px / Viewport: ${audit.viewportWidth}px`);
      results.push(`- Empty right: ${audit.emptyRightAreaPx}px`);
      results.push(`- Bottom dock: ${audit.hasBottomDock ? "YES" : "no"}`);
      results.push(`- Overflow: ${audit.horizontalOverflow ? "YES" : "no"}`);
      results.push(`- Status: **${status}**`);
      if (audit.errors.length > 0) {
        results.push(`- Errors: ${audit.errors.join("; ")}`);
      }
      results.push("");
    }
  }

  await browser.close();

  results.push("## Summary");
  results.push(anyFailed ? "Some checks failed. See above for details." : "All checks passed.");
  results.push("");

  const fs = await import("fs/promises");
  const path = await import("path");
  const outDir = path.join(process.cwd(), "reports", "ui");
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, "62-visual-layout-audit.md"), results.join("\n"));
  console.log(results.join("\n"));

  if (anyFailed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
