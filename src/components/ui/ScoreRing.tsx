export function getScoreColor(s: number) {
  if (s >= 80) return '#0d5c34';
  if (s >= 65) return '#1a7f4b';
  if (s >= 50) return '#1a56db';
  if (s >= 35) return '#b45309';
  return '#c0392b';
}

export function getScoreLabel(s: number | null) {
  if (s === null) return '—';
  if (s >= 90) return 'Excellent';
  if (s >= 80) return 'Very Good';
  if (s >= 70) return 'Good';
  if (s >= 55) return 'Fair';
  if (s >= 40) return 'Weak';
  return 'Poor';
}

export function getSignalFromScore(s: number | null) {
  if (s === null) return { text: '—', color: '#bbb' };
  if (s >= 80) return { text: 'Strong Buy ↗', color: '#1a7f4b' };
  if (s >= 65) return { text: 'Buy ↗', color: '#1a7f4b' };
  if (s >= 50) return { text: 'Accumulate ↗', color: '#1a56db' };
  if (s >= 35) return { text: 'Watch ⚠', color: '#b45309' };
  return { text: 'Avoid ↘', color: '#c0392b' };
}

interface ScoreRingProps {
  score: number | null;
  size: number;
  label?: string;
  strokeWidth?: number;
}

export default function ScoreRing({ score, size, label, strokeWidth }: ScoreRingProps) {
  const strokeW = strokeWidth ?? Math.max(4, size * 0.09);
  const r = (size - strokeW) / 2;
  const circ = 2 * Math.PI * r;
  const filled = score ? (score / 100) * circ : 0;
  const color = score ? getScoreColor(score) : '#ccc';

  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={strokeW} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeW}
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2 - (label || score !== null ? size * 0.06 : 0)}
            textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.26} fontWeight="800"
            fontFamily="Inter, sans-serif" fill={score ? color : '#ccc'}>
        {score ?? '—'}
      </text>
      {(label || score !== null) && (
        <text x={size / 2} y={size / 2 + size * 0.18}
              textAnchor="middle" dominantBaseline="middle"
              fontSize={size * 0.12} fontWeight="600"
              fontFamily="Inter, sans-serif" fill={score ? color : '#ccc'}>
          {label ?? getScoreLabel(score)}
        </text>
      )}
    </svg>
  );
}

export function ConfidenceRing({ pct, size = 32 }: { pct: number; size?: number }) {
  const r = (size - 3) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EBEBEB" strokeWidth={3} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a7f4b" strokeWidth={3}
              strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle"
            fontSize={size * 0.28} fontWeight="700" fontFamily="Inter, sans-serif" fill="#2d2d2d">
        {Math.round(pct)}
      </text>
    </svg>
  );
}

export function MiniSparkline({
  data, color = '#1a7f4b', width = 60, height = 26
}: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return <span className="text-[#bbb] text-[10px]">—</span>;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) =>
    `${(i / (data.length - 1)) * width},${height - 2 - ((v - min) / range) * (height - 5)}`
  ).join(' ');
  return (
    <svg width={width} height={height} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
