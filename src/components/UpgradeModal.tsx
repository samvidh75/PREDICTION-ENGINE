/**
 * Premium Upgrade Modal
 * - Glassmorphic design matching app UI
 * - Smooth animations
 * - Customized upgrade prompts
 * - Links to pricing page
 */

import { useEffect, useState } from 'react';
import { X, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { colors } from '../design/tokens';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: 'feature-limit' | 'advanced-analysis' | 'alerts' | 'portfolio' | 'export';
  onUpgrade?: () => void;
}

export default function UpgradeModal({ isOpen, onClose, reason = 'advanced-analysis', onUpgrade }: UpgradeModalProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShowContent(true);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const reasons: Record<string, { title: string; description: string; features: string[] }> = {
    'feature-limit': {
      title: 'Unlock Premium Features',
      description: 'Get access to advanced tools and unlimited analysis',
      features: ['Unlimited stock comparisons', 'Advanced charting', 'Portfolio optimization', 'Real-time alerts']
    },
    'advanced-analysis': {
      title: 'Deep Market Intelligence',
      description: 'Upgrade to access our advanced AI analysis engine',
      features: ['AI-powered recommendations', 'Sector deep dives', 'Technical patterns', 'Expert insights']
    },
    'alerts': {
      title: 'Smart Price Alerts',
      description: 'Never miss important market moves',
      features: ['Custom price alerts', 'Earnings notifications', 'Sector alerts', '24/7 monitoring']
    },
    'portfolio': {
      title: 'Portfolio Analytics',
      description: 'Advanced tracking and optimization tools',
      features: ['Multi-portfolio management', 'Tax tracking', 'Performance analytics', 'Risk analysis']
    },
    'export': {
      title: 'Export & Reports',
      description: 'Download reports and export your research',
      features: ['PDF reports', 'Excel exports', 'Custom dashboards', 'Email reports']
    }
  };

  const content = reasons[reason];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        WebkitBackdropFilter: 'blur(4px)',
        animation: isOpen ? 'fadeIn 0.3s ease-out' : 'fadeOut 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          width: 'min(100%, calc(100vw - 32px))',
          maxWidth: '480px',
          borderRadius: '20px',
          background: `linear-gradient(135deg, ${colors.surface} 0%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid rgba(255,255,255,0.1)`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          overflow: 'hidden',
          animation: showContent ? 'slideUp 0.4s cubic-bezier(0.23, 1, 0.32, 1)' : 'slideDown 0.2s ease-out',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 32,
            height: 32,
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.06)',
            color: colors.body,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.12)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
          }}
        >
          <X size={16} />
        </button>

        {/* Header with Icon */}
        <div
          style={{
            padding: '32px 24px 24px',
            textAlign: 'center',
            background: `linear-gradient(135deg, rgba(255,107,107,0.05) 0%, rgba(255,255,255,0.02) 100%)`,
            borderBottom: `1px solid rgba(255,255,255,0.05)`,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(255,107,107,0.15) 0%, rgba(255,149,0,0.05) 100%)',
              border: '1px solid rgba(255,107,107,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: 28,
            }}
          >
            <Sparkles size={24} color="#FF6B6B" />
          </div>

          <h2
            style={{
              margin: '0 0 8px',
              fontSize: '20px',
              fontWeight: 700,
              color: colors.ink,
              letterSpacing: '-0.01em',
            }}
          >
            {content.title}
          </h2>

          <p
            style={{
              margin: 0,
              fontSize: '14px',
              color: colors.body,
              lineHeight: 1.5,
            }}
          >
            {content.description}
          </p>
        </div>

        {/* Features List */}
        <div
          style={{
            padding: '24px',
            display: 'grid',
            gap: '12px',
          }}
        >
          {content.features.map((feature, i) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.04)',
                animation: showContent ? `slideIn 0.3s ease-out ${0.1 + i * 0.05}s backwards` : 'none',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, rgba(255,107,107,0.2) 0%, rgba(255,149,0,0.1) 100%)',
                  border: '1px solid rgba(255,107,107,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 12,
                }}
              >
                <Zap size={12} color="#FF6B6B" />
              </div>

              <span
                style={{
                  fontSize: '13px',
                  color: colors.ink,
                  fontWeight: 500,
                }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>

        {/* Pricing Info */}
        <div
          style={{
            padding: '16px 24px',
            background: 'rgba(255,255,255,0.02)',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            borderBottom: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <TrendingUp size={16} color="#22c55e" />
          <div style={{ fontSize: '13px', color: colors.body, flex: 1 }}>
            <span style={{ fontWeight: 600, color: colors.ink }}>Premium Plan:</span> ₹299/month
          </div>
          <span
            style={{
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              fontWeight: 600,
            }}
          >
            Cancel anytime
          </span>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            padding: '20px 24px 24px',
            display: 'grid',
            gap: '10px',
          }}
        >
          <button
            onClick={() => {
              onUpgrade?.();
              window.location.href = '/pricing';
            }}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #FF6B6B 0%, #b0151e 100%)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(255, 107, 107, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.3)';
            }}
          >
            Start Free Trial
          </button>

          <button
            onClick={onClose}
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              border: `1px solid rgba(255,255,255,0.1)`,
              background: 'rgba(255,255,255,0.04)',
              color: colors.ink,
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
            }}
          >
            Maybe Later
          </button>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideDown {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
