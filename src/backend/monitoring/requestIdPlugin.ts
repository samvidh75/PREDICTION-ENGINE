import type { FastifyPluginAsync } from "fastify";
import crypto from "crypto";

function readIncomingRequestId(req: { headers: Record<string, string | string[] | undefined> }): string | undefined {
  const raw = req.headers["x-request-id"];
  if (typeof raw === "string" && raw.trim().length > 0) return raw.trim();
  return undefined;
}

export const requestIdPlugin: FastifyPluginAsync = async (app) => {
  app.addHook("onRequest", async (req) => {
    const incoming = readIncomingRequestId(req);
    const next = incoming ?? crypto.randomUUID();

    req.requestId = next;

    // Response header so clients can correlate failures.
    req.headers["x-request-id"] = next;
  });

  app.addHook("onSend", async (req, reply) => {
     
    reply.header("x-request-id", req.requestId ?? "");
  });
};
