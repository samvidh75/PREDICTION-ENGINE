import type { FastifyPluginAsync } from "fastify";
import { query } from "../../../db/index";
import {
  realResponse,
  unavailableResponse,
  errorResponse,
  type DataLineageEntry,
} from "../../../shared/data/AnalyticalResponse";

export const researchRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/research/lineage/:symbol", async (req, reply) => {
    const { symbol } = req.params as { symbol: string };
    if (!symbol || typeof symbol !== "string") {
      return reply.send(errorResponse("INVALID_SYMBOL", "A valid symbol is required."));
    }

    const sym = symbol.toUpperCase();

    try {
      const lineageRes = await query(
        `SELECT metric, source_table, source_field, source_name, source_url,
                as_of, retrieved_at, freshness_days, availability,
                is_fallback, is_synthetic, rejection_reason
         FROM prediction_input_lineage
         WHERE symbol = $1
         ORDER BY metric`,
        [sym]
      );
      const lineageRows: any[] = lineageRes.rows || [];

      const scoringRes = await query(
        `SELECT DISTINCT sr.model_version, sr.run_date, sr.status
         FROM scoring_runs sr
         JOIN prediction_input_lineage pil ON pil.prediction_run_id = sr.id
         WHERE pil.symbol = $1
         ORDER BY sr.run_date DESC`,
        [sym]
      );
      const scoringRows: any[] = scoringRes.rows || [];

      const fsRes = await query(
        `SELECT source_label, source_url, ingestion_timestamp, snapshot_date
         FROM financial_snapshots
         WHERE symbol = $1 AND source_label IS NOT NULL
         ORDER BY snapshot_date DESC
         LIMIT 1`,
        [sym]
      );
      const fsRows: any[] = fsRes.rows || [];

      const compRes = await query(
        `SELECT dataset_type, completeness_score, as_of
         FROM data_completeness_metrics
         WHERE symbol = $1
         ORDER BY as_of DESC`,
        [sym]
      );
      const compRows: any[] = compRes.rows || [];

      if (lineageRows.length === 0 && fsRows.length === 0) {
        return reply.send(unavailableResponse(
          "LINEAGE_UNAVAILABLE",
          `No input lineage records found for ${sym}.`,
          ["prediction_input_lineage", "financial_snapshots"]
        ));
      }

      const entries: DataLineageEntry[] = lineageRows.map((r) => ({
        sourceTable: r.source_table,
        sourceField: r.metric || r.source_field,
        provider: r.source_name,
        asOf: r.as_of,
        retrievedAt: r.retrieved_at,
        isFallback: !!r.is_fallback,
        isSynthetic: false as const,
        notes: r.availability === "unavailable" ? "Unavailable" : r.rejection_reason || undefined,
      }));

      fsRows.forEach((r) => {
        entries.push({
          sourceTable: "financial_snapshots",
          sourceField: r.source_label,
          provider: r.source_label,
          asOf: r.ingestion_timestamp || r.snapshot_date,
          retrievedAt: r.ingestion_timestamp,
          isFallback: false,
          isSynthetic: false as const,
        });
      });

      const modelRunRow = scoringRows[0] || null;

      const completeness: Record<string, number> = {};
      compRows.forEach((r) => { completeness[r.dataset_type] = r.completeness_score; });

      const payload = {
        symbol: sym,
        entries,
        modelRun: modelRunRow ? {
          modelVersion: modelRunRow.model_version,
          runDate: modelRunRow.run_date,
          status: modelRunRow.status,
        } : null,
        completeness: Object.keys(completeness).length > 0 ? completeness : null,
        entryCount: entries.length,
      };

      return reply.send(realResponse(
        payload,
        "live",
        new Date().toISOString(),
        Object.values(completeness).reduce((a, b) => a + b, 0) / Math.max(Object.keys(completeness).length, 1) || 0,
        entries,
        "OK"
      ));
    } catch (err: any) {
      return reply.send(errorResponse("LINEAGE_QUERY_FAILED", err.message));
    }
  });
};

export default researchRoutes;
