import { colors } from "../design/tokens";

export function Divider({ margin = "16px 0" }: { margin?: string }) {
  return (
    <hr
      style={{
        border: "none",
        borderTop: `1px solid ${colors.border}`,
        margin,
      }}
    />
  );
}
