/**
 * Admin Panel
 * Central hub for admin functions: analytics, campaigns, settings
 */

import { useState } from 'react';
import AdminAnalyticsDashboard from './AdminAnalyticsDashboard';
import EmailCampaignManager from './EmailCampaignManager';

type Tab = 'dashboard' | 'campaigns' | 'settings';

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isAdmin] = useState(true); // Check auth in production

  if (!isAdmin) {
    return (
      <div style={styles.unauthorizedContainer}>
        <div style={styles.unauthorizedBox}>
          <div style={styles.icon}>🔒</div>
          <h2 style={styles.heading}>Access Denied</h2>
          <p style={styles.message}>You don't have permission to access the admin panel</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          <div style={styles.logo}>
            <span style={styles.logoIcon}>📊</span>
            <span>StockEx Admin</span>
          </div>

          <div style={styles.tabs}>
            {(['dashboard', 'campaigns', 'settings'] as const).map((tab) => (
              <button
                key={tab}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === tab ? styles.tabBtnActive : {}),
                }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'dashboard' && '📊 Dashboard'}
                {tab === 'campaigns' && '📧 Campaigns'}
                {tab === 'settings' && '⚙️ Settings'}
              </button>
            ))}
          </div>

          <div style={styles.userInfo}>
            <span style={styles.userIcon}>👤</span>
            <span style={styles.userName}>Admin</span>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={styles.content}>
        {activeTab === 'dashboard' && <AdminAnalyticsDashboard />}
        {activeTab === 'campaigns' && <EmailCampaignManager />}
        {activeTab === 'settings' && <AdminSettingsPanel />}
      </div>
    </div>
  );
}

function AdminSettingsPanel() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSaveSettings = () => {
    localStorage.setItem('adminSettings', JSON.stringify({ apiKey }));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={settingsStyles.container}>
      <style>{`${SETTINGS_STYLES}`}</style>

      <h1 style={settingsStyles.title}>⚙️ Admin Settings</h1>

      {/* Email Service Settings */}
      <div style={settingsStyles.section}>
        <h2 style={settingsStyles.sectionTitle}>📧 Email Service</h2>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Resend API Key</label>
          <div style={settingsStyles.inputGroup}>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="re_xxxxxxxxxxxxxxxx"
              style={settingsStyles.input}
            />
            <button
              style={settingsStyles.toggleBtn}
              onClick={() => setShowKey(!showKey)}
            >
              {showKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <p style={settingsStyles.hint}>
            Get your API key from <a href="https://resend.com" style={settingsStyles.link}>Resend.com</a> (Free tier: 100 emails/day)
          </p>
        </div>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Email Sending Status</label>
          <div style={settingsStyles.status}>
            <span style={settingsStyles.statusDot}></span>
            <span>✅ Connected (Free tier active)</span>
          </div>
        </div>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Daily Email Limit</label>
          <div style={settingsStyles.usage}>
            <div style={settingsStyles.usageBar}>
              <div style={settingsStyles.usageFill}></div>
            </div>
            <p style={settingsStyles.usageText}>45 / 100 emails sent today</p>
          </div>
        </div>
      </div>

      {/* Automation Settings */}
      <div style={settingsStyles.section}>
        <h2 style={settingsStyles.sectionTitle}>🤖 Automation</h2>

        <div style={settingsStyles.automationList}>
          <AutomationToggle
            label="Weekly Market Digest"
            description="Send every Monday at 9:00 AM"
            enabled={true}
          />
          <AutomationToggle
            label="Premium Upgrade Offer"
            description="Send to free users every Friday at 10:00 AM"
            enabled={true}
          />
          <AutomationToggle
            label="Re-engagement Campaign"
            description="Send to inactive users every Sunday at 8:00 AM"
            enabled={false}
          />
        </div>
      </div>

      {/* Data & Privacy */}
      <div style={settingsStyles.section}>
        <h2 style={settingsStyles.sectionTitle}>🔐 Data & Privacy</h2>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Unsubscribe Rate</label>
          <div style={settingsStyles.stat}>1.2% (35 unsubscribes)</div>
        </div>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Bounce Rate</label>
          <div style={settingsStyles.stat}>0.3% (9 bounces)</div>
        </div>

        <div style={settingsStyles.setting}>
          <label style={settingsStyles.label}>Data Retention</label>
          <div style={settingsStyles.stat}>90 days (email logs)</div>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={settingsStyles.section}>
        <h2 style={settingsStyles.sectionTitle}>⚠️ Danger Zone</h2>

        <button style={settingsStyles.dangerBtn}>
          🗑️ Clear Email Logs
        </button>
        <button style={settingsStyles.dangerBtn}>
          ⏹️ Stop All Campaigns
        </button>
      </div>

      {/* Save Button */}
      <div style={settingsStyles.actionBar}>
        <button
          style={settingsStyles.saveBtn}
          onClick={handleSaveSettings}
        >
          💾 Save Settings
        </button>
        {saved && <span style={settingsStyles.savedMsg}>✅ Saved!</span>}
      </div>
    </div>
  );
}

function AutomationToggle({ label, description, enabled }: any) {
  const [isEnabled, setIsEnabled] = useState(enabled);

  return (
    <div style={settingsStyles.automationItem}>
      <div>
        <div style={settingsStyles.automationLabel}>{label}</div>
        <div style={settingsStyles.automationDesc}>{description}</div>
      </div>
      <button
        style={{
          ...settingsStyles.toggleSwitch,
          ...(isEnabled ? settingsStyles.toggleSwitchOn : {}),
        }}
        onClick={() => setIsEnabled(!isEnabled)}
      >
        {isEnabled ? '✓' : '○'}
      </button>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  nav: {
    background: '#1a1a2e',
    color: 'white',
    padding: '0',
    width: '100%',
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  navContent: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logo: {
    fontSize: '18px',
    fontWeight: 700,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  logoIcon: {
    fontSize: '24px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    justifyContent: 'center',
  },
  tabBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#aaa',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    color: 'white',
    background: 'rgba(102, 126, 234, 0.2)',
    borderRadius: '6px',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  userIcon: {
    fontSize: '18px',
  },
  userName: {},
  content: {
    flex: 1,
    marginTop: '60px',
    overflow: 'auto',
  },
  unauthorizedContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: '#f8f9fa',
  },
  unauthorizedBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: '64px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#333',
  },
  message: {
    color: '#666',
    fontSize: '14px',
  },
};

const settingsStyles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    marginBottom: '32px',
    color: '#333',
  },
  section: {
    background: 'white',
    padding: '24px',
    borderRadius: '8px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 700,
    marginBottom: '16px',
    color: '#333',
  },
  setting: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  inputGroup: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
  },
  toggleBtn: {
    padding: '10px 12px',
    border: '1px solid #ddd',
    background: '#f8f9fa',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  hint: {
    fontSize: '12px',
    color: '#999',
    marginTop: '4px',
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
  },
  status: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    background: '#d4edda',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#155724',
  },
  statusDot: {
    display: 'inline-block',
    width: '8px',
    height: '8px',
    background: '#28a745',
    borderRadius: '50%',
  },
  usage: {
    marginTop: '8px',
  },
  usageBar: {
    height: '8px',
    background: '#eee',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px',
  },
  usageFill: {
    height: '100%',
    width: '45%',
    background: 'linear-gradient(90deg, #667eea, #764ba2)',
  },
  usageText: {
    fontSize: '12px',
    color: '#999',
    margin: 0,
  },
  automationList: {
    display: 'grid',
    gap: '12px',
  },
  automationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '6px',
  },
  automationLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
  },
  automationDesc: {
    fontSize: '12px',
    color: '#999',
    marginTop: '2px',
  },
  toggleSwitch: {
    width: '40px',
    height: '24px',
    borderRadius: '12px',
    border: 'none',
    background: '#ddd',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s',
  },
  toggleSwitchOn: {
    background: '#27ae60',
    color: 'white',
  },
  stat: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#333',
    padding: '8px 0',
  },
  dangerBtn: {
    display: 'block',
    width: '100%',
    padding: '12px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '13px',
    marginBottom: '8px',
  },
  actionBar: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    marginTop: '32px',
  },
  saveBtn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
  savedMsg: {
    color: '#27ae60',
    fontWeight: 600,
    fontSize: '13px',
  },
};

const SETTINGS_STYLES = `
  a {
    color: #667eea;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
`;
