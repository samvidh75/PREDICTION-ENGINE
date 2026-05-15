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

export function logSubsystemError(args: {
  context: DiagnosticContext;
  error: unknown;
  info?: string;
}): void {
  const { context, error, info } = args;

  // Keep it console-only for now (no backend dependency).
  // The goal is to make failures diagnosable without destabilising the app.
  // eslint-disable-next-line no-console
  console.error(
    `[SubsystemError] subsystem=${context.subsystem}${context.phase ? ` phase=${context.phase}` : ""}`,
    {
      info: info ?? "",
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : safeStringify(error),
      context,
    },
  );

  // Optional: write to a global ring buffer for quick manual debugging.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = window as any;
  if (!g.__ss_di_buffer) g.__ss_di_buffer = [];
  const buffer: unknown[] = g.__ss_di_buffer;
  buffer.push({ at: Date.now(), context, info, error: safeStringify(error) });
  if (buffer.length > 50) buffer.splice(0, buffer.length - 50);
}
