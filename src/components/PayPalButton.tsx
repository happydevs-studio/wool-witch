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
  const configRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buttonRendered, setButtonRendered] = useState(false);

  // Calculate order totals
  const subtotal = calculateSubtotal(cartItems);
  const deliveryTotal = calculateDeliveryTotal(cartItems);
  const total = subtotal + deliveryTotal;

  useEffect(() => {
    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      // Debug logging for development only
      if (import.meta.env.DEV) {
        console.error('PayPal Configuration Error:', {
          PROD: import.meta.env.PROD,
          hasClientId: !!import.meta.env.VITE_PAYPAL_CLIENT_ID,
          hasProduction: !!import.meta.env.VITE_PAYPAL_CLIENT_ID_PRODUCTION,
          hasSandbox: !!import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX,
        });
      }
      setError('PayPal is not configured. Please contact support.');
      setIsLoading(false);
      return;
    }

    // Load PayPal SDK if not already loaded
    if (!isSDKLoaded && !error) {
      loadPayPalSDK();
    }
  }, []);

  // Re-render button when dependencies change and SDK is loaded
  useEffect(() => {
    if (isSDKLoaded && window.paypal && !disabled && !error) {
      const shouldRerender = 
        !buttonRendered || 
        JSON.stringify(cartItems) !== JSON.stringify(configRef.current?.cartItems) ||
        JSON.stringify(customerInfo) !== JSON.stringify(configRef.current?.customerInfo);
      
      if (shouldRerender) {
        console.log('Re-rendering PayPal button due to dependency change');
        renderPayPalButton(window.paypal);
      }
    }
  }, [isSDKLoaded, cartItems, customerInfo, disabled, error, buttonRendered]);

  const loadPayPalSDK = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get PayPal client ID from configuration
      const config = getPayPalConfig();
      const clientId = config.clientId;

      console.log('Loading PayPal SDK with client ID:', clientId?.substring(0, 10) + '...');

      // Use the window.loadPayPalSDK function defined in index.html
      if (window.loadPayPalSDK) {
        const paypal = await window.loadPayPalSDK(clientId);
        console.log('PayPal SDK loaded successfully');
        setIsSDKLoaded(true);
        renderPayPalButton(paypal);
      } else {
        throw new Error('PayPal SDK loader not available');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load PayPal SDK';
      console.error('PayPal SDK loading error:', err);
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPayPalButton = (paypal: PayPalNamespace) => {
    if (!paypalRef.current || disabled) {
      console.log('PayPal button render skipped:', { hasRef: !!paypalRef.current, disabled });
      return;
    }

    try {
      // Clear any existing PayPal button
      paypalRef.current.replaceChildren();
      setButtonRendered(false);
      console.log('Rendering PayPal button...');

      const config = getPayPalConfig();
      
      // Store current config for comparison
      configRef.current = {
        ...config,
        cartItems: JSON.parse(JSON.stringify(cartItems)),
        customerInfo: JSON.parse(JSON.stringify(customerInfo))
      };

      const buttonStyle = {
        layout: style.layout || 'vertical',
        color: style.color || 'gold',
        shape: style.shape || 'rect',
        height: style.height || 45,
        tagline: false,
        ...style
      };

      console.log('PayPal button style:', buttonStyle);
      console.log('Cart items for PayPal:', cartItems.length, 'items');
      console.log('Total amount:', total);

      const buttonsComponent = paypal.Buttons({
        style: buttonStyle,
      
        createOrder: async (_data: any, actions: any) => {
          try {
            console.log('Creating PayPal order...');
            // Validate cart items before creating order
            if (cartItems.length === 0) {
              throw new Error('Cart is empty');
            }

            // Validate total amount
            if (total <= 0) {
              throw new Error('Invalid order total');
            }

            // Create PayPal order
            const orderData = {
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
                  description: item.product.description?.substring(0, 127) || 'Handmade crochet item',
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
            };
            
            console.log('PayPal order data:', orderData);
            const orderId = await actions.order.create(orderData);
            console.log('PayPal order created:', orderId);
            return orderId;
          } catch (error) {
            console.error('PayPal order creation error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create PayPal order';
            onError(errorMessage);
            throw error;
          }
        },        onApprove: async (data: any, actions: any) => {
          try {
            console.log('PayPal payment approved:', data);
            // Capture the payment
            const captureResult = await actions.order.capture();
            console.log('PayPal payment captured:', captureResult);
            
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
            console.error('PayPal payment processing error:', error);
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
        
      });

      // Render the button and track success
      buttonsComponent.render(paypalRef.current).then(() => {
        console.log('PayPal button rendered successfully');
        setButtonRendered(true);
      }).catch((renderError: any) => {
        console.error('PayPal button render error:', renderError);
        setError('Failed to render PayPal button');
      });

    } catch (error) {
      console.error('PayPal button setup error:', error);
      setError(error instanceof Error ? error.message : 'Failed to setup PayPal button');
    }
  };  // Re-render button when dependencies change
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