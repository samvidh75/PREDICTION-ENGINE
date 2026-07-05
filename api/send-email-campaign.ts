/**
 * Send Email Campaign to Multiple Users
 * Batch send promotional emails to user segments
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface CampaignRequest {
  campaignId: string;
  emails: string[];
}

const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;

const campaigns: Record<
  string,
  { subject: string; template: (email: string) => string }
> = {
  upgrade_premium: {
    subject: '⭐ Unlock Premium Features - Special Offer',
    template: (email) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">🚀 Limited Time Offer</h1>
        <p>Hello,</p>
        <p>We're offering <strong>Special Pricing</strong> on Premium subscriptions this week!</p>

        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin: 20px 0;">
          <h2 style="margin: 0;">Premium at ₹299/month</h2>
          <p style="margin: 5px 0;">50 AI calls/day • Portfolio analysis • Export reports</p>
          <a href="https://stockex.com/upgrade?email=${encodeURIComponent(email)}" style="background: white; color: #667eea; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; margin-top: 10px;">
            Upgrade Now
          </a>
        </div>

        <p style="color: #999; font-size: 12px;">
          Not interested? <a href="https://stockex.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea;">Unsubscribe</a>
        </p>
      </div>
    `,
  },

  weekly_digest: {
    subject: '📊 StockEx Weekly Market Digest',
    template: (email) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">📊 Weekly Market Digest</h1>

        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #333;">Market Insights</h3>
          <ul style="font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
            <li><strong>Sensex:</strong> +1.2% | Nifty50: +0.8%</li>
            <li><strong>Top Sectors:</strong> IT, Pharma, Consumer Goods</li>
            <li><strong>Week Ahead:</strong> RBI Policy Decision, Q3 Earnings</li>
          </ul>
        </div>

        <div style="background: #fffbea; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0;">
          <p style="margin: 0;"><strong>💡 Pro Tip:</strong> Use StockEx AI to analyze earnings reports for deeper insights</p>
        </div>

        <p style="text-align: center; margin: 20px 0;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            View Full Analysis →
          </a>
        </p>

        <p style="color: #999; font-size: 12px;">
          <a href="https://stockex.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #667eea;">Unsubscribe</a>
        </p>
      </div>
    `,
  },

  feature_highlight: {
    subject: '✨ New Feature: AI-Powered News Sentiment',
    template: (email) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">✨ New Feature Alert</h1>
        <p>We just launched <strong>AI-Powered News Sentiment Analysis</strong>!</p>

        <div style="background: #f0f4ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0;">What's New:</h3>
          <ul style="font-size: 14px; margin: 0; padding-left: 20px;">
            <li>📰 Real-time news analysis for any stock</li>
            <li>🎯 Bullish/Bearish/Neutral sentiment detection</li>
            <li>📊 Confidence scoring for each analysis</li>
            <li>⚡ Works with Premium plan</li>
          </ul>
        </div>

        <p style="text-align: center; margin: 20px 0;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 10px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Try It Now →
          </a>
        </p>
      </div>
    `,
  },

  reengagement: {
    subject: '👋 We Miss You! Check Out What\'s New',
    template: (email) => `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">👋 Come Back to StockEx!</h1>
        <p>It's been a while. Here's what you've missed:</p>

        <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 16px 0;">
          <p style="margin: 0;"><strong>🆕 New Features Added:</strong></p>
          <ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 14px;">
            <li>Stock Comparison Tool</li>
            <li>Portfolio-Aware AI Analysis</li>
            <li>News Sentiment Tracking</li>
            <li>PDF Report Export</li>
          </ul>
        </div>

        <p style="text-align: center; margin: 20px 0;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Welcome Back →
          </a>
        </p>
      </div>
    `,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { campaignId, emails } = req.body as CampaignRequest;

  if (!campaignId || !emails || emails.length === 0) {
    return res.status(400).json({ error: 'Missing campaignId or emails' });
  }

  try {
    const campaign = campaigns[campaignId];
    if (!campaign) {
      return res.status(400).json({ error: 'Invalid campaign' });
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    // Send to each email
    for (const email of emails) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'noreply@stockex.com',
            to: email,
            subject: campaign.subject,
            html: campaign.template(email),
          }),
        });

        if (response.ok) {
          sent++;
          console.log('[Campaign Email Sent]', {
            campaignId,
            email,
            timestamp: new Date().toISOString(),
          });
        } else {
          failed++;
          errors.push(`Failed: ${email}`);
        }
      } catch (error) {
        failed++;
        errors.push(`Error: ${email}`);
      }

      // Rate limiting: 100 emails per day with Resend free tier
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return res.status(200).json({
      success: failed === 0,
      sent,
      failed,
      errors: errors.slice(0, 5), // Return only first 5 errors
    });
  } catch (error) {
    console.error('[Campaign Error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
