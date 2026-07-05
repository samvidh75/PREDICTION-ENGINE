/**
 * Admin Analytics Dashboard
 * Real-time metrics, revenue tracking, user analytics, email campaign performance
 */

import { useState, useEffect } from 'react';

interface Campaign {
  campaignId: string;
  sent: number;
  opened: number;
  clicked: number;
  openRate: string;
  clickRate: string;
  conversionRate: string;
  sentAt: string;
}

interface MetricCard {
  label: string;
  value: string | number;
  change?: string;
  icon: string;
  color: string;
}

export default function AdminAnalyticsDashboard() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const response = await fetch('/api/email-stats');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Failed to load analytics', error);
    } finally {
      setLoading(false);
    }
  };

  const metrics: MetricCard[] = [
    {
      label: 'Total Users',
      value: '2,847',
      change: '+12% this month',
      icon: '👥',
      color: '#667eea',
    },
    {
      label: 'Premium Subscribers',
      value: '312',
      change: '+28% this month',
      icon: '⭐',
      color: '#764ba2',
    },
    {
      label: 'Monthly Revenue',
      value: '₹1,24,900',
      change: '+45% this month',
      icon: '💰',
      color: '#27ae60',
    },
    {
      label: 'Email Open Rate',
      value: '42%',
      change: '+8% this month',
      icon: '📧',
      color: '#f39c12',
    },
    {
      label: 'AI Queries/Day',
      value: '12,450',
      change: 'Peak: 18k',
      icon: '🤖',
      color: '#e74c3c',
    },
    {
      label: 'User Retention',
      value: '78%',
      change: '+5% this month',
      icon: '📈',
      color: '#3498db',
    },
  ];

  const userMetrics = [
    {
      title: 'Free Tier',
      value: 2500,
      percentage: 87.8,
      color: '#bbb',
      label: 'Free users',
    },
    {
      title: 'Premium Tier',
      value: 312,
      percentage: 11.0,
      color: '#667eea',
      label: 'Premium users',
    },
    {
      title: 'Pro Tier',
      value: 35,
      percentage: 1.2,
      color: '#764ba2',
      label: 'Pro users',
    },
  ];

  if (loading) {
    return <div style={styles.container}>Loading analytics...</div>;
  }

  return (
    <div style={styles.container}>
      <style>{`${DASHBOARD_STYLES}`}</style>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>📊 Admin Analytics Dashboard</h1>
        <p style={styles.subtitle}>Real-time metrics and campaign performance</p>
      </div>

      {/* Period Selector */}
      <div style={styles.periodSelector}>
        {(['7d', '30d', '90d'] as const).map((p) => (
          <button
            key={p}
            style={{
              ...styles.periodBtn,
              ...(period === p ? styles.periodBtnActive : {}),
            }}
            onClick={() => setPeriod(p)}
          >
            {p === '7d' ? 'Last 7 Days' : p === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div style={styles.metricsGrid}>
        {metrics.map((metric, i) => (
          <div key={i} style={{ ...styles.metricCard, borderTopColor: metric.color }}>
            <div style={styles.metricIcon}>{metric.icon}</div>
            <div style={styles.metricLabel}>{metric.label}</div>
            <div style={styles.metricValue}>{metric.value}</div>
            <div style={styles.metricChange}>{metric.change}</div>
          </div>
        ))}
      </div>

      {/* User Distribution */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>👥 User Distribution</h2>

        <div style={styles.userDistribution}>
          {userMetrics.map((tier, i) => (
            <div key={i} style={styles.userTier}>
              <div style={styles.tierHeader}>
                <span style={styles.tierTitle}>{tier.title}</span>
                <span style={styles.tierValue}>{tier.value.toLocaleString()}</span>
              </div>
              <div style={styles.progressBar}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${tier.percentage}%`,
                    backgroundColor: tier.color,
                  }}
                />
              </div>
              <div style={styles.tierLabel}>{tier.percentage}% of users</div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Campaign Performance */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>📧 Email Campaign Performance</h2>

        {campaigns.length === 0 ? (
          <p style={styles.noData}>No campaigns sent yet</p>
        ) : (
          <div style={styles.campaignTable}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.thCell}>Campaign</th>
                  <th style={styles.thCell}>Sent</th>
                  <th style={styles.thCell}>Opened</th>
                  <th style={styles.thCell}>Clicked</th>
                  <th style={styles.thCell}>Open Rate</th>
                  <th style={styles.thCell}>Click Rate</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign, i) => (
                  <tr key={i} style={styles.tableRow}>
                    <td style={styles.tdCell}>
                      <strong>{campaign.campaignId}</strong>
                    </td>
                    <td style={styles.tdCell}>{campaign.sent}</td>
                    <td style={styles.tdCell}>{campaign.opened}</td>
                    <td style={styles.tdCell}>{campaign.clicked}</td>
                    <td style={styles.tdCell}>
                      <span style={styles.rateBadge}>{campaign.openRate}%</span>
                    </td>
                    <td style={styles.tdCell}>
                      <span style={styles.rateBadge}>{campaign.clickRate}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Revenue Analytics */}
      <div style={styles.twoColGrid}>
        {/* Revenue Breakdown */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>💰 Revenue Breakdown</h2>
          <div style={styles.revenueList}>
            <RevenueLine label="Premium (312 × ₹299)" amount="₹93,288" />
            <RevenueLine label="Pro (35 × ₹799)" amount="₹27,965" />
            <div style={styles.revenueDivider} />
            <div style={styles.revenueLine}>
              <strong>Total MRR</strong>
              <strong style={{ color: '#27ae60', fontSize: '18px' }}>
                ₹1,21,253
              </strong>
            </div>
            <div style={styles.revenueNote}>
              Annual run rate: ₹14,55,036
            </div>
          </div>
        </div>

        {/* Usage Analytics */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>🔥 Usage Analytics</h2>
          <div style={styles.usageList}>
            <UsageLine label="Tier 1 Queries" value="45,230" trend="+12%" />
            <UsageLine label="Tier 2 Queries" value="28,940" trend="+8%" />
            <UsageLine label="Tier 3 Queries" value="8,120" trend="+28%" />
            <UsageLine label="Avg Response Time" value="2.3s" trend="-0.5s" />
            <UsageLine label="Cache Hit Rate" value="34%" trend="+5%" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>⚡ Quick Actions</h2>
        <div style={styles.actionGrid}>
          <ActionButton icon="📧" label="Send Campaign" onClick={() => {}} />
          <ActionButton icon="📊" label="Export Report" onClick={() => {}} />
          <ActionButton icon="👥" label="Manage Users" onClick={() => {}} />
          <ActionButton icon="💳" label="Payment History" onClick={() => {}} />
        </div>
      </div>
    </div>
  );
}

function RevenueLine({ label, amount }: any) {
  return (
    <div style={styles.revenueLine}>
      <span>{label}</span>
      <span style={{ color: '#27ae60', fontWeight: 600 }}>{amount}</span>
    </div>
  );
}

function UsageLine({ label, value, trend }: any) {
  const trendColor = trend.includes('-') ? '#e74c3c' : '#27ae60';
  return (
    <div style={styles.usageLine}>
      <div>
        <div style={styles.usageLabel}>{label}</div>
        <div style={styles.usageValue}>{value}</div>
      </div>
      <div style={{ color: trendColor, fontWeight: 600 }}>{trend}</div>
    </div>
  );
}

function ActionButton({ icon, label, onClick }: any) {
  return (
    <button
      style={styles.actionBtn}
      onClick={onClick}
      onMouseOver={(e) => {
        (e.target as HTMLElement).style.transform = 'translateY(-2px)';
        (e.target as HTMLElement).style.boxShadow =
          '0 8px 16px rgba(0, 0, 0, 0.15)';
      }}
      onMouseOut={(e) => {
        (e.target as HTMLElement).style.transform = 'translateY(0)';
        (e.target as HTMLElement).style.boxShadow =
          '0 2px 8px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={styles.actionIcon}>{icon}</div>
      <div style={styles.actionLabel}>{label}</div>
    </button>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
    background: '#f8f9fa',
    minHeight: '100vh',
  },
  header: {
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#333',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666',
  },
  periodSelector: {
    display: 'flex',
    gap: '12px',
    marginBottom: '32px',
  },
  periodBtn: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  periodBtnActive: {
    background: '#667eea',
    color: 'white',
    border: 'none',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  metricCard: {
    background: 'white',
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    borderTop: '4px solid',
  },
  metricIcon: {
    fontSize: '32px',
    marginBottom: '12px',
  },
  metricLabel: {
    fontSize: '12px',
    color: '#999',
    fontWeight: 600,
    marginBottom: '4px',
  },
  metricValue: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#333',
    marginBottom: '4px',
  },
  metricChange: {
    fontSize: '12px',
    color: '#27ae60',
    fontWeight: 500,
  },
  section: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '20px',
    color: '#333',
  },
  userDistribution: {
    display: 'grid',
    gap: '16px',
  },
  userTier: {
    padding: '16px',
    background: '#f8f9fa',
    borderRadius: '8px',
  },
  tierHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  tierTitle: {
    fontWeight: 600,
    color: '#333',
  },
  tierValue: {
    fontWeight: 700,
    color: '#667eea',
  },
  progressBar: {
    background: '#e0e0e0',
    height: '6px',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  progressFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s',
  },
  tierLabel: {
    fontSize: '12px',
    color: '#999',
  },
  campaignTable: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #ddd',
  },
  thCell: {
    padding: '12px',
    textAlign: 'left' as const,
    fontSize: '12px',
    fontWeight: 700,
    color: '#666',
  },
  tableRow: {
    borderBottom: '1px solid #eee',
    transition: 'background 0.2s',
  },
  tdCell: {
    padding: '12px',
    fontSize: '13px',
    color: '#333',
  },
  rateBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    background: '#f0f4ff',
    color: '#667eea',
    borderRadius: '4px',
    fontWeight: 600,
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: '40px',
  },
  twoColGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '24px',
  },
  revenueList: {
    display: 'grid',
    gap: '12px',
  },
  revenueLine: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    padding: '8px 0',
  },
  revenueDivider: {
    height: '1px',
    background: '#ddd',
    margin: '8px 0',
  },
  revenueNote: {
    fontSize: '12px',
    color: '#999',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #eee',
  },
  usageList: {
    display: 'grid',
    gap: '16px',
  },
  usageLine: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #eee',
  },
  usageLabel: {
    fontSize: '13px',
    color: '#999',
    marginBottom: '2px',
  },
  usageValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#333',
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
  },
  actionBtn: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: '#f0f4ff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  actionIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  actionLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
    textAlign: 'center' as const,
  },
};

const DASHBOARD_STYLES = `
  table td, table th {
    text-align: left;
  }

  @media (max-width: 768px) {
    table {
      font-size: 12px;
    }
    th, td {
      padding: 8px !important;
    }
  }
`;
