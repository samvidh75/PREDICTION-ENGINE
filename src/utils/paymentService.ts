/**
 * Razorpay Payment Integration Service
 * Handle subscription payments for Premium/Pro tiers
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
  private razorpayKey = process.env.REACT_APP_RAZORPAY_KEY_ID;

  /**
   * Initialize Razorpay script
   */
  loadRazorpay(): Promise<any> {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve((window as any).Razorpay);
      document.body.appendChild(script);
    });
  }

  /**
   * Create payment order on backend
   */
  async createOrder(options: PaymentOptions): Promise<{ orderId: string; amount: number }> {
    const response = await fetch('/api/create-payment-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        plan: options.plan,
        userId: options.userId,
        email: options.email,
        phone: options.phone,
        isYearly: options.isYearly || false,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment order');
    }

    return response.json();
  }

  /**
   * Open Razorpay payment modal
   */
  async openPaymentModal(options: PaymentOptions): Promise<PaymentResponse> {
    try {
      // Load Razorpay SDK
      const Razorpay = await this.loadRazorpay();

      // Create order on backend
      const { orderId, amount } = await this.createOrder(options);

      // Open payment modal
      return new Promise((resolve) => {
        const modal = new Razorpay({
          key: this.razorpayKey,
          order_id: orderId,
          amount,
          currency: 'PKR',
          name: 'StockEx Premium',
          description: `${options.plan.charAt(0).toUpperCase() + options.plan.slice(1)} Subscription`,
          image: '/stockex-logo.png', // Add your logo
          prefill: {
            email: options.email,
            contact: options.phone,
          },
          handler: async (response: any) => {
            // Payment successful
            const verification = await this.verifyPayment({
              orderId,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
              userId: options.userId,
              plan: options.plan,
            });

            resolve(verification);
          },
          modal: {
            ondismiss: () => {
              resolve({
                success: false,
                message: 'Payment cancelled by user',
              });
            },
          },
        });

        modal.open();
      });
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
   * Verify payment on backend
   */
  private async verifyPayment(data: {
    orderId: string;
    paymentId: string;
    signature: string;
    userId: string;
    plan: SubscriptionPlan;
  }): Promise<PaymentResponse> {
    const response = await fetch('/api/verify-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      // Payment verified, subscription activated
      return {
        success: true,
        message: `Welcome to StockEx ${data.plan}! Your subscription is now active.`,
        paymentId: data.paymentId,
      };
    } else {
      return {
        success: false,
        message: 'Payment verification failed',
        error: result.error,
      };
    }
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
