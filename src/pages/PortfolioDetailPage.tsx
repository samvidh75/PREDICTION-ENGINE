import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { colors } from '../design/tokens';

// ── Shared motion presets (mirrors ScannerPage/StockPage animation vocabulary) ──
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

export default function PortfolioDetailPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={pageTransition}
      style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}
    >
      <h1 style={{ color: colors.textPrimary, marginBottom: '24px' }}>Portfolio</h1>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...pageTransition, delay: 0.05 }}
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
        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} style={{ display: 'inline-block' }}>
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
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
