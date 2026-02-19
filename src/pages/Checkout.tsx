import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import PaymentMethodSelector, { PaymentMethod } from '../components/PaymentMethodSelector';
import PayPalButton, { PayPalPaymentData } from '../components/PayPalButton';
// StripeCardPayment not needed since card payment is hidden
// import StripeCardPayment from '../components/StripeCardPayment';
import { createOrder, validateOrderData, getEffectivePrice } from '../lib/orderService';
import type { OrderAddress, CreateOrderData } from '../types/database';
// StripeDetails not needed since card payment is hidden
// import type { StripeDetails } from '../types/database';

interface CheckoutProps {
  onNavigate: (page: 'shop' | 'cart' | 'checkout') => void;
}

interface OrderDetails {
  email: string;
  fullName: string;
  address: string;
  city: string;
  postcode: string;
}

// StripePaymentData interface - Not used since card payment is hidden
// TODO: Re-enable when Stripe is ready to be used
/*
interface StripePaymentData {
  paymentIntentId: string;
  paymentMethodId: string;
  last4: string;
  brand: string;
  clientSecret: string;
}
*/

interface PaymentState {
  method: PaymentMethod;
  isProcessing: boolean;
  error: string | null;
}

export function Checkout({ onNavigate }: CheckoutProps) {
  const { items, subtotal, deliveryTotal, total, clearCart, cleanupCart } = useCart();
  const { user } = useAuth();
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState<{ total: number; email: string; paymentMethod: PaymentMethod } | null>(null);
  const [formData, setFormData] = useState<OrderDetails>({
    email: '',
    fullName: '',
    address: '',
    city: '',
    postcode: '',
  });
  const [paymentState, setPaymentState] = useState<PaymentState>({
    method: 'paypal', // Default to PayPal since card payment is hidden
    isProcessing: false,
    error: null
  });

  // Auto-populate email when user is logged in
  useEffect(() => {
    if (user?.email && !formData.email) {
      setFormData(prev => ({
        ...prev,
        email: user.email!
      }));
    }
  }, [user?.email, formData.email]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Helper to create address object
  const getOrderAddress = (): OrderAddress => ({
    address: formData.address,
    city: formData.city,
    postcode: formData.postcode
  });

  // Common payment success handler
  const handlePaymentSuccess = async (
    paymentMethod: 'card' | 'paypal',
    paymentId: string,
    paymentDetails?: any
  ) => {
    try {
      setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      const orderData: CreateOrderData = {
        email: formData.email,
        fullName: formData.fullName,
        address: getOrderAddress(),
        cartItems: items.map(item => ({ product: item.product, quantity: item.quantity })),
        paymentMethod,
        paymentId,
        ...(paymentMethod === 'paypal' ? { paypalDetails: paymentDetails } : { stripeDetails: paymentDetails })
      };

      // Validate order data
      const validationErrors = validateOrderData(orderData);
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join(', '));
      }

      // Create order in database
      await createOrder(orderData);
      
      // Clear cart and show success
      clearCart();
      setCompletedOrderData({ 
        total, 
        email: formData.email, 
        paymentMethod 
      });
      setIsCompleted(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setPaymentState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setPaymentState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // Stripe payment success handler - Not used since card payment is hidden
  // TODO: Re-enable when Stripe is ready to be used
  /*
  const handleStripeSuccess = async (paymentData: StripePaymentData) => {
    const stripeDetails: StripeDetails = {
      payment_intent_id: paymentData.paymentIntentId,
      payment_method_id: paymentData.paymentMethodId,
      last_four: paymentData.last4,
      card_brand: paymentData.brand,
      // client_secret intentionally excluded - not stored for security
    };

    await handlePaymentSuccess('card', paymentData.paymentIntentId, stripeDetails);
  };
  */

  // PayPal payment success handler
  const handlePayPalSuccess = async (paymentData: PayPalPaymentData) => {
    await handlePaymentSuccess('paypal', paymentData.paymentID, paymentData.details);
  };

  // Common payment error handler
  const handlePaymentError = (error: string) => {
    setPaymentState(prev => ({ ...prev, error, isProcessing: false }));
  };

  // Stripe payment error handler - Not used since card payment is hidden
  // TODO: Re-enable when Stripe is ready to be used
  // const handleStripeError = handlePaymentError;

  // PayPal payment error handler
  const handlePayPalError = handlePaymentError;

  // Handle cart cleanup for invalid products
  const handleCartCleanup = async () => {
    try {
      const removedCount = await cleanupCart();
      if (removedCount > 0) {
        setPaymentState(prev => ({ 
          ...prev, 
          error: null 
        }));
        // Show success message or refresh the page
        window.location.reload();
      } else {
        // If no items were removed, clear the entire cart
        clearCart();
        onNavigate('shop');
      }
    } catch (error) {
      console.error('Error cleaning up cart:', error);
      // Fallback: clear entire cart
      clearCart();
      onNavigate('shop');
    }
  };

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-4">Order Confirmed!</h1>
            <p className="text-xl text-gray-600 mb-8">
              Thank you for your purchase. We'll send you a confirmation email shortly.
            </p>
            <div className="bg-white rounded-xl shadow-md p-8 mb-8">
              <p className="text-gray-600 mb-4">Order Total</p>
              <p className="text-4xl font-bold text-rose-600 mb-6">£{(completedOrderData?.total || total).toFixed(2)}</p>
              <div className="flex items-center justify-center space-x-2 mb-4">
                <span className="text-sm text-gray-600">Paid with</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
                  {completedOrderData?.paymentMethod === 'paypal' ? 'PayPal' : 'Card'}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-4">Confirmation email sent to</p>
              <p className="font-medium text-gray-900">{completedOrderData?.email || formData.email}</p>
            </div>
            <button
              onClick={() => {
                onNavigate('shop');
                setIsCompleted(false);
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-lg font-semibold transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => onNavigate('cart')}
          className="flex items-center space-x-2 text-rose-600 hover:text-rose-700 mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cart</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-8">Checkout</h1>

            <div className="space-y-8">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Shipping Information</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600"
                      placeholder="John Doe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">City</label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600"
                        placeholder="London"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Postcode</label>
                      <input
                        type="text"
                        name="postcode"
                        value={formData.postcode}
                        onChange={handleInputChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600"
                        placeholder="SW1A 1AA"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <PaymentMethodSelector
                  selectedMethod={paymentState.method}
                  onMethodChange={(method) => setPaymentState(prev => ({ ...prev, method, error: null }))}
                  disabled={paymentState.isProcessing}
                  className="mb-6"
                />

                {/* Error message display */}
                {paymentState.error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-800 font-medium">Payment Error</span>
                    </div>
                    <p className="text-red-600 text-sm mt-1">{paymentState.error}</p>
                    
                    {/* Show cleanup button for cart-related errors */}
                    {paymentState.error.includes('cart') && paymentState.error.includes('no longer available') && (
                      <div className="mt-3 flex space-x-2">
                        <button
                          onClick={handleCartCleanup}
                          className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          Clean Up Cart
                        </button>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          Refresh Page
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Card Payment Form - Hidden for now */}
                {/* TODO: Re-enable when Stripe is ready to be used
                {paymentState.method === 'card' && (
                  <div className="space-y-4">
                    {formData.email && formData.fullName && formData.address && formData.city && formData.postcode ? (
                      <StripeCardPayment
                        cartItems={items.map(item => ({ product: item.product, quantity: item.quantity }))}
                        customerInfo={{
                          email: formData.email,
                          fullName: formData.fullName,
                          address: getOrderAddress()
                        }}
                        onSuccess={handleStripeSuccess}
                        onError={handleStripeError}
                        disabled={paymentState.isProcessing}
                        className="mt-4"
                      />
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          Please fill in all shipping information above to enable card payment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                */}

                {/* PayPal Payment */}
                {paymentState.method === 'paypal' && (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-600 mb-4">
                      <p>You will be redirected to PayPal to complete your payment securely.</p>
                    </div>
                    
                    {/* Form validation check for PayPal */}
                    {formData.email && formData.fullName && formData.address && formData.city && formData.postcode ? (
                      <PayPalButton
                        cartItems={items.map(item => ({ product: item.product, quantity: item.quantity }))}
                        customerInfo={{
                          email: formData.email,
                          fullName: formData.fullName,
                          address: getOrderAddress()
                        }}
                        onSuccess={handlePayPalSuccess}
                        onError={handlePayPalError}
                        disabled={paymentState.isProcessing}
                        className="mt-4"
                      />
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          Please fill in all shipping information above to enable PayPal payment.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PayPal processing indicator */}
              {paymentState.method === 'paypal' && paymentState.isProcessing && (
                <div className="w-full bg-blue-50 border border-blue-200 text-blue-800 py-4 rounded-lg font-semibold text-lg text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Processing PayPal Payment...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                {items.map((item, index) => (
                  <div key={`${item.product.id}-${index}`} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.product.name} x {item.quantity}</span>
                    <span className="font-medium text-gray-900">
                      £{(getEffectivePrice(item) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">£{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery</span>
                  <span className="font-medium text-gray-900">£{deliveryTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-rose-600">£{total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
