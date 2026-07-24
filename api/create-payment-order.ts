/**
 * Create Razorpay Payment Order
 * Backend endpoint to create orders for payment processing
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

interface OrderRequest {
  plan: 'premium' | 'pro';
  userId: string;
  email: string;
  phone: string;
  isYearly?: boolean;
}

const PLAN_PRICING: Record<string, { monthly: number; yearly?: number }> = {
  premium: {
    monthly: 29900, // 299 PKR in paise
    yearly: 249900, // 2499 PKR in paise
  },
  pro: {
    monthly: 79900, // 799 PKR in paise
    yearly: 699900, // 6999 PKR in paise
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { plan, userId, email, phone, isYearly } = req.body as OrderRequest;

  if (!plan || !userId || !email || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!PLAN_PRICING[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const pricing = PLAN_PRICING[plan];
    const amount = isYearly ? pricing.yearly : pricing.monthly;

    // Call Razorpay API to create order
    const auth = Buffer.from(
      `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
    ).toString('base64');

    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount,
        currency: 'PKR',
        receipt: `order_${userId}_${Date.now()}`,
        notes: {
          userId,
          email,
          plan,
          isYearly: isYearly ? 'true' : 'false',
        },
      }),
    });

    if (!orderResponse.ok) {
      const error = await orderResponse.text();
      console.error('[Razorpay Order Error]', error);
      return res.status(500).json({
        error: 'Failed to create payment order',
      });
    }

    const order = await orderResponse.json();

    // Log order creation for analytics
    console.log('[Payment Order Created]', {
      orderId: order.id,
      userId,
      plan,
      amount,
      createdAt: new Date().toISOString(),
    });

    return res.status(200).json({
      orderId: order.id,
      amount,
    });
  } catch (error) {
    console.error('[Create Order Error]', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
