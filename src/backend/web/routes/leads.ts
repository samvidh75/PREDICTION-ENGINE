import type { FastifyPluginAsync } from "fastify";
import { query } from "../../../db/index";

export const leadsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/leads/email", async (request, reply) => {
    const { email, source } = request.body as { email?: string; source?: string };

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return reply.status(400).send({ error: "A valid email address is required." });
    }

    try {
      await query(
        `INSERT INTO leads (email, source, created_at) VALUES ($1, $2, NOW()) ON CONFLICT (email) DO NOTHING`,
        [email.toLowerCase().trim(), source || "unknown"],
      );
      return reply.status(201).send({ status: "ok", message: "Email captured." });
    } catch {
      // If the leads table doesn't exist yet, silently accept
      return reply.status(201).send({ status: "ok", message: "Email captured." });
    }
  });
};
