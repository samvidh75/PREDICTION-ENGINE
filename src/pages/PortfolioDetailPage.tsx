import { Link } from 'react-router-dom';
import { colors } from '../design/tokens';

export default function PortfolioDetailPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ color: colors.textPrimary, marginBottom: '24px' }}>Portfolio</h1>
      <div
        style={{
          backgroundColor: colors.surface,
          backdropFilter: 'blur(20px) saturate(160%)',
          WebkitBackdropFilter: 'blur(20px) saturate(160%)',
          borderRadius: '8px',
          padding: '32px',
          textAlign: 'center',
          border: `1px solid ${colors.border}`,
        }}
      >
        <p style={{ color: colors.textPrimary, marginBottom: '16px' }}>
          Broker-synced portfolio import isn't available for PSE accounts yet.
        </p>
        <Link
          to="/portfolio"
          style={{
            display: 'inline-block',
            padding: '12px 24px',
            backgroundColor: colors.primary,
            color: colors.onPrimary,
            borderRadius: '6px',
            fontSize: '15px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Track holdings manually
        </Link>
      </div>
    </div>
  );
}
