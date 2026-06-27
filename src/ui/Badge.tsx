export function Badge({ value, label }: { value: number | string; label?: string }) {
  const numeric = typeof value === "number" ? value : 60;
  const tone =
    numeric >= 75
      ? { background: "var(--green-light)", text: "var(--green)", border: "var(--green)" }
      : numeric >= 50
        ? { background: "var(--chip)", text: "var(--text-700)", border: "var(--border)" }
        : { background: "var(--red-light)", text: "var(--red)", border: "var(--red)" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        minHeight: "24px",
        padding: "0 12px",
        borderRadius: "var(--radius-xl)",
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: tone.text,
        fontSize: "12px",
        fontWeight: 600,
        lineHeight: "1.4",
      }}
    >
      {label ? `${label} ` : ""}
      {value}
    </span>
  );
}
