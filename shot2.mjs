import { chromium } from "playwright";
const base = "http://103.211.56.127";
const routes = [["scanner","/scanner"],["stock","/stock/AC"],["sectors","/sectors"],["pricing","/pricing"],["predictions","/predictions"]];
const b = await chromium.launch();
for (const [name, path] of routes) {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  try { await p.goto(base+path, { waitUntil: "domcontentloaded", timeout: 15000 }); await p.waitForTimeout(2500); await p.screenshot({ path: `.tmp/live-${name}.png` }); console.log("OK", name);} catch(e){ console.log("ERR", name, e.message.slice(0,80)); }
  await p.close();
}
await b.close();
