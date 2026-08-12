import { chromium } from "playwright";
const base = process.env.BASE_URL || "http://103.211.56.127";
const routes = [
  ["home", "/"], ["scanner", "/scanner"], ["stock", "/stock/AC"], ["sectors", "/sectors"], ["pricing", "/pricing"], ["about", "/about"], ["predictions", "/predictions"], ["compare", "/compare"],
];
const b = await chromium.launch();
for (const [name, path] of routes) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  try { await p.goto(base + path, { waitUntil: "networkidle", timeout: 20000 }); await p.waitForTimeout(600); await p.screenshot({ path: `.tmp/live-${name}.png`, fullPage: false }); console.log("OK", name); } catch(e){ console.log("ERR", name, e.message.slice(0,80)); }
  await p.close();
}
await b.close();
