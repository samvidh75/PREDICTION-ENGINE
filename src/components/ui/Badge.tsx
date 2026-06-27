import { color, font, radius, space } from '../../design/tokens';

interface BadgeProps {
  value: number;
  label?: string;
}

export function Badge({ value, label }: BadgeProps) {
  const { bg, text } = value >= 75
    ? { bg: 'rgba(26,127,75,0.10)', text: color.success }
    : value >= 50
      ? { bg: 'rgba(135,146,162,0.10)', text: color.textMuted }
      : { bg: 'rgba(223,27,65,0.10)', text: color.danger };

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: space[1],
      padding: `2px 10px`,
      borderRadius: radius.pill,
      background: bg,
      color: text,
      fontSize: '12px',
      fontWeight: 600,
      fontFamily: font,
    }}>
      {label && <span style={{ fontWeight: 400, opacity: 0.7 }}>{label}</span>}
      {value}
    </span>
  );
}
