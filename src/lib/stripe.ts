import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    
    if (!publishableKey) {
      console.warn('Stripe publishable key not found. Payment functionality will be disabled.');
      return Promise.resolve(null);
    }
    
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export default getStripe;

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface CreatePaymentIntentRequest {
  amount: number; // Amount in cents
  currency?: string;
  patientId: string;
  invoiceId?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentMethod {
  id: string;
  type: string;
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

// Note: In a real application, these API calls would go to your backend
// which would then communicate with Stripe's API using your secret key
export const createPaymentIntent = async (
  request: CreatePaymentIntentRequest
): Promise<PaymentIntent> => {
  try {
    // This should be a call to your backend API
    const response = await fetch('/api/payments/create-intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error('Failed to create payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

export const confirmPayment = async (
  clientSecret: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethodId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const createPaymentMethod = async (
  cardElement: any
): Promise<{ paymentMethod?: PaymentMethod; error?: string }> => {
  try {
    const stripe = await getStripe();
    if (!stripe) {
      throw new Error('Stripe not initialized');
    }

    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      return { error: error.message };
    }

    return { paymentMethod };
  } catch (error) {
    console.error('Error creating payment method:', error);
    return { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const retrievePaymentIntent = async (
  paymentIntentId: string
): Promise<PaymentIntent> => {
  try {
    const response = await fetch(`/api/payments/intent/${paymentIntentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to retrieve payment intent');
    }

    return await response.json();
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    throw error;
  }
};

export const processRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<{ success: boolean; refundId?: string; error?: string }> => {
  try {
    const response = await fetch('/api/payments/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId,
        amount,
        reason,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to process refund');
    }

    const result = await response.json();
    return { success: true, refundId: result.id };
  } catch (error) {
    console.error('Error processing refund:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Utility functions for formatting
export const formatAmount = (amount: number, currency: string = 'MAD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'MAD' ? 'USD' : currency, // Fallback since MAD might not be supported
    minimumFractionDigits: 2,
  }).format(amount / 100).replace('$', currency === 'MAD' ? 'MAD ' : '$');
};

export const validateAmount = (amount: number): boolean => {
  return amount > 0 && amount <= 99999999; // Stripe's maximum amount
};

export const getPaymentMethodIcon = (brand: string): string => {
  const icons: Record<string, string> = {
    visa: '💳',
    mastercard: '💳',
    amex: '💳',
    discover: '💳',
    diners: '💳',
    jcb: '💳',
    unionpay: '💳',
  };
  
  return icons[brand.toLowerCase()] || '💳';
};

// Mock functions for development (remove in production)
export const mockCreatePaymentIntent = async (
  request: CreatePaymentIntentRequest
): Promise<PaymentIntent> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return {
    id: `pi_mock_${Date.now()}`,
    amount: request.amount,
    currency: request.currency || 'mad',
    status: 'requires_payment_method',
    client_secret: `pi_mock_${Date.now()}_secret_mock`,
  };
};

export const mockConfirmPayment = async (): Promise<{ success: boolean }> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Simulate 90% success rate
  const success = Math.random() > 0.1;
  return { success };
};
