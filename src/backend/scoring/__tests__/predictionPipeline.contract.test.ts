import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const pipeline = readFileSync(resolve(process.cwd(), "scripts/run-prediction-pipeline.ts"), "utf8");
const priceRepair = readFileSync(resolve(process.cwd(), "scripts/repair-invalid-prices.ts"), "utf8");
const registryRepair = readFileSync(resolve(process.cwd(), "scripts/repair-prediction-registry.ts"), "utf8");

describe("F1 guarded pipeline contract", () => {
  it("requires explicit confirmation before prediction writes", () => {
    expect(pipeline).toContain('CONFIRM_F1_PIPELINE_APPLY !== "true"');
    expect(pipeline).toContain("Refusing apply: score collapse detected");
    expect(pipeline).toContain("Refusing apply: no complete snapshots are eligible for immutable registry promotion");
  });

  it("uses append-only immutable registry promotion", () => {
    expect(pipeline).toContain("SELECT id FROM prediction_registry WHERE symbol = $1 AND prediction_date = $2 AND prediction_horizon = $3 LIMIT 1");
    expect(pipeline).toContain("INSERT INTO prediction_registry");
    expect(pipeline).not.toContain("UPDATE prediction_registry SET");
    expect(pipeline).not.toContain("DELETE FROM prediction_registry");
  });

  it("writes run metadata, lineage, and completeness evidence", () => {
    expect(pipeline).toContain("INSERT INTO ingestion_runs");
    expect(pipeline).toContain("INSERT INTO scoring_runs");
    expect(pipeline).toContain("INSERT INTO prediction_input_lineage");
    expect(pipeline).toContain("INSERT INTO data_completeness_metrics");
  });

  it("keeps external source activation disabled by default", () => {
    expect(pipeline).toContain('const provider = new DatabaseSnapshotProvider()');
    expect(pipeline).not.toContain("screener.in");
    expect(pipeline).not.toContain("moneycontrol.com");
  });

  it("requires explicit repair confirmation and preserves source rows", () => {
    expect(priceRepair).toContain('CONFIRM_F1_REPAIR_APPLY === "true"');
    expect(priceRepair).toContain("quarantine-only; source rows remain preserved");
    expect(priceRepair).not.toContain("DELETE FROM daily_prices");
    expect(registryRepair).toContain('CONFIRM_F1_REPAIR_APPLY === "true"');
    expect(registryRepair).not.toContain("DELETE FROM prediction_registry");
  });
});
