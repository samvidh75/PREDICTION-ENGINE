const fs = require('fs');
const path = require('path');

let s = fs.readFileSync(path.join(__dirname, 'track16_report.cjs'), 'utf8');

// Replace the problematic backtick template with string concatenation
s = s.replace(
  "const r8 = `# Final Verdict",
  "const r8 = '# Final Verdict"
);
// Fix the end of the template
s = s.replace(
  "real-world predictive power.\\n`;",
  "real-world predictive power.\\n';"
);

fs.writeFileSync(path.join(__dirname, 'track16_report.cjs'), s, 'utf8');
console.log('Patched');
