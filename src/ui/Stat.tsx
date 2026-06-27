export function Stat({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div style={{ display: "grid", gap: "4px" }}>
      <span
        style={{
          color: "var(--text-500)",
          fontSize: "12px",
          fontWeight: 500,
          lineHeight: "1.4",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: "var(--text-primary)",
          fontSize: "16px",
          fontWeight: 600,
          lineHeight: "1.2",
        }}
      >
        {value ?? "—"}
      </span>
    </div>
  );
}
