/**
 * Premium Features Showcase
 * Display all premium features and tier comparison
 */

export default function PremiumFeaturesShowcase() {
  return (
    <div style={styles.container}>
      <style>{`${SHOWCASE_STYLES}`}</style>

      {/* Hero Section */}
      <div style={styles.hero}>
        <h1 style={styles.heroTitle}>Unlock Premium AI Analysis</h1>
        <p style={styles.heroSubtitle}>
          Get intelligent stock insights powered by advanced AI models
        </p>
      </div>

      {/* Feature Grid */}
      <div style={styles.featureGrid}>
        <FeatureCard
          icon="🧠"
          title="Portfolio-Aware AI"
          description="AI analyzes your specific holdings and gives personalized recommendations"
        />
        <FeatureCard
          icon="⚖️"
          title="Stock Comparison"
          description="Compare 2-3 stocks side-by-side with AI-powered insights"
        />
        <FeatureCard
          icon="📄"
          title="Export Reports"
          description="Generate professional PDF reports to share with others"
        />
        <FeatureCard
          icon="📰"
          title="News Sentiment"
          description="AI analyzes stock-related news sentiment in real-time"
        />
        <FeatureCard
          icon="💾"
          title="Cached Responses"
          description="40-60% faster responses with smart response caching"
        />
        <FeatureCard
          icon="🔔"
          title="Custom Alerts"
          description="Set up to 100 price and technical analysis alerts"
        />
      </div>

      {/* Tier Comparison */}
      <div style={styles.comparisonSection}>
        <h2 style={styles.comparisonTitle}>Choose Your Plan</h2>

        <div style={styles.comparisonTable}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.featureCol}>Feature</th>
                <th style={styles.tierCol}>Free</th>
                <th style={styles.tierCol}>Premium</th>
                <th style={styles.tierCol}>Pro</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={styles.featureName}>Tier 3 (Groq) Calls/Day</td>
                <td style={styles.tierData}>5</td>
                <td style={styles.tierData}>50</td>
                <td style={styles.tierData}>200</td>
              </tr>
              <tr>
                <td style={styles.featureName}>Portfolio Analysis</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>✓</td>
                <td style={styles.tierData}>✓</td>
              </tr>
              <tr>
                <td style={styles.featureName}>Stock Comparison</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>✓</td>
                <td style={styles.tierData}>✓</td>
              </tr>
              <tr>
                <td style={styles.featureName}>Export Reports</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>✓</td>
                <td style={styles.tierData}>✓</td>
              </tr>
              <tr>
                <td style={styles.featureName}>News Sentiment</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>✓</td>
                <td style={styles.tierData}>✓</td>
              </tr>
              <tr>
                <td style={styles.featureName}>Custom Alerts</td>
                <td style={styles.tierData}>3</td>
                <td style={styles.tierData}>20</td>
                <td style={styles.tierData}>100</td>
              </tr>
              <tr>
                <td style={styles.featureName}>API Access</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>—</td>
                <td style={styles.tierData}>✓</td>
              </tr>
              <tr style={styles.priceRow}>
                <td style={styles.featureName}>Monthly Price</td>
                <td style={styles.tierData}>₹0</td>
                <td style={styles.tierData}>₹299</td>
                <td style={styles.tierData}>₹799</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Why Premium */}
      <div style={styles.whySection}>
        <h2 style={styles.whyTitle}>Why Go Premium?</h2>

        <div style={styles.whyGrid}>
          <WhyCard
            number="1"
            title="10x More Valuable"
            description="Get personalized AI analysis based on YOUR portfolio and holdings"
          />
          <WhyCard
            number="2"
            title="40-60% Faster"
            description="Smart caching remembers answers to similar questions"
          />
          <WhyCard
            number="3"
            title="Professional Grade"
            description="Export analysis as PDF reports to share with others"
          />
          <WhyCard
            number="4"
            title="Real-Time Insights"
            description="AI analyzes news sentiment and market trends instantly"
          />
        </div>
      </div>

      {/* CTA Section */}
      <div style={styles.ctaSection}>
        <h2 style={styles.ctaTitle}>Ready to Level Up?</h2>
        <p style={styles.ctaText}>Start with Premium for ₹299/month and unlock all features</p>
        <button style={styles.ctaButton}>Upgrade Now</button>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: any) {
  return (
    <div style={styles.featureCard}>
      <div style={styles.featureIcon}>{icon}</div>
      <h3 style={styles.featureTitle}>{title}</h3>
      <p style={styles.featureDescription}>{description}</p>
    </div>
  );
}

function WhyCard({ number, title, description }: any) {
  return (
    <div style={styles.whyCard}>
      <div style={styles.whyNumber}>{number}</div>
      <h3 style={styles.whyCardTitle}>{title}</h3>
      <p style={styles.whyCardDesc}>{description}</p>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 24px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '60px',
  },
  heroTitle: {
    fontSize: '36px',
    fontWeight: 700,
    marginBottom: '12px',
    color: '#333',
  },
  heroSubtitle: {
    fontSize: '18px',
    color: '#666',
    maxWidth: '600px',
    margin: '0 auto',
  },
  featureGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '24px',
    marginBottom: '60px',
  },
  featureCard: {
    padding: '24px',
    background: 'white',
    border: '1px solid #eee',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.3s',
  },
  featureIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  featureTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#333',
  },
  featureDescription: {
    fontSize: '13px',
    color: '#666',
    lineHeight: '1.6',
  },
  comparisonSection: {
    marginBottom: '60px',
  },
  comparisonTitle: {
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '32px',
    color: '#333',
  },
  comparisonTable: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  },
  featureCol: {
    padding: '16px',
    textAlign: 'left',
    fontWeight: 600,
    background: '#f8f9fa',
    borderBottom: '2px solid #667eea',
  },
  tierCol: {
    padding: '16px',
    textAlign: 'center',
    fontWeight: 600,
    background: '#f8f9fa',
    borderBottom: '2px solid #667eea',
  },
  featureName: {
    padding: '12px 16px',
    fontWeight: 500,
    borderBottom: '1px solid #eee',
  },
  tierData: {
    padding: '12px 16px',
    textAlign: 'center',
    borderBottom: '1px solid #eee',
  },
  priceRow: {
    fontWeight: 700,
    background: '#f0f4ff',
  },
  whySection: {
    marginBottom: '60px',
  },
  whyTitle: {
    fontSize: '28px',
    fontWeight: 700,
    textAlign: 'center',
    marginBottom: '32px',
    color: '#333',
  },
  whyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '24px',
  },
  whyCard: {
    padding: '24px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: '12px',
    textAlign: 'center',
  },
  whyNumber: {
    fontSize: '36px',
    fontWeight: 700,
    marginBottom: '12px',
    opacity: 0.5,
  },
  whyCardTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '8px',
  },
  whyCardDesc: {
    fontSize: '13px',
    lineHeight: '1.6',
    opacity: 0.9,
  },
  ctaSection: {
    textAlign: 'center',
    padding: '40px',
    background: '#f0f4ff',
    borderRadius: '12px',
  },
  ctaTitle: {
    fontSize: '24px',
    fontWeight: 700,
    marginBottom: '8px',
    color: '#333',
  },
  ctaText: {
    fontSize: '14px',
    color: '#666',
    marginBottom: '20px',
  },
  ctaButton: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '14px',
  },
};

const SHOWCASE_STYLES = `
  @media (max-width: 768px) {
    table {
      font-size: 12px;
    }
    th, td {
      padding: 8px !important;
    }
  }
`;
