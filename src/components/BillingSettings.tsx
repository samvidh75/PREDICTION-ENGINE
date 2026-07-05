/**
 * Billing & Account Settings
 * Manage subscription, payment methods, and account preferences
 */

import { useState, useEffect } from 'react';
import { premiumTierManager, type Subscription, type SubscriptionPlan } from '../utils/premiumTier';
import { paymentService } from '../utils/paymentService';

export default function BillingSettings() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgrading, setUpgrading] = useState(false);
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadSubscription();
  }, []);

  const loadSubscription = async () => {
    const userId = localStorage.getItem('userId') || 'default';
    const sub = await premiumTierManager.getSubscription(userId);
    setSubscription(sub);
    setLoading(false);
  };

  const handleUpgrade = async (plan: SubscriptionPlan) => {
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
      alert(result.message);
      await loadSubscription();
      setShowUpgradeModal(false);
    } else {
      alert(`Upgrade failed: ${result.message}`);
    }

    setUpgrading(false);
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure? You will lose premium access immediately.')) {
      return;
    }

    const userId = localStorage.getItem('userId') || 'default';
    const result = await paymentService.cancelSubscription(userId);

    if (result.success) {
      alert(result.message);
      await loadSubscription();
    } else {
      alert(`Cancellation failed: ${result.error}`);
    }
  };

  if (loading) {
    return <div style={styles.container}>Loading...</div>;
  }

  if (!subscription) {
    return <div style={styles.container}>Failed to load subscription</div>;
  }

  const features = premiumTierManager.getFeatures(subscription.plan);
  const daysUntilRenewal = Math.ceil(
    (subscription.renewalDate - Date.now()) / (24 * 60 * 60 * 1000)
  );

  return (
    <div style={styles.container}>
      <style>{`${BILLING_STYLES}`}</style>

      <h1 style={styles.title}>💳 Billing & Account</h1>

      {/* Current Subscription */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Current Subscription</h2>

        <div style={styles.currentPlan}>
          <div style={styles.planName}>
            {features.name} Plan
            <span style={styles.statusBadge}>{subscription.status}</span>
          </div>

          <div style={styles.planDetails}>
            <div style={styles.detail}>
              <strong>Tier 3 (Groq) Calls/Day:</strong>
              <span>{features.tier3QueriesPerDay}</span>
            </div>
            <div style={styles.detail}>
              <strong>Portfolio Analysis:</strong>
              <span>{features.portfolioAnalysis ? '✓ Included' : '❌ Not included'}</span>
            </div>
            <div style={styles.detail}>
              <strong>Export Reports:</strong>
              <span>{features.advancedReporting ? '✓ Included' : '❌ Not included'}</span>
            </div>
            <div style={styles.detail}>
              <strong>News Sentiment:</strong>
              <span>{features.newsAnalysis ? '✓ Included' : '❌ Not included'}</span>
            </div>
          </div>

          <div style={styles.renewalInfo}>
            <div style={styles.renewalText}>
              {subscription.status === 'active'
                ? `Renews in ${daysUntilRenewal} days`
                : 'Subscription cancelled'}
            </div>
            {subscription.status === 'active' && (
              <button style={styles.cancelBtn} onClick={handleCancel}>
                Cancel Subscription
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Options */}
      {subscription.plan === 'free' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Upgrade to Premium</h2>

          <div style={styles.plansGrid}>
            <PlanCard
              name="Premium"
              price="₹299"
              period="/month"
              features={[
                '50 Groq calls/day',
                'Portfolio analysis',
                'Export reports',
                'News sentiment',
                'Email support',
              ]}
              onUpgrade={() => setShowUpgradeModal(true)}
              buttonText="Upgrade Now"
            />

            <PlanCard
              name="Pro"
              price="₹799"
              period="/month"
              features={[
                '200 Groq calls/day',
                'API access',
                'Advanced analytics',
                'Priority support',
                'Custom alerts (100)',
              ]}
              onUpgrade={() => setShowUpgradeModal(true)}
              buttonText="Choose Pro"
              highlighted
            />
          </div>
        </div>
      )}

      {/* Contact Info for Upgrade */}
      {showUpgradeModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>Complete Your Profile</h3>
            <p>We need this info to process your payment:</p>

            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 XXXXXXXXXX"
                style={styles.input}
              />
            </div>

            <div style={styles.modalButtons}>
              <button
                style={styles.upgradeBtn}
                onClick={() => handleUpgrade('premium')}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Upgrade to Premium (₹299)'}
              </button>
              <button
                style={styles.upgradeBtn}
                onClick={() => handleUpgrade('pro')}
                disabled={upgrading}
              >
                {upgrading ? 'Processing...' : 'Upgrade to Pro (₹799)'}
              </button>
              <button
                style={styles.closeBtn}
                onClick={() => setShowUpgradeModal(false)}
                disabled={upgrading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Summary */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Usage This Month</h2>

        <div style={styles.usageSummary}>
          <UsageStat label="Tier 1 Calls" value="2,450 / Unlimited" />
          <UsageStat label="Tier 2 Calls" value={`${features.tier2QueriesPerDay} / ${features.tier2QueriesPerDay}`} />
          <UsageStat label="Tier 3 Calls" value={`15 / ${features.tier3QueriesPerDay}`} />
          <UsageStat label="Reports Generated" value="8" />
        </div>
      </div>

      {/* Payment History */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Payment History</h2>

        {subscription.paymentId ? (
          <div style={styles.paymentList}>
            <div style={styles.paymentItem}>
              <div>
                <div style={styles.paymentDesc}>Premium Subscription</div>
                <div style={styles.paymentDate}>
                  {new Date(subscription.startDate).toLocaleDateString('en-IN')}
                </div>
              </div>
              <div style={styles.paymentAmount}>₹{subscription.price}</div>
            </div>
          </div>
        ) : (
          <p style={{ color: '#999' }}>No payments yet. Free tier user.</p>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  period,
  features,
  onUpgrade,
  buttonText,
  highlighted,
}: any) {
  return (
    <div style={{ ...styles.planCard, ...(highlighted ? styles.planCardHighlighted : {}) }}>
      <div style={styles.planCardName}>{name}</div>
      <div style={styles.planCardPrice}>
        {price}
        <span style={styles.planCardPeriod}>{period}</span>
      </div>

      <ul style={styles.planCardFeatures}>
        {features.map((f: string, i: number) => (
          <li key={i} style={styles.planCardFeature}>
            ✓ {f}
          </li>
        ))}
      </ul>

      <button style={styles.planCardBtn} onClick={onUpgrade}>
        {buttonText}
      </button>
    </div>
  );
}

function UsageStat({ label, value }: any) {
  return (
    <div style={styles.usageStat}>
      <div style={styles.usageStatLabel}>{label}</div>
      <div style={styles.usageStatValue}>{value}</div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '24px',
    color: '#333',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    color: '#333',
    borderBottom: '2px solid #667eea',
    paddingBottom: '8px',
  },
  currentPlan: {
    background: 'white',
    border: '2px solid #667eea',
    borderRadius: '12px',
    padding: '20px',
  },
  planName: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusBadge: {
    fontSize: '12px',
    fontWeight: 600,
    background: '#27ae60',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    textTransform: 'capitalize',
  },
  planDetails: {
    display: 'grid',
    gap: '8px',
    marginBottom: '16px',
  },
  detail: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    padding: '8px 0',
  },
  renewalInfo: {
    padding: '12px',
    background: '#f0f4ff',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  renewalText: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#667eea',
  },
  cancelBtn: {
    padding: '6px 12px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600,
  },
  plansGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '16px',
  },
  planCard: {
    background: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  planCardHighlighted: {
    border: '2px solid #667eea',
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.15)',
  },
  planCardName: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  planCardPrice: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#667eea',
  },
  planCardPeriod: {
    fontSize: '14px',
    fontWeight: 400,
    color: '#999',
  },
  planCardFeatures: {
    listStyle: 'none',
    padding: 0,
    marginBottom: '16px',
    textAlign: 'left',
  },
  planCardFeature: {
    fontSize: '13px',
    padding: '6px 0',
    color: '#666',
  },
  planCardBtn: {
    width: '100%',
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '12px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginTop: '4px',
    fontSize: '13px',
  },
  modalButtons: {
    display: 'grid',
    gap: '8px',
    marginTop: '20px',
  },
  upgradeBtn: {
    padding: '10px',
    background: '#667eea',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  },
  closeBtn: {
    padding: '10px',
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
  },
  usageSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px',
  },
  usageStat: {
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px',
    textAlign: 'center',
  },
  usageStatLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 500,
    marginBottom: '4px',
  },
  usageStatValue: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#333',
  },
  paymentList: {
    background: 'white',
    border: '1px solid #eee',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  paymentItem: {
    padding: '16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #eee',
  },
  paymentDesc: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  paymentDate: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  paymentAmount: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#27ae60',
  },
};

const BILLING_STYLES = `
  label {
    display: block;
    font-weight: 600;
    margin-bottom: 4px;
    font-size: 13px;
  }
`;
