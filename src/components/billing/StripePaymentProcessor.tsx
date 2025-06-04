import React, { useState, useEffect } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { CreditCard, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatAmount } from '../../lib/stripe';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentProcessorProps {
  amount: number;
  currency: string;
  invoiceId: string;
  patientId: string;
  description?: string;
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface PaymentFormProps extends PaymentProcessorProps {
  clientSecret: string;
}

const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency,
  invoiceId,
  patientId,
  description,
  clientSecret,
  onSuccess,
  onError,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [billingDetails, setBillingDetails] = useState({
    name: '',
    email: '',
    address: {
      line1: '',
      city: '',
      postal_code: '',
      country: 'MA', // Morocco
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    const cardElement = elements.getElement(CardElement);

    if (!cardElement) {
      setPaymentError('Card element not found');
      setIsProcessing(false);
      return;
    }

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: billingDetails,
        },
      });

      if (error) {
        setPaymentError(error.message || 'Payment failed');
        onError(error.message || 'Payment failed');
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        addToast({
          type: 'success',
          title: t('payment.success', 'Payment Successful'),
          message: t('payment.successMessage', 'Your payment has been processed successfully.'),
        });
        onSuccess(paymentIntent.id);
      }
    } catch (err: any) {
      setPaymentError(err.message || 'An unexpected error occurred');
      onError(err.message || 'An unexpected error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: false,
  };

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center space-x-2">
          <CreditCard className="text-primary-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('payment.securePayment', 'Secure Payment')}
          </h2>
          <Lock className="text-green-500" size={16} />
        </div>
      </div>

      {/* Payment Summary */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('payment.amount', 'Amount')}:
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAmount(amount, currency)}
          </span>
        </div>
        {description && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {description}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Billing Details */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.cardholderName', 'Cardholder Name')} *
            </label>
            <input
              type="text"
              value={billingDetails.name}
              onChange={(e) => setBillingDetails(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('payment.namePlaceholder', 'John Doe')}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.email', 'Email')} *
            </label>
            <input
              type="email"
              value={billingDetails.email}
              onChange={(e) => setBillingDetails(prev => ({ ...prev, email: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.address', 'Address')}
            </label>
            <input
              type="text"
              value={billingDetails.address.line1}
              onChange={(e) => setBillingDetails(prev => ({
                ...prev,
                address: { ...prev.address, line1: e.target.value }
              }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder={t('payment.addressPlaceholder', 'Street address')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.city', 'City')}
              </label>
              <input
                type="text"
                value={billingDetails.address.city}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, city: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Casablanca"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('payment.postalCode', 'Postal Code')}
              </label>
              <input
                type="text"
                value={billingDetails.address.postal_code}
                onChange={(e) => setBillingDetails(prev => ({
                  ...prev,
                  address: { ...prev.address, postal_code: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="20000"
              />
            </div>
          </div>
        </div>

        {/* Card Element */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('payment.cardDetails', 'Card Details')} *
          </label>
          <div className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
            <CardElement
              options={cardElementOptions}
              onChange={(event) => {
                setCardComplete(event.complete);
                if (event.error) {
                  setPaymentError(event.error.message);
                } else {
                  setPaymentError(null);
                }
              }}
            />
          </div>
        </div>

        {/* Error Display */}
        {paymentError && (
          <div className="flex items-center space-x-2 text-red-600 text-sm">
            <AlertCircle size={16} />
            <span>{paymentError}</span>
          </div>
        )}

        {/* Security Notice */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Lock size={12} className="mr-1" />
          {t('payment.secureMessage', 'Your payment information is encrypted and secure')}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1"
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          
          <Button
            type="submit"
            disabled={!stripe || !cardComplete || isProcessing || !billingDetails.name || !billingDetails.email}
            loading={isProcessing}
            className="flex-1"
          >
            {isProcessing 
              ? t('payment.processing', 'Processing...')
              : t('payment.payNow', `Pay ${formatAmount(amount, currency)}`)
            }
          </Button>
        </div>
      </form>
    </div>
  );
};

export const StripePaymentProcessor: React.FC<PaymentProcessorProps> = (props) => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    // Create payment intent
    const createPaymentIntent = async () => {
      try {
        setLoading(true);
        
        // In a real application, this would call your backend API
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: props.amount,
            currency: props.currency,
            invoice_id: props.invoiceId,
            patient_id: props.patientId,
            description: props.description,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const { client_secret } = await response.json();
        setClientSecret(client_secret);
      } catch (err: any) {
        setError(err.message || 'Failed to initialize payment');
        props.onError(err.message || 'Failed to initialize payment');
      } finally {
        setLoading(false);
      }
    };

    createPaymentIntent();
  }, [props.amount, props.currency, props.invoiceId, props.patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            {t('payment.initializing', 'Initializing payment...')}
          </p>
        </div>
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-red-600 mb-4">
            {error || t('payment.initializationError', 'Failed to initialize payment')}
          </p>
          <Button onClick={props.onCancel} variant="outline">
            {t('common.goBack', 'Go Back')}
          </Button>
        </div>
      </div>
    );
  }

  const elementsOptions: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe',
      variables: {
        colorPrimary: '#3b82f6',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <PaymentForm {...props} clientSecret={clientSecret} />
    </Elements>
  );
};
