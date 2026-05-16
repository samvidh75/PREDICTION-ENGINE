const fs = require("fs");

const path = "src/pages/OnboardingPage.tsx";
const raw = fs.readFileSync(path, "utf8");
const lines = raw.split(/\r?\n/);

const needle = "// Resume safety: ensure required answers exist for the phase we land in.";
const idx = lines.findIndex((l) => l.includes(needle));

if (idx === -1) {
  console.error("NOT_FOUND", needle);
  process.exit(1);
}

const start = Math.max(0, idx - 40);
const end = Math.min(lines.length - 1, idx + 120);

for (let i = start; i <= end; i++) {
  const ln = String(i + 1).padStart(4, " ");
  console.log(`${ln}: ${lines[i]}`);
}
