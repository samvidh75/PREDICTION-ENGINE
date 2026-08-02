import puppeteer from "puppeteer";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function attachPageDiagnostics(page, label) {
  page.on("console", async (message) => {
    const values = [];
    for (const arg of message.args()) {
      try {
        values.push(await arg.jsonValue());
      } catch {
        values.push("[unserializable]");
      }
    }
    if (values.length > 0) {
      console.log(`${label} CONSOLE [${message.type()}]:`, ...values);
    } else {
      console.log(`${label} CONSOLE [${message.type()}]:`, message.text());
    }
  });

  page.on("pageerror", (error) => {
    console.error(`${label} PAGEERROR:`, error?.stack || error?.message || error);
  });

  page.on("dialog", async (dialog) => {
    console.log(`${label} DIALOG:`, dialog.type(), dialog.message());
    await dialog.dismiss().catch(() => {});
  });

  page.on("close", () => {
    console.log(`${label} CLOSED`);
  });
}

async function run() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await attachPageDiagnostics(page, "MAIN");

  browser.on("targetcreated", async (target) => {
    if (target.type() !== "page") return;
    try {
      const popup = await target.page();
      if (!popup) return;
      await attachPageDiagnostics(popup, "POPUP");
      console.log("POPUP TARGET CREATED:", target.url());
    } catch (error) {
      console.error("TARGET CREATED ERROR:", error);
    }
  });

  await page.goto("http://localhost:5177/?page=login", { waitUntil: "networkidle2" });
  console.log("MAIN URL:", page.url());

  await delay(3000);

  const buttons = await page.$$("button");
  let targetButton = null;
  for (const button of buttons) {
    const text = await page.evaluate((el) => (el.textContent || "").trim(), button);
    if (text.includes("Continue with Google")) {
      targetButton = button;
      break;
    }
  }

  if (!targetButton) {
    console.error("Google button not found");
    await browser.close();
    return;
  }

  const box = await targetButton.boundingBox();
  if (!box) {
    console.error("Google button has no bounding box");
    await browser.close();
    return;
  }

  console.log("CLICKING GOOGLE BUTTON:", box);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);

  for (let i = 0; i < 6; i += 1) {
    await delay(5000);
    const diagnostics = await page.evaluate(() => ({
      googleAuthLastError: window.__googleAuthLastError ?? null,
      href: window.location.href,
      title: document.title,
    }));
    console.log(`MAIN DIAGNOSTICS AFTER CLICK [${i + 1}]`, diagnostics);
  }

  await browser.close();
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
