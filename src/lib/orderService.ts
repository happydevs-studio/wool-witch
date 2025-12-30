/**
 * Order Service - Order Management and Calculation Utilities
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { supabase } from './supabase';
import { validateCartProducts, logCartValidation } from './cartDebug';
import type { 
  Order, 
  Payment, 
  CreateOrderData, 
  OrderSummary, 
  CartItem,
  OrderAddress,
  PayPalDetails,
  StripeDetails
} from '../types/database';

// ========================================
// ORDER CALCULATION UTILITIES
// ========================================

export function calculateSubtotal(cartItems: CartItem[]): number {
  return cartItems.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0);
}

export function calculateDeliveryTotal(cartItems: CartItem[]): number {
  return cartItems.reduce((total, item) => {
    const deliveryCharge = item.product.delivery_charge || 0;
    return total + (deliveryCharge * item.quantity);
  }, 0);
}

export function calculateTotal(cartItems: CartItem[]): number {
  return calculateSubtotal(cartItems) + calculateDeliveryTotal(cartItems);
}

export function getOrderSummary(cartItems: CartItem[]): OrderSummary {
  const subtotal = calculateSubtotal(cartItems);
  const deliveryTotal = calculateDeliveryTotal(cartItems);
  const total = subtotal + deliveryTotal;
  
  return {
    subtotal,
    deliveryTotal,
    total,
    itemCount: cartItems.reduce((count, item) => count + item.quantity, 0)
  };
}

export function validateCartTotals(
  cartItems: CartItem[],
  expectedSubtotal: number,
  expectedDelivery: number,
  expectedTotal: number
): boolean {
  const actualSubtotal = calculateSubtotal(cartItems);
  const actualDelivery = calculateDeliveryTotal(cartItems);
  const actualTotal = calculateTotal(cartItems);
  
  const subtotalMatch = Math.abs(actualSubtotal - expectedSubtotal) < 0.01;
  const deliveryMatch = Math.abs(actualDelivery - expectedDelivery) < 0.01;
  const totalMatch = Math.abs(actualTotal - expectedTotal) < 0.01;
  
  return subtotalMatch && deliveryMatch && totalMatch;
}

// ========================================
// ORDER CREATION SERVICES
// ========================================

export async function createOrder(orderData: CreateOrderData): Promise<Order> {
  const { cartItems, paymentMethod, paymentId, paypalDetails, stripeDetails, ...customerInfo } = orderData;

  // Validate cart products before proceeding
  await logCartValidation(cartItems);
  const validation = await validateCartProducts(cartItems);
  
  if (!validation.valid) {
    // Log validation errors in development only
    if (import.meta.env.DEV) {
      console.error('Invalid cart items detected:', validation.errors);
    }
    
    // Instead of throwing an error, suggest automatic cleanup
    throw new Error(
      'Some products in your cart are no longer available and need to be removed. ' +
      'Please clear your cart and re-add the items, or refresh the page to automatically clean up invalid items.'
    );
  }

  const subtotal = calculateSubtotal(cartItems);
  const deliveryTotal = calculateDeliveryTotal(cartItems);
  const total = subtotal + deliveryTotal;

  try {
    const { data: order, error: orderError } = await (supabase as any)
      .from('orders')
      .insert({
        user_id: (await supabase.auth.getUser()).data.user?.id || null,
        email: customerInfo.email,
        full_name: customerInfo.fullName,
        address: customerInfo.address as any,
        subtotal,
        delivery_total: deliveryTotal,
        total,
        status: 'pending',
        payment_method: paymentMethod
      } as any)
      .select()
      .single();

    if (orderError || !order) {
      // Log error details only in development
      if (import.meta.env.DEV) {
        console.error('Order creation error:', orderError);
      }
      throw new Error('Failed to create order. Please try again.');
    }

    const orderItems = cartItems.map(item => ({
      order_id: (order as any).id,
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: item.product.price,
      quantity: item.quantity,
      delivery_charge: item.product.delivery_charge || 0
    }));

    const { error: itemsError } = await (supabase as any)
      .from('order_items')
      .insert(orderItems as any);

    if (itemsError) {
      // Log error details only in development
      if (import.meta.env.DEV) {
        console.error('Order items creation error:', itemsError);
      }
      
      // Clean up the order if items failed
      await (supabase as any).from('orders').delete().eq('id', (order as any).id);
      
      // Provide user-friendly error message based on error code
      // Check for specific PostgreSQL error codes for better error handling
      const errorCode = itemsError.code;
      const errorMsg = itemsError.message || '';
      
      if (errorCode === '23503' || errorMsg.includes('foreign key constraint')) {
        // PostgreSQL error code 23503 = foreign_key_violation
        throw new Error('One or more products in your cart are no longer available. Please refresh the page and try again.');
      }
      throw new Error('Failed to process order items. Please try again.');
    }

    if (paymentId) {
      const paymentData = {
        order_id: (order as any).id,
        payment_method: paymentMethod,
        payment_id: paymentId,
        status: paymentMethod === 'paypal' ? 'completed' : (paymentMethod === 'card' ? 'completed' : 'pending'),
        amount: total,
        currency: 'GBP',
        paypal_details: paypalDetails || null,
        stripe_details: stripeDetails || null
      };

      const { error: paymentError } = await (supabase as any)
        .from('payments')
        .insert(paymentData as any);

      if (paymentError) {
        // Log error details only in development
        if (import.meta.env.DEV) {
          console.error('Payment record creation error:', paymentError);
        }
      }
    }

    return order as unknown as Order;

  } catch (error) {
    // Log error details only in development
    if (import.meta.env.DEV) {
      console.error('Error creating order:', error);
    }
    throw error;
  }
}

/**
 * Get order items for a specific order
 */
export async function getOrderItems(orderId: string): Promise<any[]> {
  try {
    const { data, error } = await (supabase as any)
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) {
      // Log error details only in development
      if (import.meta.env.DEV) {
        console.error('Error fetching order items:', error);
      }
      throw new Error('Failed to fetch order items');
    }

    return data || [];
  } catch (error) {
    // Log error details only in development
    if (import.meta.env.DEV) {
      console.error('Error in getOrderItems:', error);
    }
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  const { error } = await (supabase as any)
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (error) {
    throw new Error(`Failed to update order status: ${error.message}`);
  }
}

export async function createPaymentRecord(
  orderId: string, 
  paymentMethod: 'card' | 'paypal',
  paymentId: string,
  amount: number,
  status: Payment['status'] = 'completed',
  paypalDetails?: PayPalDetails,
  stripeDetails?: StripeDetails
): Promise<void> {
  const paymentData = {
    order_id: orderId,
    payment_method: paymentMethod,
    payment_id: paymentId,
    status,
    amount,
    currency: 'GBP',
    paypal_details: paypalDetails || null,
    stripe_details: stripeDetails || null
  };

  const { error } = await (supabase as any)
    .from('payments')
    .insert(paymentData as any);

  if (error) {
    throw new Error(`Failed to create payment record: ${error.message}`);
  }
}

// ========================================
// ORDER RETRIEVAL SERVICES
// ========================================

export async function getUserOrders(limit: number = 50): Promise<Order[]> {
  const { data: orders, error: ordersError } = await (supabase as any)
    .from('orders')
    .select(`*`)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (ordersError) {
    throw new Error(`Failed to fetch user orders: ${ordersError.message}`);
  }

  return (orders as any[]) || [];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data: order, error } = await (supabase as any)
    .from('orders')
    .select(`*`)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch order: ${error.message}`);
  }

  return order as any;
}

export async function getAllOrders(options: {
  status?: string;
  paymentMethod?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Order[]> {
  let query = (supabase as any)
    .from('orders')
    .select(`*`);

  if (options.status) {
    (query as any) = (query as any).eq('status', options.status);
  }

  if (options.paymentMethod) {
    (query as any) = (query as any).eq('payment_method', options.paymentMethod);
  }

  query = query
    .order('created_at', { ascending: false })
    .range(options.offset || 0, (options.offset || 0) + (options.limit || 50) - 1);

  const { data: orders, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch orders: ${error.message}`);
  }

  return (orders as any[]) || [];
}

export async function getOrderStatistics(): Promise<{
  totalOrders: number;
  totalRevenue: number;
  ordersByStatus: Record<string, number>;
  ordersByPaymentMethod: Record<string, number>;
  recentOrders: Order[];
}> {
  const orders = await getAllOrders({ limit: 100 });
  
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.total || 0), 0);
  
  const ordersByStatus = orders.reduce((acc: Record<string, number>, order: any) => {
    const status = order.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const ordersByPaymentMethod = orders.reduce((acc: Record<string, number>, order: any) => {
    const method = order.payment_method || 'unknown';
    acc[method] = (acc[method] || 0) + 1;
    return acc;
  }, {});

  const recentOrders = await getAllOrders({ limit: 10 });

  return {
    totalOrders,
    totalRevenue,
    ordersByStatus,
    ordersByPaymentMethod,
    recentOrders
  };
}

// ========================================
// VALIDATION AND FORMATTING UTILITIES
// ========================================

export function validateOrderData(orderData: CreateOrderData): string[] {
  const errors: string[] = [];

  if (!orderData.email || !orderData.email.includes('@')) {
    errors.push('Valid email address is required');
  }

  if (!orderData.fullName || orderData.fullName.trim().length < 2) {
    errors.push('Full name is required');
  }

  const { address } = orderData;
  if (!address.address || address.address.trim().length < 5) {
    errors.push('Street address is required');
  }

  if (!address.city || address.city.trim().length < 2) {
    errors.push('City is required');
  }

  if (!address.postcode || address.postcode.trim().length < 3) {
    errors.push('Postcode is required');
  }

  if (!orderData.cartItems || orderData.cartItems.length === 0) {
    errors.push('Cart cannot be empty');
  }

  orderData.cartItems.forEach((item, index) => {
    if (item.quantity <= 0) {
      errors.push(`Item ${index + 1} must have a positive quantity`);
    }
    
    if (!item.product.id || !item.product.name || !item.product.price) {
      errors.push(`Item ${index + 1} is missing required product information`);
    }
  });

  if (!['card', 'paypal'].includes(orderData.paymentMethod)) {
    errors.push('Invalid payment method');
  }

  return errors;
}

export function formatOrderAddress(address: OrderAddress): string {
  return `${address.address}, ${address.city}, ${address.postcode}`;
}

export function formatOrderStatus(status: Order['status']): string {
  const statusMap: Record<Order['status'], string> = {
    pending: 'Pending',
    paid: 'Paid',
    shipped: 'Shipped',
    delivered: 'Delivered',
    cancelled: 'Cancelled'
  };

  return statusMap[status] || status;
}

export function getOrderStatusColor(status: Order['status']): string {
  const colorMap: Record<Order['status'], string> = {
    pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    paid: 'text-blue-600 bg-blue-50 border-blue-200',
    shipped: 'text-purple-600 bg-purple-50 border-purple-200',
    delivered: 'text-green-600 bg-green-50 border-green-200',
    cancelled: 'text-red-600 bg-red-50 border-red-200'
  };

  return colorMap[status] || 'text-gray-600 bg-gray-50 border-gray-200';
}