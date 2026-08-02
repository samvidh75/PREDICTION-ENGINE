export type DiagnosticContext = {
  subsystem: string;
  phase?: string;
  featureKey?: string;
  details?: Record<string, string | number | boolean>;
};

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function normalizeUnknownError(error: unknown): { name: string; message: string; stack?: string } | string {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }

  if (error && typeof error === "object") {
    const anyErr = error as { name?: unknown; message?: unknown; stack?: unknown };
    const hasAny =
      "name" in anyErr || "message" in anyErr || "stack" in anyErr;

    if (hasAny) {
      return {
        name: typeof anyErr.name === "string" ? anyErr.name : "Error",
        message: typeof anyErr.message === "string" ? anyErr.message : String(anyErr.message ?? ""),
        stack: typeof anyErr.stack === "string" ? anyErr.stack : undefined,
      };
    }
  }

  const s = (() => {
    try {
      return safeStringify(error);
    } catch {
      return String(error);
    }
  })();

  return s;
}

export function logSubsystemError(args: {
  context: DiagnosticContext;
  error: unknown;
  info?: string;
}): void {
  const { context, error, info } = args;
  const normalized = normalizeUnknownError(error);

  const errorStr =
    typeof normalized === "string"
      ? normalized
      : `${normalized.name}: ${normalized.message}${normalized.stack ? `\n${normalized.stack}` : ""}`;

  // Keep it console-only for now (no backend dependency).
  // The goal is to make failures diagnosable without destabilising the app.
  // eslint-disable-next-line no-console
  console.error(
    `[SubsystemError] subsystem=${context.subsystem}${context.phase ? ` phase=${context.phase}` : ""} error=${errorStr}`,
    {
      info: info ?? "",
      context,
      errorType: typeof error,
    },
  );

  // Optional: write to a global ring buffer for quick manual debugging.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = window as any;
  if (!g.__ss_di_buffer) g.__ss_di_buffer = [];
  const buffer: unknown[] = g.__ss_di_buffer;
  buffer.push({ at: Date.now(), context, info, error: normalized });
  if (buffer.length > 50) buffer.splice(0, buffer.length - 50);
}
