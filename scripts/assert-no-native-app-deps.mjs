#!/usr/bin/env node
/**
 * Assert No Native Application Dependencies
 *
 * Fails if application dependencies contain native addon packages
 * that prevent cross-platform portability.
 *
 * Banned: better-sqlite3, sqlite3, bindings, node-gyp-build, prebuild-install
 * Allowed: Build-tool transitive deps (@rollup/*, @esbuild/*, lightningcss-*)
 *
 * Usage: node scripts/assert-no-native-app-deps.mjs
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgPath = join(__dirname, "..", "package.json");

const BANNED = [
  "better-sqlite3",
  "sqlite3",
  "bindings",
  "node-gyp-build",
  "prebuild-install",
];

const BUILD_TOOL_PREFIXES = ["@rollup/", "@esbuild/", "lightningcss-"];

const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

const violations = [];

for (const banned of BANNED) {
  if (allDeps[banned]) {
    const isBuildTool = BUILD_TOOL_PREFIXES.some((prefix) =>
      banned.startsWith(prefix)
    );
    if (!isBuildTool) {
      violations.push(`package.json dependencies: "${banned}"`);
    }
  }
}

if (violations.length > 0) {
  console.error("❌ NATIVE APPLICATION DEPENDENCIES DETECTED:");
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    "\nThese packages require native compilation and block cross-platform portability."
  );
  process.exitCode = 1;
} else {
  console.log("✅ No native application dependencies detected.");
}
