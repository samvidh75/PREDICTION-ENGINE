import type { FastifyPluginAsync } from "fastify";
import { apiError, apiSuccess } from "../../types/api";
import { getDiscoveryIndex } from "../../../services/discovery/discoveryIndex";
import { discoveryGraphEngine } from "../../search/discoveryGraphEngine";
import type { DiscoveryResult } from "../../../services/discovery/discoveryTypes";

export const discoveryRoutes: FastifyPluginAsync = async (app) => {
  app.get("/api/discovery/index", async () => {
    return apiSuccess(getDiscoveryIndex());
  });

  app.get("/api/discovery/related", async (req) => {
    const entityId = (req.query as { entityId?: unknown }).entityId;
    const limitRaw = (req.query as { limit?: unknown }).limit;

    if (typeof entityId !== "string" || !entityId.trim()) {
      return apiError("INVALID_INPUT", "Missing query param: entityId");
    }

    const limitNum = typeof limitRaw === "string" ? Number(limitRaw) : 6;
    const limit = Number.isFinite(limitNum) ? Math.max(1, Math.min(12, limitNum)) : 6;

    const related = discoveryGraphEngine.relatedFor(entityId.trim(), limit);

    // This module returns full DiscoveryEntity objects.
    // UI can map these to ExplorationResult types safely.
    return apiSuccess(related);
  });
};
