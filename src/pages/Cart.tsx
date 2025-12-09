import { Trash2, Plus, Minus, ArrowLeft } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

interface CartProps {
  onNavigate: (page: 'shop' | 'cart' | 'checkout') => void;
}

export function Cart({ onNavigate }: CartProps) {
  const { items, removeItem, updateQuantity, subtotal, deliveryTotal, total } = useCart();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <button
            onClick={() => onNavigate('shop')}
            className="flex items-center space-x-2 text-rose-600 hover:text-rose-700 mb-12 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Continue Shopping</span>
          </button>

          <div className="text-center py-20">
            <div className="mb-6">
              <div className="w-24 h-24 mx-auto bg-rose-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-12 h-12 text-rose-300" />
              </div>
            </div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 mb-2">Your bag is empty</h2>
            <p className="text-gray-600 mb-8">Discover our beautiful handcrafted items and add some to your bag.</p>
            <button
              onClick={() => onNavigate('shop')}
              className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Start Shopping
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
          onClick={() => onNavigate('shop')}
          className="flex items-center space-x-2 text-rose-600 hover:text-rose-700 mb-8 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Continue Shopping</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-8">Shopping Bag</h1>

            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product.id} className="bg-white rounded-xl shadow-md p-6">
                  <div className="grid grid-cols-4 gap-4 items-start">
                    <div className="col-span-1">
                      <img
                        src={item.product.image_url}
                        alt={item.product.name}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    </div>

                    <div className="col-span-2">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">{item.product.category}</p>
                      <p className="text-2xl font-bold text-gray-900">
                        £{item.product.price.toFixed(2)}
                      </p>
                      {item.product.delivery_charge > 0 && (
                        <p className="text-sm text-gray-600">
                          + £{item.product.delivery_charge.toFixed(2)} delivery
                        </p>
                      )}
                    </div>

                    <div className="col-span-1 flex flex-col items-end space-y-3">
                      <button
                        onClick={() => removeItem(item.product.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>

                      <div className="flex items-center space-x-2 border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-4 h-4 text-gray-600" />
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
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

              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-rose-600">£{total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => onNavigate('checkout')}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-lg font-semibold transition-colors mb-3"
              >
                Proceed to Checkout
              </button>

              <button
                onClick={() => onNavigate('shop')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 py-3 rounded-lg font-medium transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
