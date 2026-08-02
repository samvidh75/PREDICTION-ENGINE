/**
 * Payment Service — Manual billing stub for StockEX Philippines.
 *
 * Payments are processed manually or via future Stripe integration.
 * This stub stores subscription requests locally and returns a pending status.
 */

import { type SubscriptionPlan } from './premiumTier';

export interface PaymentOptions {
  plan: SubscriptionPlan;
  userId: string;
  email: string;
  phone: string;
  isYearly?: boolean;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  status: 'created' | 'pending' | 'completed' | 'failed';
  userId: string;
  plan: SubscriptionPlan;
  createdAt: number;
}

export interface PaymentResponse {
  success: boolean;
  message: string;
  orderId?: string;
  paymentId?: string;
  error?: string;
}

class PaymentService {
  /**
   * Create a manual billing order reference
   */
  async createOrder(options: PaymentOptions): Promise<{ orderId: string; amount: number }> {
    const orderId = `MANUAL-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amount = options.plan === 'premium' ? 99 : options.plan === 'pro' ? 299 : 0;
    
    // Store pending order in localStorage for manual processing
    if (typeof window !== 'undefined') {
      const pending = JSON.parse(localStorage.getItem('pending_orders') || '[]');
      pending.push({
        orderId,
        amount,
        currency: 'PHP',
        plan: options.plan,
        userId: options.userId,
        email: options.email,
        phone: options.phone,
        status: 'pending',
        createdAt: Date.now(),
      });
      localStorage.setItem('pending_orders', JSON.stringify(pending));
    }

    return { orderId, amount };
  }

  /**
   * Open manual billing instructions (replaces payment modal)
   */
  async openPaymentModal(options: PaymentOptions): Promise<PaymentResponse> {
    try {
      const { orderId, amount } = await this.createOrder(options);

      return {
        success: true,
        message: `Order created: ₱${amount}/mo. Please complete payment via bank transfer to activate your ${options.plan} subscription.`,
        orderId,
      };
    } catch (error) {
      console.error('[Payment Error]', error);
      return {
        success: false,
        message: `Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Verify manual payment (admin workflow)
   */
  async verifyPayment(data: {
    orderId: string;
    paymentId?: string;
    userId: string;
    plan: SubscriptionPlan;
  }): Promise<PaymentResponse> {
    // In a real implementation, this would verify against backend
    return {
      success: true,
      message: `Welcome to StockEX ${data.plan}! Your subscription is now active.`,
      paymentId: data.paymentId || data.orderId,
    };
  }

  /**
   * Cancel subscription via backend
   */
  async cancelSubscription(userId: string): Promise<PaymentResponse> {
    const response = await fetch('/api/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const result = await response.json();

    if (result.success) {
      return {
        success: true,
        message: 'Subscription cancelled. You will have access until end of billing period.',
      };
    } else {
      return {
        success: false,
        message: 'Failed to cancel subscription',
        error: result.error,
      };
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(userId: string): Promise<PaymentOrder[]> {
    const response = await fetch(`/api/payment-history?userId=${userId}`);

    if (!response.ok) {
      return [];
    }

    return response.json();
  }
}

// Export singleton
export const paymentService = new PaymentService();
