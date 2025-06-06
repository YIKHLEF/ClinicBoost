import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, Lock, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { formatAmount, mockCreatePaymentIntent, mockConfirmPayment } from '../../lib/stripe';
import { paymentErrorHandler } from '../../lib/payment/error-handling';
import { withTimeout } from '../../lib/error-handling';

interface PaymentFormProps {
  amount: number;
  currency?: string;
  patientId: string;
  invoiceId?: string;
  description?: string;
  onSuccess: (paymentId: string) => void;
  onCancel: () => void;
}

interface CardDetails {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  currency = 'MAD',
  patientId,
  invoiceId,
  description,
  onSuccess,
  onCancel,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [cardDetails, setCardDetails] = useState<CardDetails>({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const [errors, setErrors] = useState<Partial<CardDetails>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Monitor network status
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const validateCard = (): boolean => {
    const newErrors: Partial<CardDetails> = {};

    // Card number validation (basic)
    const cardNumber = cardDetails.number.replace(/\s/g, '');
    if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
      newErrors.number = t('payment.invalidCardNumber', 'Invalid card number');
    }

    // Expiry validation
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!cardDetails.expiry || !expiryRegex.test(cardDetails.expiry)) {
      newErrors.expiry = t('payment.invalidExpiry', 'Invalid expiry date (MM/YY)');
    } else {
      const [month, year] = cardDetails.expiry.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        newErrors.expiry = t('payment.expiredCard', 'Card has expired');
      }
    }

    // CVC validation
    if (!cardDetails.cvc || cardDetails.cvc.length < 3 || cardDetails.cvc.length > 4) {
      newErrors.cvc = t('payment.invalidCvc', 'Invalid CVC');
    }

    // Name validation
    if (!cardDetails.name.trim()) {
      newErrors.name = t('payment.nameRequired', 'Cardholder name is required');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCardNumber = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string): string => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return `${v.substring(0, 2)}/${v.substring(2, 4)}`;
    }
    return v;
  };

  const handleInputChange = (field: keyof CardDetails, value: string) => {
    let formattedValue = value;

    if (field === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (field === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (field === 'cvc') {
      formattedValue = value.replace(/[^0-9]/g, '').substring(0, 4);
    }

    setCardDetails(prev => ({
      ...prev,
      [field]: formattedValue,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setPaymentError(null);

    if (!validateCard()) {
      return;
    }

    // Check network connectivity
    if (!isOnline) {
      setPaymentError(t('payment.offlineError', 'Payment requires an internet connection. Please check your connection and try again.'));
      return;
    }

    // Validate payment data
    const validationError = paymentErrorHandler.validatePaymentData({
      amount,
      currency,
      paymentMethodId: 'card', // Mock payment method
    });

    if (validationError) {
      setPaymentError(paymentErrorHandler.getUserMessage(validationError));
      return;
    }

    setIsProcessing(true);

    try {
      // Process payment with comprehensive error handling
      const result = await paymentErrorHandler.processPaymentWithErrorHandling(
        async () => {
          // Create payment intent with timeout
          const paymentIntent = await withTimeout(
            mockCreatePaymentIntent({
              amount: amount * 100, // Convert to cents
              currency: currency.toLowerCase(),
              patientId,
              invoiceId,
              description,
            }),
            30000 // 30 second timeout
          );

          // Confirm payment with timeout
          const confirmResult = await withTimeout(
            mockConfirmPayment(),
            30000 // 30 second timeout
          );

          if (!confirmResult.success) {
            throw new Error('Payment confirmation failed');
          }

          return { paymentIntent, confirmResult };
        },
        {
          timeout: 60000, // 60 second total timeout
          retries: 2,
          retryDelay: 2000
        }
      );

      if (result.success) {
        addToast({
          type: 'success',
          title: t('payment.success', 'Payment Successful'),
          message: t('payment.successMessage', 'Your payment has been processed successfully.'),
        });
        onSuccess(result.data.paymentIntent.id);
      } else if (result.error) {
        const errorMessage = paymentErrorHandler.getUserMessage(result.error);
        setPaymentError(errorMessage);

        addToast({
          type: 'error',
          title: t('payment.failed', 'Payment Failed'),
          message: errorMessage,
        });
      }
    } catch (error: any) {
      const paymentError = paymentErrorHandler.handlePaymentError(error);
      const errorMessage = paymentErrorHandler.getUserMessage(paymentError);

      setPaymentError(errorMessage);
      addToast({
        type: 'error',
        title: t('payment.failed', 'Payment Failed'),
        message: errorMessage,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getCardBrand = (number: string): string => {
    const cleanNumber = number.replace(/\s/g, '');
    
    if (/^4/.test(cleanNumber)) return 'Visa';
    if (/^5[1-5]/.test(cleanNumber)) return 'Mastercard';
    if (/^3[47]/.test(cleanNumber)) return 'American Express';
    if (/^6/.test(cleanNumber)) return 'Discover';
    
    return '';
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
          {isOnline ? (
            <Wifi className="text-green-500" size={16} title={t('payment.online', 'Online')} />
          ) : (
            <WifiOff className="text-red-500" size={16} title={t('payment.offline', 'Offline')} />
          )}
        </div>
      </div>

      {/* Network Status Warning */}
      {!isOnline && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-center">
            <WifiOff className="text-red-500 mr-2" size={16} />
            <span className="text-sm text-red-700 dark:text-red-300">
              {t('payment.offlineWarning', 'No internet connection. Payment processing is not available.')}
            </span>
          </div>
        </div>
      )}

      {/* Payment Error Display */}
      {paymentError && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="text-red-500 mr-2 mt-0.5" size={16} />
            <span className="text-sm text-red-700 dark:text-red-300">
              {paymentError}
            </span>
          </div>
        </div>
      )}

      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('payment.amount', 'Amount')}:
          </span>
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {formatAmount(amount * 100, currency)}
          </span>
        </div>
        {description && (
          <div className="mt-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('payment.cardNumber', 'Card Number')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={cardDetails.number}
              onChange={(e) => handleInputChange('number', e.target.value)}
              placeholder="1234 5678 9012 3456"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.number ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              maxLength={19}
            />
            {cardDetails.number && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-xs font-medium text-gray-500">
                  {getCardBrand(cardDetails.number)}
                </span>
              </div>
            )}
          </div>
          {errors.number && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {errors.number}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('payment.cardholderName', 'Cardholder Name')}
          </label>
          <input
            type="text"
            value={cardDetails.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('payment.namePlaceholder', 'John Doe')}
            className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
              errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              {errors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.expiry', 'Expiry')}
            </label>
            <input
              type="text"
              value={cardDetails.expiry}
              onChange={(e) => handleInputChange('expiry', e.target.value)}
              placeholder="MM/YY"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.expiry ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              maxLength={5}
            />
            {errors.expiry && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.expiry}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.cvc', 'CVC')}
            </label>
            <input
              type="text"
              value={cardDetails.cvc}
              onChange={(e) => handleInputChange('cvc', e.target.value)}
              placeholder="123"
              className={`w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                errors.cvc ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              maxLength={4}
            />
            {errors.cvc && (
              <p className="mt-1 text-sm text-red-600 flex items-center">
                <AlertCircle size={14} className="mr-1" />
                {errors.cvc}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-4">
          <Lock size={12} className="mr-1" />
          {t('payment.secureMessage', 'Your payment information is encrypted and secure')}
        </div>

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
            loading={isProcessing}
            disabled={isProcessing || !isOnline}
            className="flex-1"
          >
            {isProcessing
              ? t('payment.processing', 'Processing...')
              : !isOnline
              ? t('payment.offlineDisabled', 'Payment Unavailable (Offline)')
              : t('payment.payNow', `Pay ${formatAmount(amount * 100, currency)}`)
            }
          </Button>
        </div>
      </form>
    </div>
  );
};
