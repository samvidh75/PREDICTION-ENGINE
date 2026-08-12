import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, TrendingUp, Shield, Lightbulb } from 'lucide-react';
import { colors } from '../design/tokens';

// ── Shared motion vocabulary (mirrors ScannerPage/StockPage) ──
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const pageTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };
const staggerParent = { visible: { transition: { staggerChildren: 0.08 } } };

export default function StockStoryPage() {
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(scrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div style={{
      width: '100%',
      backgroundColor: colors.canvas,
      color: colors.textPrimary,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflow: 'hidden',
    }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '3px',
        background: `linear-gradient(90deg, #8b5cf6, #06b6d4)`,
        width: `${scrollProgress}%`,
        zIndex: 1000,
        transition: 'width 0.1s ease',
      }} />

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: 'clamp(16px, 5vw, 40px)',
        textAlign: 'center',
        borderBottom: `1px solid ${colors.border}`,
      }}>
        <div style={{
          display: 'inline-block',
          padding: '8px 16px',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: '20px',
          marginBottom: '16px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#8b5cf6',
        }}>
          ✨ The Story Behind StockEx
        </div>
        <h1 style={{
          margin: '0 0 12px 0',
          fontSize: 'clamp(28px, 8vw, 48px)',
          fontWeight: '700',
          lineHeight: '1.2',
        }}>
          Understand the Stock Before You Invest
        </h1>
        <p style={{
          margin: '0',
          fontSize: 'clamp(14px, 3vw, 18px)',
          color: colors.textSecondary,
          maxWidth: '600px',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}>
          We're building the research platform for PSE stock investors who believe in data-driven decisions.
        </p>
      </div>

      {/* Hero Section - Clean */}
      <div style={{
        padding: 'clamp(40px, 10vw, 80px) clamp(16px, 5vw, 40px)',
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerParent}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: 'clamp(20px, 5vw, 40px)',
          }}
        >
          {[
            {
              icon: <TrendingUp size={32} />,
              title: 'Real Data',
              desc: 'Live PSE data, calculated scores, not predictions',
            },
            {
              icon: <Shield size={32} />,
              title: 'Comprehensive',
              desc: 'Quality, Growth, Valuation, Momentum, Risk in one place',
            },
            {
              icon: <Zap size={32} />,
              title: 'Fast',
              desc: 'Stock pages load in <500ms, charts instantly',
            },
            {
              icon: <Lightbulb size={32} />,
              title: 'Smart Search',
              desc: 'Find stocks by typos, SME companies, complex filters',
            },
          ].map((feature, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={pageTransition}
              whileHover={{ scale: 1.02, y: -3 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '24px',
                backgroundColor: colors.surface,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
              }}
            >
              <div style={{ color: '#8b5cf6', marginBottom: '12px' }}>
                {feature.icon}
              </div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                {feature.title}
              </h3>
              <p style={{ margin: '0', fontSize: '14px', color: colors.textSecondary }}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Market Data Section */}
      <div style={{
        padding: 'clamp(40px, 10vw, 80px) clamp(16px, 5vw, 40px)',
        maxWidth: '1200px',
        margin: '0 auto',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <h2 style={{
          margin: '0 0 32px 0',
          fontSize: 'clamp(24px, 6vw, 36px)',
          fontWeight: '700',
          textAlign: 'center',
        }}>
          Supported Markets & Assets
        </h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerParent}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
          }}
        >
          {[
            { title: 'PSE Stocks', items: '18 main stocks', icon: '📈' },
            { title: 'PSE Stocks', items: '18 stocks', icon: '📊' },
            { title: 'SME Listed', items: '18 companies', icon: '🏢' },
            { title: 'Technical Analysis', items: 'Charting & Indicators', icon: '📉' },
          ].map((market, i) => (
            <motion.div
              key={i}
              variants={fadeUp}
              transition={pageTransition}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                padding: '20px',
                backgroundColor: colors.surface,
                borderRadius: '12px',
                border: `1px solid ${colors.border}`,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>{market.icon}</div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600' }}>
                {market.title}
              </h3>
              <p style={{ margin: '0', fontSize: '14px', color: colors.textSecondary }}>
                {market.items}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* How It Works */}
      <div style={{
        padding: 'clamp(40px, 10vw, 80px) clamp(16px, 5vw, 40px)',
        maxWidth: '1200px',
        margin: '0 auto',
        borderTop: `1px solid ${colors.border}`,
      }}>
        <h2 style={{
          margin: '0 0 40px 0',
          fontSize: 'clamp(24px, 6vw, 36px)',
          fontWeight: '700',
          textAlign: 'center',
        }}>
          How StockEx Works
        </h2>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={staggerParent}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '32px',
            position: 'relative',
          }}
        >
          {[
            {
              step: '1',
              title: 'Search Any Stock',
              desc: 'Find PSE companies with typo correction',
            },
            {
              step: '2',
              title: 'Instant Page Load',
              desc: 'Get stock details in <500ms with live data',
            },
            {
              step: '3',
              title: 'View Metrics',
              desc: 'See Quality, Growth, Valuation, Momentum, Risk scores',
            },
            {
              step: '4',
              title: 'AI Insights',
              desc: 'Get AI-powered analysis running on your browser',
            },
          ].map((item, i) => (
            <motion.div key={i} variants={fadeUp} transition={pageTransition} style={{ position: 'relative' }}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '16px',
                }}
              >
                {item.step}
              </motion.div>
              <h3 style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
              }}>
                {item.title}
              </h3>
              <p style={{
                margin: '0',
                fontSize: '14px',
                color: colors.textSecondary,
              }}>
                {item.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* CTA Section */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerParent}
        style={{
          padding: 'clamp(40px, 10vw, 80px) clamp(16px, 5vw, 40px)',
          maxWidth: '1200px',
          margin: '0 auto',
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
        }}
      >
        <motion.h2 variants={fadeUp} transition={pageTransition} style={{
          margin: '0 0 16px 0',
          fontSize: 'clamp(24px, 6vw, 36px)',
          fontWeight: '700',
        }}>
          Ready to Research Better?
        </motion.h2>
        <motion.p variants={fadeUp} transition={pageTransition} style={{
          margin: '0 0 32px 0',
          fontSize: 'clamp(14px, 3vw, 18px)',
          color: colors.textSecondary,
        }}>
          Start with 18 main stocks and real-time market data
        </motion.p>

        <motion.button
          variants={fadeUp}
          transition={pageTransition}
          whileHover={{ scale: 1.04, y: -2, boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)' }}
          whileTap={{ scale: 0.97 }}
          onClick={() => window.location.href = '/dashboard'}
          style={{
            padding: 'clamp(12px, 2vw, 16px) clamp(24px, 5vw, 32px)',
            backgroundColor: '#8b5cf6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: 'clamp(14px, 2vw, 16px)',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          Explore Dashboard <ArrowRight size={16} />
        </motion.button>
      </motion.div>

      {/* Footer */}
      <div style={{
        padding: 'clamp(32px, 5vw, 48px) clamp(16px, 5vw, 40px)',
        borderTop: `1px solid ${colors.border}`,
        textAlign: 'center',
        color: colors.textSecondary,
        fontSize: '12px',
      }}>
        <p style={{ margin: '0' }}>
          StockEx PSE — Research platform for PSE Stock Exchange. Not financial advice. Educational purposes only.
        </p>
      </div>
    </div>
  );
}
