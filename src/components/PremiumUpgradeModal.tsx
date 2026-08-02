/**
 * Premium Upgrade Modal
 * Global modal to encourage users to upgrade
 * Use: <PremiumUpgradeModal isOpen={showUpgrade} onClose={setShowUpgrade} trigger="export-pdf" />
 */

import { useState } from 'react';
import { paymentService } from '../utils/paymentService';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  trigger?: 'export-pdf' | 'advanced-alerts' | 'api-access' | 'news-sentiment';
  email?: string;
  phone?: string;
}

const TRIGGER_MESSAGES: Record<string, { title: string; description: string; feature: string }> = {
  'export-pdf': {
    title: '📄 Export Reports',
    description: 'Generate and download professional analysis reports',
    feature: 'Available in Premium',
  },
  'advanced-alerts': {
    title: '🔔 Advanced Alerts',
    description: 'Set up to 100 custom price and technical alerts',
    feature: 'Available in Premium',
  },
  'api-access': {
    title: '🔌 API Access',
    description: 'Build apps on top of StockEx data',
    feature: 'Available in Pro',
  },
  'news-sentiment': {
    title: '📰 News Sentiment',
    description: 'AI-powered analysis of stock-related news',
    feature: 'Available in Premium',
  },
};

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  trigger = 'export-pdf',
  email: initialEmail,
  phone: initialPhone,
}: UpgradeModalProps) {
  const [email, setEmail] = useState(initialEmail || '');
  const [phone, setPhone] = useState(initialPhone || '');
  const [upgrading, setUpgrading] = useState(false);
  const [step, setStep] = useState<'info' | 'contact' | 'success'>('info');

  if (!isOpen) return null;

  const triggerInfo = TRIGGER_MESSAGES[trigger] || TRIGGER_MESSAGES['export-pdf'];

  const handleUpgrade = async (plan: 'premium' | 'pro') => {
    if (!email || !phone) {
      alert('Please enter email and phone');
      return;
    }

    setUpgrading(true);
    const userId = localStorage.getItem('userId') || 'default';

    const result = await paymentService.openPaymentModal({
      plan,
      userId,
      email,
      phone,
    });

    if (result.success) {
      setStep('success');
      setTimeout(() => {
        onClose(false);
        setStep('info');
        setEmail('');
        setPhone('');
      }, 2000);
    } else {
      alert(`Upgrade failed: ${result.message}`);
    }

    setUpgrading(false);
  };

  return (
    <div style={styles.overlay}>
      <style>{`${MODAL_STYLES}`}</style>

      <div style={styles.modal}>
        {step === 'info' && (
          <>
            <button
              style={styles.closeBtn}
              onClick={() => onClose(false)}
            >
              ✕
            </button>

            <div style={styles.icon}>{triggerInfo.title.charAt(0)}</div>

            <h2 style={styles.title}>{triggerInfo.title}</h2>
            <p style={styles.description}>{triggerInfo.description}</p>

            <div style={styles.featuresList}>
              <h3 style={styles.featureTitle}>Premium includes:</h3>
              <ul style={styles.features}>
                <li>✓ {triggerInfo.feature}</li>
                <li>✓ 50 Groq AI calls per day</li>
                <li>✓ Portfolio-aware analysis</li>
                <li>✓ Stock comparison tool</li>
                <li>✓ Export reports to PDF</li>
              </ul>
            </div>

            <div style={styles.pricingGrid}>
              <div style={styles.pricingCard}>
                <div style={styles.planName}>Premium</div>
                <div style={styles.price}>₱299<span style={styles.period}>/mo</span></div>
                <button
                  style={styles.upgradeBtn}
                  onClick={() => setStep('contact')}
                >
                  Upgrade Now
                </button>
              </div>

              <div style={{ ...styles.pricingCard, ...styles.proCard }}>
                <div style={styles.badge}>RECOMMENDED</div>
                <div style={styles.planName}>Pro</div>
                <div style={styles.price}>₱799<span style={styles.period}>/mo</span></div>
                <button
                  style={styles.upgradeBtn}
                  onClick={() => setStep('contact')}
                >
                  Choose Pro
                </button>
              </div>
            </div>

            <button
              style={styles.skipBtn}
              onClick={() => onClose(false)}
            >
              Maybe later
            </button>
          </>
        )}

        {step === 'contact' && (
          <>
            <h2 style={styles.title}>Complete Your Profile</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={styles.input}
                disabled={upgrading}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                style={styles.input}
                disabled={upgrading}
              />
            </div>

            <div style={styles.buttonGroup}>
              <button
                style={styles.upgradeBtn}
                onClick={() => handleUpgrade('premium')}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Upgrade to Premium (₱299)'}
              </button>
              <button
                style={styles.upgradeBtn}
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Upgrade to Pro (₱799)'}
              </button>
              <button
                style={styles.backBtn}
                onClick={() => setStep('info')}
                disabled={upgrading}
              >
                Back
              </button>
            </div>
          </>
        )}

        {step === 'success' && (
          <div style={styles.successBox}>
            <div style={styles.successIcon}>🎉</div>
            <h2 style={styles.successTitle}>Welcome to Premium!</h2>
            <p style={styles.successMsg}>
              Your subscription is now active. Enjoy all premium features!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2000,
    padding: '16px',
  },
  modal: {
    background: 'white',
    borderRadius: '16px',
    padding: '32px 24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0',
  },
  icon: {
    fontSize: '48px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '12px',
    color: '#333',
  },
  description: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '24px',
  },
  featuresList: {
    marginBottom: '24px',
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  featureTitle: {
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  features: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  pricingGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '24px',
  },
  pricingCard: {
    padding: '16px',
    border: '1px solid #eee',
    borderRadius: '8px',
    textAlign: 'center',
  },
  proCard: {
    border: '2px solid #667eea',
    background: '#f0f4ff',
  },
  badge: {
    fontSize: '11px',
    fontWeight: 700,
    background: '#667eea',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '3px',
    display: 'inline-block',
    marginBottom: '8px',
  },
  planName: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
  },
  price: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#667eea',
  },
  period: {
    fontSize: '12px',
    fontWeight: 400,
    color: '#999',
  },
  upgradeBtn: {
    width: '100%',
    padding: '8px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '12px',
  },
  skipBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: '#999',
    border: '1px solid #ddd',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '14px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '6px',
    color: '#333',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'inherit',
  },
  buttonGroup: {
    display: 'grid',
    gap: '8px',
  },
  backBtn: {
    padding: '10px',
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  },
  successBox: {
    textAlign: 'center',
    padding: '24px',
  },
  successIcon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  successTitle: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#27ae60',
  },
  successMsg: {
    fontSize: '14px',
    color: '#666',
  },
};

const MODAL_STYLES = `
  ul li {
    padding: 4px 0;
    font-size: 13px;
    color: #666;
  }
`;
