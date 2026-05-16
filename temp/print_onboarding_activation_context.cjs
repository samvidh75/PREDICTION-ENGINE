const fs = require("fs");

const path = "src/pages/OnboardingPage.tsx";
const raw = fs.readFileSync(path, "utf8");
const lines = raw.split(/\r?\n/);

function printAround(matcher, contextBefore = 80, contextAfter = 220) {
  const idx = lines.findIndex((l) => l.includes(matcher));
  if (idx === -1) {
    console.log(`NOT_FOUND:${matcher}`);
    return;
  }
  const start = Math.max(0, idx - contextBefore);
  const end = Math.min(lines.length - 1, idx + contextAfter);
  console.log(`----CONTEXT_START:${matcher} line=${idx + 1}----`);
  console.log(lines.slice(start, end + 1).join("\n"));
  console.log(`----CONTEXT_END:${matcher}----`);
}

printAround('activationSubStage === "auth"', 60, 200);
printAround('setActivationSubStage("guided")', 60, 220);
printAround("GuidedSearchDiscoveryStep", 60, 260);
printAround("saveOnboardingSeedSelection", 60, 260);
printAround('navigate({ page: "dashboard"', 60, 220);
