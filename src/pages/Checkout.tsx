import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import PaymentMethodSelector, { PaymentMethod } from '../components/PaymentMethodSelector';
import PayPalButton, { PayPalPaymentData } from '../components/PayPalButton';
import { createOrder, validateOrderData } from '../lib/orderService';
import type { OrderAddress, CreateOrderData } from '../types/database';

interface CheckoutProps {
  onNavigate: (page: 'shop' | 'cart' | 'checkout') => void;
}

interface OrderDetails {
  email: string;
  fullName: string;
  address: string;
  city: string;
  postcode: string;
  cardNumber: string;
}

interface PaymentState {
  method: PaymentMethod;
  isProcessing: boolean;
  error: string | null;
}

export function Checkout({ onNavigate }: CheckoutProps) {
  const { items, subtotal, deliveryTotal, total, clearCart } = useCart();
  const [isCompleted, setIsCompleted] = useState(false);
  const [completedOrderData, setCompletedOrderData] = useState<{ total: number; email: string; paymentMethod: PaymentMethod } | null>(null);
  const [formData, setFormData] = useState<OrderDetails>({
    email: '',
    fullName: '',
    address: '',
    city: '',
    postcode: '',
    cardNumber: '',
  });
  const [paymentState, setPaymentState] = useState<PaymentState>({
    method: 'card',
    isProcessing: false,
    error: null
  });

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

  // Card payment form submission handler  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (paymentState.method !== 'card') return; // Only handle card payments here
    
    try {
      setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));

      // Mock card processing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const orderData: CreateOrderData = {
        email: formData.email,
        fullName: formData.fullName,
        address: getOrderAddress(),
        cartItems: items.map(item => ({ product: item.product, quantity: item.quantity })),
        paymentMethod: 'card',
        paymentId: `card_${Date.now()}` // Mock card transaction ID
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
        paymentMethod: 'card' 
      });
      setIsCompleted(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setPaymentState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setPaymentState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // PayPal payment success handler
  const handlePayPalSuccess = async (paymentData: PayPalPaymentData) => {
    try {
      setPaymentState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      const orderData: CreateOrderData = {
        email: formData.email,
        fullName: formData.fullName,
        address: getOrderAddress(),
        cartItems: items.map(item => ({ product: item.product, quantity: item.quantity })),
        paymentMethod: 'paypal',
        paymentId: paymentData.paymentID,
        paypalDetails: paymentData.details
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
        paymentMethod: 'paypal' 
      });
      setIsCompleted(true);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Payment processing failed';
      setPaymentState(prev => ({ ...prev, error: errorMessage }));
    } finally {
      setPaymentState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // PayPal payment error handler
  const handlePayPalError = (error: string) => {
    setPaymentState(prev => ({ ...prev, error, isProcessing: false }));
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

            <form onSubmit={handleSubmit} className="space-y-8">
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
                  </div>
                )}

                {/* Card Payment Form */}
                {paymentState.method === 'card' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">Card Number</label>
                      <input
                        type="text"
                        name="cardNumber"
                        value={formData.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\s/g, '');
                          if (value.length <= 16) {
                            const formatted = value.replace(/(\d{4})/g, '$1 ').trim();
                            setFormData((prev) => ({
                              ...prev,
                              cardNumber: formatted,
                            }));
                          }
                        }}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-rose-600 font-mono"
                        placeholder="1234 5678 9012 3456"
                      />
                    </div>

                    <p className="text-sm text-gray-600 mt-4">
                      For testing, use card number: <span className="font-mono font-semibold">4242 4242 4242 4242</span>
                    </p>
                  </div>
                )}

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

              {/* Card Payment Submit Button */}
              {paymentState.method === 'card' && (
                <button
                  type="submit"
                  disabled={paymentState.isProcessing || paymentState.method !== 'card'}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-4 rounded-lg font-semibold transition-colors text-lg"
                >
                  {paymentState.isProcessing ? 'Processing...' : 'Complete Purchase'}
                </button>
              )}
              
              {/* PayPal processing indicator */}
              {paymentState.method === 'paypal' && paymentState.isProcessing && (
                <div className="w-full bg-blue-50 border border-blue-200 text-blue-800 py-4 rounded-lg font-semibold text-lg text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span>Processing PayPal Payment...</span>
                  </div>
                </div>
              )}
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.product.name} x {item.quantity}</span>
                    <span className="font-medium text-gray-900">
                      £{(item.product.price * item.quantity).toFixed(2)}
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
