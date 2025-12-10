/**
 * PayPal Button Component
 * 
 * Renders PayPal payment button and handles PayPal SDK integration
 * for the Wool Witch checkout process.
 */

import React, { useRef, useEffect, useState } from 'react';
import { getPayPalConfig, isPayPalConfigured, PayPalErrors } from '../lib/paypalConfig';
import { calculateSubtotal, calculateDeliveryTotal } from '../lib/orderService';
import type { CartItem, OrderAddress, PayPalDetails } from '../types/database';
import type { PayPalNamespace, PayPalCaptureResult } from '../vite-env.d.ts';

interface PayPalButtonProps {
  // Order data
  cartItems: CartItem[];
  customerInfo: {
    email: string;
    fullName: string;
    address: OrderAddress;
  };
  
  // Callbacks
  onSuccess: (paymentData: PayPalPaymentData) => Promise<void>;
  onError: (error: string) => void;
  onCancel?: () => void;
  
  // UI options
  disabled?: boolean;
  className?: string;
  style?: {
    layout?: 'vertical' | 'horizontal';
    color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
    shape?: 'rect' | 'pill';
    height?: number;
  };
}

interface PayPalPaymentData {
  orderID: string;
  payerID: string;
  paymentID?: string;
  details: PayPalDetails;
  captureResult: PayPalCaptureResult;
}

export const PayPalButton: React.FC<PayPalButtonProps> = ({
  cartItems,
  customerInfo,
  onSuccess,
  onError,
  onCancel,
  disabled = false,
  className = '',
  style = {}
}) => {
  const paypalRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate order totals
  const subtotal = calculateSubtotal(cartItems);
  const deliveryTotal = calculateDeliveryTotal(cartItems);
  const total = subtotal + deliveryTotal;

  useEffect(() => {
    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      setError('PayPal is not configured. Please contact support.');
      setIsLoading(false);
      return;
    }

    // Load PayPal SDK
    loadPayPalSDK();
  }, []);

  const loadPayPalSDK = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use the window.loadPayPalSDK function defined in index.html
      if (window.loadPayPalSDK) {
        const paypal = await window.loadPayPalSDK();
        setIsSDKLoaded(true);
        renderPayPalButton(paypal);
      } else {
        throw new Error('PayPal SDK loader not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PayPal SDK';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPayPalButton = (paypal: PayPalNamespace) => {
    if (!paypalRef.current || disabled) return;

    // Clear any existing PayPal button
    paypalRef.current.innerHTML = '';

    const config = getPayPalConfig();

    const buttonStyle = {
      layout: style.layout || 'vertical',
      color: style.color || 'gold',
      shape: style.shape || 'rect',
      height: style.height || 45,
      tagline: false,
      ...style
    };

    paypal.Buttons({
      style: buttonStyle,
      
      createOrder: async (_data: any, actions: any) => {
        try {
          // Validate cart items before creating order
          if (cartItems.length === 0) {
            throw new Error('Cart is empty');
          }

          // Create PayPal order
          return await actions.order.create({
            intent: 'CAPTURE',
            purchase_units: [{
              description: `Wool Witch Order - ${cartItems.length} item(s)`,
              amount: {
                currency_code: config.currency,
                value: total.toFixed(2),
                breakdown: {
                  item_total: {
                    currency_code: config.currency,
                    value: subtotal.toFixed(2)
                  },
                  shipping: {
                    currency_code: config.currency,
                    value: deliveryTotal.toFixed(2)
                  }
                }
              },
              items: cartItems.map(item => ({
                name: item.product.name,
                description: item.product.description?.substring(0, 100),
                unit_amount: {
                  currency_code: config.currency,
                  value: item.product.price.toFixed(2)
                },
                quantity: item.quantity.toString(),
                category: 'PHYSICAL_GOODS'
              })),
              shipping: {
                address: {
                  name: { full_name: customerInfo.fullName },
                  address_line_1: customerInfo.address.address,
                  admin_area_2: customerInfo.address.city,
                  postal_code: customerInfo.address.postcode,
                  country_code: 'GB'
                }
              }
            }],
            application_context: {
              brand_name: 'Wool Witch',
              landing_page: 'BILLING',
              shipping_preference: 'SET_PROVIDED_ADDRESS',
              user_action: 'PAY_NOW'
            }
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create PayPal order';
          onError(errorMessage);
          throw error;
        }
      },

      onApprove: async (data: any, actions: any) => {
        try {
          // Capture the payment
          const captureResult = await actions.order.capture();
          
          // Extract payment details
          const paymentDetails: PayPalDetails = {
            paypal_order_id: data.orderID,
            payer_id: data.payerID,
            payer_email: captureResult.payer?.email_address,
            transaction_id: captureResult.id,
            capture_id: captureResult.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            gross_amount: total,
            fee_amount: 0, // PayPal doesn't provide fee info in capture
            net_amount: total
          };

          // Prepare success data
          const paymentData: PayPalPaymentData = {
            orderID: data.orderID,
            payerID: data.payerID,
            paymentID: captureResult.id,
            details: paymentDetails,
            captureResult
          };

          // Call success handler
          await onSuccess(paymentData);
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
          onError(errorMessage);
        }
      },

      onError: (error: any) => {
        console.error('PayPal error:', error);
        const friendlyMessage = typeof error === 'string' 
          ? PayPalErrors.getErrorMessage(error)
          : 'Payment could not be processed. Please try again.';
        onError(friendlyMessage);
      },

      onCancel: (data: any) => {
        console.log('PayPal payment cancelled:', data);
        if (onCancel) {
          onCancel();
        }
      }
      
    }).render(paypalRef.current);
  };

  // Re-render button when dependencies change
  useEffect(() => {
    if (isSDKLoaded && window.paypal) {
      renderPayPalButton(window.paypal);
    }
  }, [cartItems, customerInfo, disabled]);

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="text-red-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-red-800 font-medium">PayPal Unavailable</p>
            <p className="text-red-600 text-sm">{error}</p>
            <button 
              onClick={loadPayPalSDK}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-lg ${className}`}>
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rose-600"></div>
          <span className="text-gray-600">Loading PayPal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <div ref={paypalRef}></div>
      
      {/* PayPal info */}
      <div className="mt-2 text-xs text-gray-500 text-center">
        Secure payment powered by PayPal
      </div>
    </div>
  );
};

export default PayPalButton;
export type { PayPalPaymentData };