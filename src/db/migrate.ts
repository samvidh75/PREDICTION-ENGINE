import { fileURLToPath } from "url";
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { query } from "./index";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

(async () => {
  try {
    console.log("Starting warehouse migrations...");
    const migrationsDir = join(__dirname, "migrations");
    const files = readdirSync(migrationsDir)
      .filter(f => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}...`);
      const sql = readFileSync(join(migrationsDir, file), { encoding: "utf-8" });
      await query(sql);
      console.log(`Completed migration: ${file}`);
    }
    console.log("All migrations completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
})();

