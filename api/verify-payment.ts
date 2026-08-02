/**
 * Verify Razorpay Payment
 * Verify payment signature and activate subscription
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface VerifyRequest {
  orderId: string;
  paymentId: string;
  signature: string;
  userId: string;
  plan: 'premium' | 'pro';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId, paymentId, signature, userId, plan } = req.body as VerifyRequest;

  if (!orderId || !paymentId || !signature || !userId || !plan) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Verify Razorpay signature
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.warn('[Payment Verification Failed]', {
        userId,
        orderId,
        paymentId,
        reason: 'Invalid signature',
      });

      return res.status(400).json({
        success: false,
        error: 'Payment verification failed: Invalid signature',
      });
    }

    // Signature verified - activate subscription
    // TODO: Update user subscription in database
    // const subscription = await activateSubscription(userId, plan);

    console.log('[Payment Verified]', {
      orderId,
      paymentId,
      userId,
      plan,
      verifiedAt: new Date().toISOString(),
    });

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      subscription: {
        userId,
        plan,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  } catch (error) {
    console.error('[Payment Verification Error]', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
}
