/**
 * Send Email Endpoint
 * Sends transactional emails (welcome, etc) and promotional campaigns
 * Uses Resend for free email (100 emails/day free tier)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface EmailRequest {
  to: string;
  templateId: string;
  variables?: Record<string, string>;
}

const RESEND_API_KEY = process.env.REACT_APP_RESEND_API_KEY;
const FROM_EMAIL = 'noreply@stockex.com';

// Email templates
const templates: Record<string, (vars?: any) => { subject: string; html: string }> = {
  welcome: (vars) => ({
    subject: '🎉 Welcome to StockEx Premium AI!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">Welcome to StockEx! 🎉</h1>
        <p>Hi ${vars?.userName || 'there'},</p>
        <p>We're excited to have you join StockEx Premium AI. Get started with:</p>
        <ul style="font-size: 14px; line-height: 1.8;">
          <li>💰 3-tier AI routing for optimal responses</li>
          <li>👤 Portfolio-aware analysis</li>
          <li>⚖️ Stock comparison tool</li>
          <li>📊 50+ technical indicators</li>
          <li>📰 Real-time news sentiment</li>
        </ul>
        <p style="text-align: center; margin-top: 30px;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Start Analyzing →
          </a>
        </p>
      </div>
    `,
  }),

  upgrade_premium: () => ({
    subject: '⭐ Unlock Portfolio-Aware AI Analysis',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">Unlock Premium Features ⭐</h1>
        <p>You're using StockEx, but missing premium features.</p>
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center;">
          <h2 style="margin: 0;">Just ₹299/month</h2>
          <p>50 AI calls/day + Portfolio analysis + Export reports</p>
          <a href="https://stockex.com/upgrade" style="background: white; color: #667eea; padding: 12px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
            Upgrade Now
          </a>
        </div>
      </div>
    `,
  }),

  weekly_digest: () => ({
    subject: '📊 Your Weekly Market Digest',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">📊 Weekly Market Digest</h1>
        <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">
          <h3>This Week's Highlights:</h3>
          <ul style="font-size: 14px;">
            <li>📈 Tech stocks show strength</li>
            <li>📰 RBI holds interest rates</li>
            <li>💼 Strong Q3 earnings season</li>
          </ul>
        </div>
        <p style="text-align: center; margin-top: 20px;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Analysis →
          </a>
        </p>
      </div>
    `,
  }),

  reengagement: () => ({
    subject: '👋 We Miss You at StockEx',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #667eea;">We miss you! 👋</h1>
        <p>It's been a while. Check out new features:</p>
        <ul style="font-size: 14px;">
          <li>✨ AI stock analysis</li>
          <li>📊 Real-time news sentiment</li>
          <li>⚖️ Stock comparison tool</li>
        </ul>
        <p style="text-align: center; margin: 20px 0;">
          <a href="https://stockex.com/dashboard" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Welcome Back →
          </a>
        </p>
      </div>
    `,
  }),
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, templateId, variables } = req.body as EmailRequest;

  if (!to || !templateId) {
    return res.status(400).json({ error: 'Missing email or template' });
  }

  try {
    const template = templates[templateId];
    if (!template) {
      return res.status(400).json({ error: 'Invalid template' });
    }

    const { subject, html } = template(variables);

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[Resend Error]', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const data = await response.json();

    // Log email for tracking
    console.log('[Email Sent]', {
      to,
      templateId,
      messageId: data.id,
      sentAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      messageId: data.id,
    });
  } catch (error) {
    console.error('[Send Email Error]', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
