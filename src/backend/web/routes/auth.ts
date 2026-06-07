import type { FastifyPluginAsync } from "fastify";

const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY ?? process.env.FIREBASE_API_KEY ?? "";

type IdentityToolkitMethod = "accounts:signUp" | "accounts:signInWithPassword" | "accounts:sendOobCode";

async function postIdentityToolkit<T>(method: IdentityToolkitMethod, body: Record<string, unknown>): Promise<T> {
  if (!FIREBASE_API_KEY) {
    throw Object.assign(new Error("Firebase API key is not configured."), { statusCode: 500 });
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/${method}?key=${FIREBASE_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const payload = (await response.json()) as any;
  if (!response.ok) {
    const message = payload?.error?.message ?? "Firebase authentication failed.";
    const statusCode = message === "EMAIL_EXISTS" ? 409 : message === "EMAIL_NOT_FOUND" || message === "INVALID_PASSWORD" ? 401 : 400;
    throw Object.assign(new Error(message), { statusCode, code: message });
  }

  return payload as T;
}

function readString(body: unknown, key: string): string {
  if (!body || typeof body !== "object") return "";
  const value = (body as Record<string, unknown>)[key];
  return typeof value === "string" ? value.trim() : "";
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/api/auth/signup", async (request, reply) => {
    const email = readString(request.body, "email").toLowerCase();
    const password = readString(request.body, "password");

    if (!email || !password || password.length < 6) {
      return reply.code(400).send({ ok: false, code: "INVALID_INPUT", message: "Enter a valid email and password." });
    }

    try {
      const result = await postIdentityToolkit<{ localId: string; email?: string; displayName?: string }>("accounts:signUp", {
        email,
        password,
        returnSecureToken: true,
      });

      return { ok: true, user: { uid: result.localId, email: result.email ?? email, displayName: result.displayName } };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "EMAIL_EXISTS") {
        return reply.code(409).send({ ok: false, code: "EMAIL_EXISTS", message: "An account already exists with this email." });
      }
      throw error;
    }
  });

  app.post("/api/auth/login", async (request, reply) => {
    const email = readString(request.body, "email").toLowerCase();
    const password = readString(request.body, "password");

    if (!email || !password) {
      return reply.code(400).send({ ok: false, code: "INVALID_INPUT", message: "Enter a valid email and password." });
    }

    try {
      const result = await postIdentityToolkit<{ localId: string; email?: string; displayName?: string }>("accounts:signInWithPassword", {
        email,
        password,
        returnSecureToken: true,
      });

      return { ok: true, user: { uid: result.localId, email: result.email ?? email, displayName: result.displayName } };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === "EMAIL_NOT_FOUND" || code === "INVALID_PASSWORD" || code === "INVALID_LOGIN_CREDENTIALS") {
        return reply.code(401).send({ ok: false, code, message: "The email or password is incorrect." });
      }
      throw error;
    }
  });

  app.post("/api/auth/password-reset", async (request, reply) => {
    const email = readString(request.body, "email").toLowerCase();
    if (!email) {
      return reply.code(400).send({ ok: false, code: "INVALID_EMAIL", message: "Enter a valid email address." });
    }

    await postIdentityToolkit("accounts:sendOobCode", {
      requestType: "PASSWORD_RESET",
      email,
    });

    return { ok: true, email };
  });
};

export default authRoutes;
