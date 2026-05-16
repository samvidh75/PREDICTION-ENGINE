const fs = require("fs");

const path = "src/pages/OnboardingPage.tsx";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/);

// Print from 1190..1210 (1-based line numbers)
const start = 1190; 
const end = 1210;

for (let i = start; i <= end; i++) {
  const idx = i - 1;
  if (idx < 0 || idx >= lines.length) continue;
  const ln = String(i).padStart(4, " ");
  console.log(`${ln}: ${lines[idx]}`);
}
