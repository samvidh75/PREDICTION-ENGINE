/**
 * Email Service
 * Send promotional and transactional emails to users
 * Uses Resend for free email (100 emails/day free tier)
 */

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  type: 'promotional' | 'welcome' | 'digest' | 'reengagement';
}

export interface EmailCampaign {
  id: string;
  templateId: string;
  audience: 'all' | 'free' | 'premium' | 'pro';
  scheduledFor?: number;
  status: 'draft' | 'scheduled' | 'sent' | 'failed';
  sentAt?: number;
  stats: {
    totalSent: number;
    opened: number;
    clicked: number;
    unsubscribed: number;
  };
}

export interface EmailLog {
  id: string;
  userId: string;
  email: string;
  campaignId: string;
  sentAt: number;
  opened: boolean;
  clicked: boolean;
  bounced: boolean;
}

class EmailService {
  private resendApiKey = process.env.REACT_APP_RESEND_API_KEY;
  private fromEmail = 'noreply@stockex.com';

  /**
   * Email templates for different campaigns
   */
  getTemplates(): Record<string, EmailTemplate> {
    return {
      welcome: {
        id: 'welcome',
        name: 'Welcome to StockEx',
        subject: '🎉 Welcome to StockEx Premium AI!',
        type: 'welcome',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Welcome to StockEx! 🎉</h1>
            <p>Hi there,</p>
            <p>We're excited to have you join StockEx Premium AI, your intelligent stock market companion powered by advanced AI.</p>

            <h2 style="color: #333;">Get started with these features:</h2>
            <ul style="font-size: 14px; line-height: 1.8;">
              <li>💰 3-tier AI routing for optimal responses</li>
              <li>👤 Portfolio-aware analysis</li>
              <li>⚖️ Stock comparison tool</li>
              <li>📊 50+ technical indicators</li>
              <li>📰 Real-time news sentiment analysis</li>
            </ul>

            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Next steps:</strong></p>
              <p>1. Add your portfolio to get personalized insights</p>
              <p>2. Ask the AI anything about stocks</p>
              <p>3. Compare stocks side-by-side</p>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Start Analyzing →
              </a>
            </p>

            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Questions? Reply to this email or visit our support center.
            </p>
          </div>
        `,
      },

      upgrade_premium: {
        id: 'upgrade_premium',
        name: 'Upgrade to Premium',
        subject: '⭐ Unlock Portfolio-Aware AI Analysis',
        type: 'promotional',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">Unlock Premium Features ⭐</h1>
            <p>You're using StockEx, but you're only seeing the basics.</p>

            <h2 style="color: #333;">With Premium, you'll get:</h2>
            <ul style="font-size: 14px; line-height: 1.8;">
              <li>✓ 50 AI calls/day (vs 5)</li>
              <li>✓ Portfolio-aware recommendations</li>
              <li>✓ Stock comparison tool</li>
              <li>✓ Export professional reports</li>
              <li>✓ News sentiment analysis</li>
            </ul>

            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h2 style="margin: 0;">Just ₹299/month</h2>
              <p style="margin: 10px 0; font-size: 14px;">That's 10 rupees a day for enterprise-grade analysis</p>
              <a href="https://stockex.com/upgrade" style="background: white; color: #667eea; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-top: 10px;">
                Upgrade Now
              </a>
            </div>

            <p style="color: #999; font-size: 12px;">
              Still have questions? <a href="https://stockex.com/pricing" style="color: #667eea;">View pricing details</a>
            </p>
          </div>
        `,
      },

      weekly_digest: {
        id: 'weekly_digest',
        name: 'Weekly Market Digest',
        subject: '📊 Your Weekly Market Analysis',
        type: 'digest',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">📊 Weekly Market Digest</h1>

            <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <h3 style="margin-top: 0;">This Week's Highlights:</h3>
              <ul style="font-size: 14px; line-height: 1.8;">
                <li><strong>📈 Top Gainers:</strong> IT sector shows strength</li>
                <li><strong>📰 Market News:</strong> RBI signals interest rate hold</li>
                <li><strong>💼 Earnings:</strong> TCS reports strong Q3 growth</li>
              </ul>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0;">
              <p style="margin: 0;"><strong>⚡ Pro Tip:</strong> Use our AI to analyze earnings reports for deeper insights</p>
            </div>

            <p style="text-align: center; margin-top: 20px;">
              <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Full Analysis →
              </a>
            </p>
          </div>
        `,
      },

      reengagement: {
        id: 'reengagement',
        name: 'We Miss You!',
        subject: '👋 We Miss You at StockEx',
        type: 'reengagement',
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #667eea;">We miss you! 👋</h1>
            <p>It's been a while since you've visited StockEx.</p>

            <p>A lot has changed:</p>
            <ul style="font-size: 14px; line-height: 1.8;">
              <li>✨ New AI features for better analysis</li>
              <li>📊 Real-time news sentiment tracking</li>
              <li>⚖️ Stock comparison tool</li>
              <li>📈 50+ indicators for technical analysis</li>
            </ul>

            <p style="text-align: center; margin: 30px 0;">
              <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
                Welcome Back →
              </a>
            </p>

            <p style="color: #999; font-size: 12px;">
              You can also <a href="https://stockex.com/unsubscribe" style="color: #667eea;">unsubscribe</a> if you'd prefer not to hear from us.
            </p>
          </div>
        `,
      },
    };
  }

  /**
   * Send promotional email to a list of users
   */
  async sendCampaign(campaignId: string, userEmails: string[]): Promise<{
    success: boolean;
    sent: number;
    failed: number;
    errors: string[];
  }> {
    try {
      // Send emails in batches (Resend free tier: 100/day)
      const batchSize = 50;
      const batches: string[][] = [];

      for (let i = 0; i < userEmails.length; i += batchSize) {
        batches.push(userEmails.slice(i, i + batchSize));
      }

      let totalSent = 0;
      let totalFailed = 0;
      const errorsList: string[] = [];

      for (const batch of batches) {
        const response = await fetch('/api/send-email-campaign', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campaignId,
            emails: batch,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          totalSent += data.sent;
          totalFailed += data.failed;
          if (data.errors && Array.isArray(data.errors)) {
            errorsList.push(...data.errors);
          }
        } else {
          errorsList.push(`Batch failed: ${response.statusText}`);
          totalFailed += batch.length;
        }

        // Rate limiting: wait between batches
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return {
        success: totalFailed === 0,
        sent: totalSent,
        failed: totalFailed,
        errors: errorsList,
      };
    } catch (error) {
      console.error('[Email Campaign Error]', error);
      return {
        success: false,
        sent: 0,
        failed: userEmails.length,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Schedule promotional emails for free tier users
   */
  async schedulePromotionalCampaigns(): Promise<void> {
    try {
      // Get free tier users
      const response = await fetch('/api/get-users-by-tier?tier=free');
      if (!response.ok) throw new Error('Failed to fetch free users');

      const { users } = await response.json();
      const emails = users.map((u: any) => u.email);

      // Send upgrade promotion
      await this.sendCampaign('upgrade_premium', emails);

      // Schedule weekly digest for all users
      await this.sendCampaign('weekly_digest', emails);

      console.log('[Email] Campaigns scheduled successfully');
    } catch (error) {
      console.error('[Email Scheduling Error]', error);
    }
  }

  /**
   * Send welcome email on signup
   */
  async sendWelcomeEmail(email: string, userName: string = 'Friend'): Promise<boolean> {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          templateId: 'welcome',
          variables: { userName },
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[Welcome Email Error]', error);
      return false;
    }
  }

  /**
   * Get email statistics
   */
  async getStats(campaignId: string): Promise<{
    sent: number;
    opened: number;
    clicked: number;
    openRate: number;
    clickRate: number;
  }> {
    try {
      const response = await fetch(`/api/email-stats?campaignId=${campaignId}`);
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    } catch (error) {
      console.error('[Stats Error]', error);
      return { sent: 0, opened: 0, clicked: 0, openRate: 0, clickRate: 0 };
    }
  }
}

export const emailService = new EmailService();
