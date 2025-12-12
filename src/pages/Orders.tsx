import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUserOrders, 
  getOrderItems,
  formatOrderAddress, 
  formatOrderStatus, 
  getOrderStatusColor 
} from '../lib/orderService';
import type { Order } from '../types/database';

export default function Orders() {
  const { isAuthenticated } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({});
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isAuthenticated) {
      loadUserOrders();
    }
  }, [isAuthenticated]);

  const loadUserOrders = async () => {
    try {
      setLoading(true);
      const userOrders = await getUserOrders(50);
      setOrders(userOrders);
    } catch {
      console.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <h2 className="text-2xl font-serif text-gray-900 mb-4">
            Sign in Required
          </h2>
          <p className="text-gray-600 mb-8">
            Please sign in to view your order history.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const loadOrderItems = async (orderId: string) => {
    if (orderItems[orderId]) {
      return; // Already loaded
    }

    setLoadingItems(prev => ({ ...prev, [orderId]: true }));
    try {
      const items = await getOrderItems(orderId);
      setOrderItems(prev => ({ ...prev, [orderId]: items }));
    } catch (error) {
      console.error('Failed to load order items:', error);
      setOrderItems(prev => ({ ...prev, [orderId]: [] }));
    } finally {
      setLoadingItems(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleOrderDetailsToggle = async (order: Order) => {
    const isOpening = selectedOrder?.id !== order.id;
    setSelectedOrder(isOpening ? order : null);
    
    if (isOpening) {
      await loadOrderItems(order.id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-gray-900">My Orders</h1>
          <p className="text-gray-600 mt-2">
            Track your orders and view your purchase history
          </p>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg
                className="mx-auto h-16 w-16"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No orders yet
            </h3>
            <p className="text-gray-500 mb-8">
              You haven&apos;t placed any orders yet. Start shopping to see your orders here!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Orders List */}
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white shadow rounded-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-500">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Placed {formatDate(order.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getOrderStatusColor(
                          order.status
                        )}`}
                      >
                        {formatOrderStatus(order.status)}
                      </span>
                      <span className="text-lg font-semibold text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        Shipping Address
                      </h4>
                      <p className="text-sm text-gray-500">
                        {order.full_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatOrderAddress(order.address as any)}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        Payment Method
                      </h4>
                      <p className="text-sm text-gray-500 capitalize">
                        {order.payment_method === 'paypal' ? 'PayPal' : 'Card'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">
                        Order Total
                      </h4>
                      <p className="text-sm text-gray-500">
                        Subtotal: {formatCurrency(order.subtotal)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Delivery: {formatCurrency(order.delivery_total)}
                      </p>
                      <p className="text-sm font-medium text-gray-900">
                        Total: {formatCurrency(order.total)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleOrderDetailsToggle(order)}
                      className="text-rose-600 hover:text-rose-700 text-sm font-medium"
                    >
                      {selectedOrder?.id === order.id ? 'Hide Details' : 'View Details'}
                    </button>
                    
                    <div className="flex space-x-2">
                      {order.status === 'delivered' && (
                        <button className="bg-rose-100 hover:bg-rose-200 text-rose-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                          Rate Items
                        </button>
                      )}
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                        Contact Support
                      </button>
                    </div>
                  </div>

                  {/* Order Details Expandable Section */}
                  {selectedOrder?.id === order.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">
                        Order Details
                      </h4>
                      
                      {/* Order Items Section */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Order Items
                        </h5>
                        
                        {loadingItems[order.id] ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-rose-600"></div>
                            <span className="ml-2 text-sm text-gray-600">Loading items...</span>
                          </div>
                        ) : orderItems[order.id] && orderItems[order.id].length > 0 ? (
                          <div className="space-y-3">
                            {orderItems[order.id].map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0">
                                <div className="flex-1">
                                  <h6 className="text-sm font-medium text-gray-900">
                                    {item.product_name}
                                  </h6>
                                  <p className="text-xs text-gray-500">
                                    Quantity: {item.quantity} × {formatCurrency(item.product_price)}
                                  </p>
                                  {item.delivery_charge > 0 && (
                                    <p className="text-xs text-gray-500">
                                      Delivery: {formatCurrency(item.delivery_charge)} each
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatCurrency(item.product_price * item.quantity)}
                                  </p>
                                  {item.delivery_charge > 0 && (
                                    <p className="text-xs text-gray-500">
                                      + {formatCurrency(item.delivery_charge * item.quantity)} delivery
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-gray-600">
                            No items found for this order.
                          </p>
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-gray-200 text-xs text-gray-500">
                          <p>Order ID: {order.id}</p>
                          <p>Email: {order.email}</p>
                          <p>Status: {order.status}</p>
                          <p>Payment Method: {order.payment_method}</p>
                        </div>
                      </div>

                      {/* Order Timeline */}
                      <div className="mt-6">
                        <h5 className="text-sm font-medium text-gray-900 mb-3">
                          Order Timeline
                        </h5>
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
                            <div className="ml-3">
                              <p className="text-sm text-gray-900">Order placed</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(order.created_at)}
                              </p>
                            </div>
                          </div>
                          
                          {order.status !== 'pending' && (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-2 h-2 bg-blue-400 rounded-full"></div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-900">Payment confirmed</p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(order.updated_at || order.created_at)}
                                </p>
                              </div>
                            </div>
                          )}

                          {['shipped', 'delivered'].includes(order.status) && (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-2 h-2 bg-purple-400 rounded-full"></div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-900">Order shipped</p>
                                <p className="text-xs text-gray-500">
                                  Estimated delivery: 3-5 business days
                                </p>
                              </div>
                            </div>
                          )}

                          {order.status === 'delivered' && (
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-2 h-2 bg-green-400 rounded-full"></div>
                              <div className="ml-3">
                                <p className="text-sm text-gray-900">Order delivered</p>
                                <p className="text-xs text-gray-500">
                                  {formatDate(order.updated_at || order.created_at)}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}