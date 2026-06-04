import type { FastifyPluginAsync } from "fastify";
import type { ApiError } from "../types/api";
import { apiError } from "../types/api";

const requestIdHeader = "x-request-id";

export const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setErrorHandler((err, req, reply) => {
    const e = err as unknown as { message?: string; name?: string; statusCode?: number };

    const status = typeof e.statusCode === "number" ? e.statusCode : 500;

    const requestId = req.headers[requestIdHeader] as string | undefined;

    app.log.error(
      {
        err: { message: e.message ?? "Unknown error", name: e.name ?? "Error" },
        status,
        requestId,
        url: req.url,
        method: req.method,
      },
      "backend_error",
    );

    const payload: ApiError = apiError(
      status >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
      status >= 500 ? "Something went wrong." : "Request rejected.",
      {
        // Do not leak internal stack traces to clients.
        requestId,
      }
    );

    reply.status(status).send(payload);
  });
};
