import { color, font, space } from '../../design/tokens';

interface StatProps {
  label: string;
  value: string | number | null;
}

export function Stat({ label, value }: StatProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: space[1] }}>
      <span style={{
        fontSize: '12px',
        fontWeight: 500,
        color: color.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
        fontFamily: font,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: '16px',
        fontWeight: 600,
        color: color.primaryDark,
        fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
      }}>
        {value != null ? value : '—'}
      </span>
    </div>
  );
}
