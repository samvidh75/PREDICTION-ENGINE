import { colors, radius } from "../design/tokens";

export function Badge({ value, label }: { value: number | string; label?: string }) {
  const numeric = typeof value === "number" ? value : 60;
  const tone =
    numeric >= 75
      ? { background: "#EEF8EE", text: colors.success, border: colors.success }
      : numeric >= 50
        ? { background: colors.gray50, text: colors.gray900, border: colors.gray100 }
        : { background: "#FDEEF1", text: colors.danger, border: colors.danger };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        minHeight: "24px",
        padding: "0 12px",
        borderRadius: radius.pill,
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
