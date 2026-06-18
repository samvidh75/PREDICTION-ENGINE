import { chromium, type Browser, type Page } from "@playwright/test";
import { spawn } from "node:child_process";

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
  ["portfolio-auth", "/?page=portfolio", true],
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
  giantBlankRegion: boolean;
  lowContrastHero: boolean;
  primaryCtasOk: boolean;
  errors: string[];
}

async function auditPageLayout(page: Page, url: string, viewportW: number): Promise<LayoutAudit> {
  const failures: string[] = [];
  const consoleErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (/Failed to load resource: the server responded with a status of 50[024]/.test(text)) return;
    consoleErrors.push(text);
  });

  if (url.includes("auth") || url.includes("dashboard") || url.includes("search") || url.includes("stock") || url.includes("compare") || url.includes("watchlist") || url.includes("portfolio")) {
    await page.addInitScript(() => {
      window.localStorage.setItem("ss_auth_session_v1", JSON.stringify({
        status: "authenticated", uid: "audit-user", createdAtMs: Date.now(),
      }));
    });
  }

  await page.goto(url, { waitUntil: "load", timeout: 15000 }).catch(() =>
    page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 }).catch(() => {})
  );
  await page.waitForTimeout(1000);

  const audit = await page.evaluate((vw) => {
    const doc = document.documentElement;
    const body = document.body;
    const overflow = Math.max(doc.scrollWidth, body.scrollWidth) - vw;

    // Find the actual content container — try main, then ss-page, then #root, then first large div
    const main = document.querySelector("main, .ss-page, #root, [class*='page-content'], [class*='content-area']");
    const mainRect = main ? main.getBoundingClientRect() : null;

    // Fallback: measure the widest visible block
    const allBlocks = Array.from(document.querySelectorAll(
      "main, .ss-page, [class*='max-w'], [class*='w-full'], [class*='container'], #root > div"
    ));
    const largest = allBlocks.reduce<number>((acc, el) => {
      const r = el.getBoundingClientRect();
      return Math.max(acc, r.width);
    }, 0);

    // Actual content width: use mainRect if found and reasonable, else use largest block
    const contentWidth = (mainRect && mainRect.width > 100) ? mainRect.width : largest;
    const emptyRight = (mainRect && mainRect.width > 100) ? Math.max(0, vw - mainRect.right) : 0;

    // Visible bottom dock check — not just DOM presence, but actually displayed
    const bottomNavs = document.querySelectorAll(
      "nav.fixed.bottom-0, [class*='bottom-nav'], .ssi-bottom-nav, [class*='bottom dock']"
    );
    let bottomDockVisible = false;
    bottomNavs.forEach((nav) => {
      const style = window.getComputedStyle(nav);
      const rect = nav.getBoundingClientRect();
      // Check it's actually visible in the viewport bottom area
      if (style.display !== "none" && style.visibility !== "hidden" && rect.height > 0 && rect.top < vw * 0.9) {
        bottomDockVisible = true;
      }
    });

    // Check for narrow max-w-7xl container on desktop
    const narrowContainers = document.querySelectorAll("[class*='max-w-7xl'], [class*='max-w-5xl']");
    let hasNarrowContainer = false;
    narrowContainers.forEach((el) => {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if (style.display !== "none" && rect.width > 0 && rect.width < 900) {
        hasNarrowContainer = true;
      }
    });

    const contentUnder900 = contentWidth > 0 && contentWidth < 900;

    // Raw tokens
    const rawToken = /\b(undefined|null|NaN|Infinity)\b/.test(body.innerText);
    const publicRoute = /page=(landing|about|login|signup)/.test(location.search) || location.pathname === "/market";
    const panelCandidates = Array.from(document.querySelectorAll("section, article, main div")).filter((el) => {
      const r = el.getBoundingClientRect();
      const text = (el.textContent || "").trim();
      return publicRoute && r.width >= Math.min(320, vw - 40) && r.height >= 300 && text.length < 45;
    });
    const giantBlankRegion = panelCandidates.length > 0;
    const heroText = document.querySelector("h1, h2");
    let lowContrastHero = false;
    if (heroText) {
      const style = window.getComputedStyle(heroText);
      const color = style.color.match(/\d+/g)?.map(Number) || [];
      if (color.length >= 3) {
        const luminance = (0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]) / 255;
        lowContrastHero = luminance < 0.45;
      }
    }
    const primaryCtas = Array.from(document.querySelectorAll("button, a")).filter((el) => {
      const text = (el.textContent || "").trim();
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20 && /Start research|View rankings|Open rankings|Check Trust Centre|Open Trust Centre|Get started|Sign in|Create account|Search company|Compare|Source trust/i.test(text);
    });
    const primaryCtasOk = !publicRoute || primaryCtas.length >= 2;

    return {
      contentWidthPx: Math.round(contentWidth),
      viewportWidth: vw,
      emptyRightAreaPx: Math.round(emptyRight),
      hasBottomDock: bottomDockVisible,
      bottomDockVisible,
      horizontalOverflow: overflow > 8,
      mainContentUnder900: contentUnder900 && vw >= 1440,
      giantBlankRegion,
      lowContrastHero,
      primaryCtasOk,
      errors: [
        ...(rawToken ? ["raw undefined/null/NaN visible"] : []),
        ...(overflow > 8 ? [`horizontal overflow ${overflow}px`] : []),
        ...(contentUnder900 && vw >= 1440 ? ["main content under 900px on desktop viewport"] : []),
        ...(bottomDockVisible && vw >= 1024 ? ["bottom nav visible on desktop/tablet"] : []),
        ...(hasNarrowContainer && vw >= 1440 ? ["narrow container (max-w-7xl/5xl) found on desktop"] : []),
        ...(giantBlankRegion ? ["giant blank card/region detected on public route"] : []),
        ...(lowContrastHero ? ["hero heading appears low contrast"] : []),
        ...(!primaryCtasOk ? ["primary CTAs missing or not detectable"] : []),
      ],
    };
  }, viewportW);

  if (consoleErrors.length > 0) {
    audit.errors.push(`console errors: ${consoleErrors.slice(0, 3).join(" | ")}`);
  }

  return audit;
}

async function main() {
  const baseUrl = "http://127.0.0.1:4174";
  const results: string[] = [
    "# Visual Layout Audit",
    "",
    `Date: ${new Date().toISOString().split("T")[0]}`,
    "Checks: content width, empty right area, bottom dock on desktop, horizontal overflow, raw tokens",
    "",
    "## Results",
    "",
  ];

  const preview = spawn("npm", ["run", "preview", "--", "--host", "127.0.0.1", "--port", "4174"], {
    stdio: "ignore",
    shell: false,
  });
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const res = await fetch(baseUrl);
      if (res.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const browser: Browser = await chromium.launch();
  let anyFailed = false;

  try {
    for (const [routeName, routeUrl, _isAuth] of ROUTES) {
      for (const vp of VIEWPORTS) {
        const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } });
        const audit = await auditPageLayout(page, `${baseUrl}${routeUrl}`, vp.w);
        await page.close();

        const status = audit.errors.length === 0 ? "PASS" : "FAIL";
        if (audit.errors.length > 0) anyFailed = true;

        results.push(`### ${routeName} @ ${vp.label}`);
        results.push(`- Content: ${audit.contentWidthPx}px / Viewport: ${audit.viewportWidth}px`);
        results.push(`- Empty right: ${audit.emptyRightAreaPx}px`);
        results.push(`- Bottom dock visible: ${audit.bottomDockVisible ? "YES" : "no"}`);
        results.push(`- Overflow: ${audit.horizontalOverflow ? "YES" : "no"}`);
        results.push(`- Giant blank region: ${audit.giantBlankRegion ? "YES" : "no"}`);
        results.push(`- Low contrast hero: ${audit.lowContrastHero ? "YES" : "no"}`);
        results.push(`- Primary CTAs: ${audit.primaryCtasOk ? "ok" : "missing"}`);
        results.push(`- Status: **${status}**`);
        if (audit.errors.length > 0) {
          results.push(`- Errors: ${audit.errors.join("; ")}`);
        }
        results.push("");
      }
    }
  } finally {
    await browser.close();
    preview.kill("SIGTERM");
  }

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
