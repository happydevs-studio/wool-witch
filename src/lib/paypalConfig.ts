/**
 * PayPal Configuration Utility
 * 
 * Handles PayPal SDK configuration for different environments
 * and provides type-safe configuration options.
 */

// PayPal environment types
export type PayPalEnvironment = 'sandbox' | 'production';
export type PayPalIntent = 'capture' | 'authorize';
export type PayPalCurrency = 'GBP' | 'USD' | 'EUR';

// PayPal configuration interface
export interface PayPalConfig {
  clientId: string;
  environment: PayPalEnvironment;
  currency: PayPalCurrency;
  intent: PayPalIntent;
}

/**
 * Get PayPal client ID based on current environment
 */
export const getPayPalClientId = (): string => {
  const isProduction = import.meta.env.VITE_APP_ENV === 'production';
  
  const clientId = isProduction 
    ? import.meta.env.VITE_PAYPAL_CLIENT_ID_PRODUCTION
    : import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX;

  if (!clientId) {
    throw new Error(
      `PayPal client ID not configured for ${isProduction ? 'production' : 'sandbox'} environment. ` +
      `Expected ${isProduction ? 'VITE_PAYPAL_CLIENT_ID_PRODUCTION' : 'VITE_PAYPAL_CLIENT_ID_SANDBOX'} to be set.`
    );
  }

  return clientId;
};

/**
 * Get PayPal environment setting
 */
export const getPayPalEnvironment = (): PayPalEnvironment => {
  return import.meta.env.VITE_APP_ENV === 'production' ? 'production' : 'sandbox';
};

/**
 * Check if PayPal is properly configured
 */
export const isPayPalConfigured = (): boolean => {
  try {
    getPayPalClientId();
    return true;
  } catch {
    return false;
  }
};

/**
 * Get complete PayPal configuration
 */
export const getPayPalConfig = (): PayPalConfig => {
  return {
    clientId: getPayPalClientId(),
    environment: getPayPalEnvironment(),
    currency: 'GBP', // Wool Witch uses GBP
    intent: 'capture', // Immediate payment capture
  };
};

/**
 * Generate PayPal SDK URL with query parameters
 */
export const getPayPalSDKUrl = (additionalOptions: Record<string, string> = {}): string => {
  const config = getPayPalConfig();
  
  const params = new URLSearchParams({
    'client-id': config.clientId,
    currency: config.currency,
    intent: config.intent,
    ...additionalOptions,
  });

  return `https://www.paypal.com/sdk/js?${params.toString()}`;
};

/**
 * PayPal development and testing utilities
 */
export const PayPalTestUtils = {
  /**
   * Check if we're in sandbox mode
   */
  isSandbox: (): boolean => getPayPalEnvironment() === 'sandbox',

  /**
   * Get test buyer credentials for sandbox testing
   */
  getTestBuyer: () => ({
    email: 'buyer@example.com',
    password: 'test123456',
    note: 'Use these credentials for PayPal sandbox testing'
  }),

  /**
   * Log PayPal configuration for debugging (development only)
   */
  logConfig: (): void => {
    if (import.meta.env.DEV) {
      console.log('PayPal Configuration:', {
        environment: getPayPalEnvironment(),
        currency: 'GBP',
        intent: 'capture',
        configured: isPayPalConfigured()
      });
    }
  }
};

/**
 * PayPal error handling utilities
 */
export const PayPalErrors = {
  /**
   * Common PayPal error messages and their user-friendly versions
   */
  getErrorMessage: (error: string): string => {
    const errorMap: Record<string, string> = {
      'PAYER_ACTION_REQUIRED': 'Please complete the payment in the PayPal window.',
      'INSTRUMENT_DECLINED': 'Your payment method was declined. Please try a different payment method.',
      'PAYER_CANNOT_PAY': 'Payment cannot be processed with this PayPal account. Please try a different account.',
      'PAYEE_ACCOUNT_RESTRICTED': 'Payment cannot be processed at this time. Please try again later.',
      'COMPLIANCE_VIOLATION': 'Payment cannot be processed. Please contact customer support.',
      'ORDER_NOT_APPROVED': 'Payment was not approved. Please try again.',
      'RESOURCE_NOT_FOUND': 'Payment session expired. Please start checkout again.',
    };

    return errorMap[error] || 'Payment could not be processed. Please try again or use an alternative payment method.';
  },

  /**
   * Check if error is recoverable (user can retry)
   */
  isRecoverable: (error: string): boolean => {
    const recoverableErrors = [
      'PAYER_ACTION_REQUIRED',
      'ORDER_NOT_APPROVED',
      'RESOURCE_NOT_FOUND'
    ];
    return recoverableErrors.includes(error);
  }
};