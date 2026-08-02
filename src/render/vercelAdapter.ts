/**
 * Adapter: converts Vercel serverless handler exports to Fastify route handlers.
 *
 * Usage:
 *   import stockHandler from "../../api/stock.js";
 *   import { adaptVercelHandler } from "./vercelAdapter.js";
 *   server.get("/api/stock", adaptVercelHandler(stockHandler));
 *
 * The Vercel handler signature is:
 *   export default async function handler(req: VercelRequest, res: VercelResponse)
 *
 * We map Fastify's request/reply to a fake VercelRequest/VercelResponse.
 */

import type { FastifyRequest, FastifyReply } from "fastify";

interface FakeVercelRequest {
  query: Record<string, string | string[]>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  body: unknown;
  cookies: Record<string, string>;
}

interface FakeVercelResponse {
  status: (code: number) => FakeVercelResponse;
  json: (data: unknown) => void;
  setHeader: (key: string, value: string) => FakeVercelResponse;
  send: (data: unknown) => void;
  redirect: (code: number, url: string) => void;
  getHeader: (key: string) => string | undefined;
}

export type VercelHandler = (req: FakeVercelRequest, res: FakeVercelResponse) => Promise<void> | void;

export function adaptVercelHandler(handler: VercelHandler) {
  return async (fastifyReq: FastifyRequest, fastifyReply: FastifyReply) => {
    return new Promise<void>((resolve, reject) => {
      const query: Record<string, string | string[]> = {};
      for (const [k, v] of Object.entries(fastifyReq.query ?? {})) {
        query[k] = typeof v === "string" || Array.isArray(v) ? v : String(v ?? "");
      }

      const vercelReq: FakeVercelRequest = {
        query,
        headers: fastifyReq.headers as Record<string, string | string[] | undefined>,
        method: fastifyReq.method,
        url: fastifyReq.url,
        body: fastifyReq.body,
        cookies: (fastifyReq as any).cookies as Record<string, string> ?? {},
      };

      let responded = false;

      const vercelRes: FakeVercelResponse = {
        status(code: number) {
          if (!responded) fastifyReply.status(code);
          return this;
        },
        json(data: unknown) {
          if (responded) return;
          responded = true;
          fastifyReply.send(data);
          resolve();
        },
        setHeader(key: string, value: string) {
          fastifyReply.header(key, value);
          return this;
        },
        send(data: unknown) {
          if (responded) return;
          responded = true;
          fastifyReply.send(data);
          resolve();
        },
        redirect(code: number, url: string) {
          if (responded) return;
          responded = true;
          fastifyReply.redirect(url, code);
          resolve();
        },
        getHeader(key: string) {
          return fastifyReply.getHeader(key) as string | undefined;
        },
      };

      try {
        const result = handler(vercelReq, vercelRes);
        if (result instanceof Promise) {
          result.then(() => {
            if (!responded) {
              responded = true;
              fastifyReply.send("");
              resolve();
            }
          }).catch((err) => {
            responded = true;
            reject(err);
          });
        } else if (!responded) {
          responded = true;
          fastifyReply.send("");
          resolve();
        }
      } catch (err) {
        responded = true;
        reject(err);
      }
    });
  };
}
