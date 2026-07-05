/**
 * Email Campaign Manager
 * Create and send promotional email campaigns to users
 */

import { useState } from 'react';

interface Campaign {
  id: string;
  name: string;
  description: string;
  templateId: string;
}

const PREDEFINED_CAMPAIGNS: Campaign[] = [
  {
    id: 'upgrade_premium',
    name: 'Premium Upgrade',
    description: 'Promote Premium plan to free users',
    templateId: 'upgrade_premium',
  },
  {
    id: 'weekly_digest',
    name: 'Weekly Market Digest',
    description: 'Send market insights and analysis to all users',
    templateId: 'weekly_digest',
  },
  {
    id: 'feature_highlight',
    name: 'Feature Highlight',
    description: 'Announce new features to users',
    templateId: 'feature_highlight',
  },
  {
    id: 'reengagement',
    name: 'Re-engagement Campaign',
    description: 'Target inactive users (30+ days no activity)',
    templateId: 'reengagement',
  },
];

export default function EmailCampaignManager() {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [audience, setAudience] = useState<'free' | 'premium' | 'pro' | 'all'>('free');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [estimatedCount, setEstimatedCount] = useState(0);

  const audienceDescriptions = {
    free: 'Free tier users (2,500+ users)',
    premium: 'Premium subscribers (312 users)',
    pro: 'Pro tier users (35 users)',
    all: 'All users (2,847 users)',
  };

  const handleAudienceChange = (newAudience: typeof audience) => {
    setAudience(newAudience);
    const counts: Record<typeof audience, number> = {
      free: 2500,
      premium: 312,
      pro: 35,
      all: 2847,
    };
    let count = counts[newAudience];
    if (includeInactive && newAudience === 'free') {
      count = Math.floor(count * 0.3); // ~30% are inactive
    }
    setEstimatedCount(count);
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) {
      alert('Please select a campaign');
      return;
    }

    if (estimatedCount === 0) {
      alert('No users to send to');
      return;
    }

    if (
      !window.confirm(
        `Send "${selectedCampaign.name}" to approximately ${estimatedCount.toLocaleString()} users?\n\nThis cannot be undone.`
      )
    ) {
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Step 1: Get user emails
      const usersResponse = await fetch(`/api/get-users-by-tier?tier=${audience}&inactive=${includeInactive}`);
      if (!usersResponse.ok) throw new Error('Failed to fetch users');
      const { emails } = await usersResponse.json();

      if (emails.length === 0) {
        throw new Error('No users found for this audience');
      }

      // Step 2: Send campaign
      const sendResponse = await fetch('/api/send-email-campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: selectedCampaign.templateId,
          emails,
        }),
      });

      if (!sendResponse.ok) throw new Error('Failed to send campaign');
      const data = await sendResponse.json();

      setResult({
        success: true,
        message: `✅ Campaign sent! ${data.sent} emails sent, ${data.failed} failed`,
      });
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={styles.container}>
      <style>{`${CAMPAIGN_STYLES}`}</style>

      <h1 style={styles.title}>📧 Email Campaign Manager</h1>
      <p style={styles.subtitle}>Create and send promotional campaigns to your user base</p>

      <div style={styles.grid}>
        {/* Campaign Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 1: Select Campaign</h2>

          <div style={styles.campaignList}>
            {PREDEFINED_CAMPAIGNS.map((campaign) => (
              <div
                key={campaign.id}
                style={{
                  ...styles.campaignItem,
                  ...(selectedCampaign?.id === campaign.id ? styles.campaignItemSelected : {}),
                }}
                onClick={() => setSelectedCampaign(campaign)}
              >
                <div style={styles.campaignName}>{campaign.name}</div>
                <div style={styles.campaignDesc}>{campaign.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Audience Selection */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 2: Choose Audience</h2>

          <div style={styles.audienceList}>
            {(['free', 'premium', 'pro', 'all'] as const).map((tier) => (
              <div key={tier} style={styles.audienceOption}>
                <input
                  type="radio"
                  name="audience"
                  value={tier}
                  checked={audience === tier}
                  onChange={() => handleAudienceChange(tier)}
                  style={styles.radio}
                />
                <div>
                  <div style={styles.audienceLabel}>
                    {tier.charAt(0).toUpperCase() + tier.slice(1).toUpperCase()}
                  </div>
                  <div style={styles.audienceDesc}>{audienceDescriptions[tier]}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Inactive Users Filter */}
          <div style={styles.filterOption}>
            <input
              type="checkbox"
              checked={includeInactive}
              onChange={(e) => {
                setIncludeInactive(e.target.checked);
                handleAudienceChange(audience);
              }}
              style={styles.checkbox}
            />
            <label>Only include inactive users (30+ days no activity)</label>
          </div>
        </div>

        {/* Preview & Send */}
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 3: Review & Send</h2>

          {selectedCampaign && (
            <div style={styles.preview}>
              <div style={styles.previewLabel}>Campaign</div>
              <div style={styles.previewValue}>{selectedCampaign.name}</div>

              <div style={styles.previewLabel}>Target Audience</div>
              <div style={styles.previewValue}>
                {audience.toUpperCase()}
                {includeInactive ? ' (Inactive only)' : ''}
              </div>

              <div style={styles.previewLabel}>Estimated Recipients</div>
              <div style={styles.previewValue}>{estimatedCount.toLocaleString()} users</div>

              <div style={styles.previewLabel}>Email Size</div>
              <div style={styles.previewValue}>~25 KB</div>

              <div style={styles.estimatedCost}>
                <p style={styles.costLabel}>📧 Email Service</p>
                <p style={styles.costValue}>Resend (Free tier: 100/day)</p>
                <p style={styles.costNote}>
                  Estimated delivery: {Math.ceil(estimatedCount / 100)} days
                </p>
              </div>

              <button
                style={styles.sendBtn}
                onClick={handleSendCampaign}
                disabled={sending || !selectedCampaign}
              >
                {sending ? 'Sending...' : '🚀 Send Campaign'}
              </button>
            </div>
          )}

          {result && (
            <div style={{ ...styles.result, ...(result.success ? styles.resultSuccess : styles.resultError) }}>
              {result.message}
            </div>
          )}
        </div>
      </div>

      {/* Email Schedule */}
      <div style={styles.scheduleSection}>
        <h2 style={styles.sectionTitle}>📅 Automated Campaign Schedule</h2>

        <div style={styles.scheduleGrid}>
          <ScheduleCard
            day="Every Monday"
            campaign="Weekly Market Digest"
            audience="All Users"
            icon="📊"
          />
          <ScheduleCard
            day="Every Friday"
            campaign="Premium Upgrade Offer"
            audience="Free Users"
            icon="⭐"
          />
          <ScheduleCard
            day="Every Sunday"
            campaign="Re-engagement Campaign"
            audience="Inactive (30+ days)"
            icon="👋"
          />
        </div>
      </div>

      {/* Campaign History */}
      <div style={styles.historySection}>
        <h2 style={styles.sectionTitle}>📜 Recent Campaigns</h2>

        <table style={styles.historyTable}>
          <thead>
            <tr style={styles.historyHeader}>
              <th style={styles.historyCell}>Campaign</th>
              <th style={styles.historyCell}>Sent Date</th>
              <th style={styles.historyCell}>Recipients</th>
              <th style={styles.historyCell}>Open Rate</th>
              <th style={styles.historyCell}>Click Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr style={styles.historyRow}>
              <td style={styles.historyCell}>Feature Highlight</td>
              <td style={styles.historyCell}>Dec 3, 2024</td>
              <td style={styles.historyCell}>120</td>
              <td style={styles.historyCell}>43%</td>
              <td style={styles.historyCell}>15%</td>
            </tr>
            <tr style={styles.historyRow}>
              <td style={styles.historyCell}>Weekly Digest</td>
              <td style={styles.historyCell}>Dec 2, 2024</td>
              <td style={styles.historyCell}>2,847</td>
              <td style={styles.historyCell}>42%</td>
              <td style={styles.historyCell}>12%</td>
            </tr>
            <tr style={styles.historyRow}>
              <td style={styles.historyCell}>Premium Upgrade</td>
              <td style={styles.historyCell}>Nov 28, 2024</td>
              <td style={styles.historyCell}>2,500</td>
              <td style={styles.historyCell}>40%</td>
              <td style={styles.historyCell}>8%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScheduleCard({ day, campaign, audience, icon }: any) {
  return (
    <div style={styles.scheduleCard}>
      <div style={styles.scheduleIcon}>{icon}</div>
      <div style={styles.scheduleDay}>{day}</div>
      <div style={styles.scheduleCampaign}>{campaign}</div>
      <div style={styles.scheduleAudience}>{audience}</div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '1000px',
    margin: '0 auto',
    background: '#f8f9fa',
    minHeight: '100vh',
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
    marginBottom: '32px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
    marginBottom: '32px',
  },
  section: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#333',
  },
  campaignList: {
    display: 'grid',
    gap: '12px',
  },
  campaignItem: {
    padding: '16px',
    border: '2px solid #eee',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  campaignItemSelected: {
    border: '2px solid #667eea',
    background: '#f0f4ff',
  },
  campaignName: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#333',
  },
  campaignDesc: {
    fontSize: '12px',
    color: '#999',
  },
  audienceList: {
    display: 'grid',
    gap: '12px',
    marginBottom: '16px',
  },
  audienceOption: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid #eee',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  radio: {
    cursor: 'pointer',
  },
  audienceLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  audienceDesc: {
    fontSize: '12px',
    color: '#999',
  },
  filterOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px',
    fontSize: '13px',
  },
  checkbox: {
    cursor: 'pointer',
  },
  preview: {
    background: '#f8f9fa',
    padding: '16px',
    borderRadius: '6px',
  },
  previewLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#999',
    marginTop: '12px',
  },
  previewValue: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '12px',
  },
  estimatedCost: {
    background: '#fffbea',
    padding: '12px',
    borderRadius: '6px',
    marginTop: '16px',
    borderLeft: '4px solid #ffc107',
  },
  costLabel: {
    fontSize: '12px',
    fontWeight: 600,
    margin: '0 0 4px 0',
    color: '#333',
  },
  costValue: {
    fontSize: '13px',
    margin: '0 0 4px 0',
    color: '#666',
  },
  costNote: {
    fontSize: '11px',
    color: '#999',
    margin: '0',
  },
  sendBtn: {
    width: '100%',
    padding: '12px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    marginTop: '16px',
    fontSize: '14px',
  },
  result: {
    marginTop: '16px',
    padding: '12px 16px',
    borderRadius: '6px',
    fontSize: '13px',
  },
  resultSuccess: {
    background: '#d4edda',
    color: '#155724',
    border: '1px solid #c3e6cb',
  },
  resultError: {
    background: '#f8d7da',
    color: '#721c24',
    border: '1px solid #f5c6cb',
  },
  scheduleSection: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  scheduleGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  scheduleCard: {
    padding: '16px',
    background: '#f0f4ff',
    borderRadius: '8px',
    textAlign: 'center' as const,
    border: '1px solid #ddd',
  },
  scheduleIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  scheduleDay: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
    marginBottom: '4px',
  },
  scheduleCampaign: {
    fontSize: '12px',
    color: '#667eea',
    fontWeight: 600,
    marginBottom: '4px',
  },
  scheduleAudience: {
    fontSize: '11px',
    color: '#999',
  },
  historySection: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  historyTable: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  historyHeader: {
    background: '#f8f9fa',
    borderBottom: '2px solid #ddd',
  },
  historyRow: {
    borderBottom: '1px solid #eee',
  },
  historyCell: {
    padding: '12px',
    fontSize: '13px',
  },
};

const CAMPAIGN_STYLES = `
  @media (max-width: 768px) {
    table {
      font-size: 12px;
    }
    th, td {
      padding: 8px !important;
    }
  }
`;
