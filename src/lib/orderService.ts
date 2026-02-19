/**
 * Order Service - Order Management and Calculation Utilities
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  createOrder as apiCreateOrder,
  createPayment as apiCreatePayment,
  updateOrderStatus as apiUpdateOrderStatus,
  getUserOrders as apiGetUserOrders,
  getAllOrders as apiGetAllOrders,
  getOrderById as apiGetOrderById,
  getOrderItems as apiGetOrderItems,
  CreateOrderParams
} from './apiService';
import { validateCartProducts, logCartValidation } from './cartDebug';
import type { 
  Order, 
  Payment, 
  CreateOrderData, 
  OrderSummary, 
  CartItem,
  OrderAddress,
  PayPalDetails,
  StripeDetails,
  CustomPropertiesConfig,
  CustomPropertyDropdown
} from '../types/database';

const isDevRuntime = (): boolean => {
  const viteEnv = (import.meta as any).env ?? {};
  if (typeof viteEnv.DEV !== 'undefined') {
    return Boolean(viteEnv.DEV);
  }
  if (typeof process !== 'undefined') {
    return process.env.NODE_ENV !== 'production';
  }
  return false;
};

// ========================================
// ORDER CALCULATION UTILITIES
// ========================================

/**
 * Returns the effective price for a cart item, taking into account any
 * custom property option price selected by the customer.
 */
export function getEffectivePrice(item: CartItem): number {
  const selections = item.customSelections;
  if (!selections || selections.length === 0) return item.product.price;

  const config = item.product.custom_properties as CustomPropertiesConfig | null;
  if (!config) return item.product.price;

  for (const selection of selections) {
    const property = config.properties.find(p => p.id === selection.propertyId);
    if (property?.type === 'dropdown') {
      const dropdown = property as CustomPropertyDropdown;
      const optionPrice = dropdown.optionPrices?.[selection.value as string];
      if (optionPrice !== undefined) return optionPrice;
    }
  }

  return item.product.price;
}

/**
 * Returns the { min, max } price range for a product, taking into account any
 * dropdown option prices defined on custom properties.
 */
export function getProductPriceRange(
  customProperties: CustomPropertiesConfig | null,
  basePrice: number,
  basePriceMax: number | null
): { min: number; max: number } {
  if (!customProperties) return { min: basePrice, max: basePriceMax ?? basePrice };

  const allOptionPrices: number[] = [];
  for (const property of customProperties.properties) {
    if (property.type !== 'dropdown') continue;
    const dropdown = property as CustomPropertyDropdown;
    if (!dropdown.optionPrices) continue;
    const prices = Object.values(dropdown.optionPrices);
    if (prices.length > 0) allOptionPrices.push(...prices);
  }

  if (allOptionPrices.length === 0) {
    return { min: basePrice, max: basePriceMax ?? basePrice };
  }

  return {
    min: Math.min(...allOptionPrices),
    max: Math.max(...allOptionPrices),
  };
}

export function calculateSubtotal(cartItems: CartItem[]): number {
  return cartItems.reduce((total, item) => {
    return total + (getEffectivePrice(item) * item.quantity);
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
    if (isDevRuntime()) {
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
    // Build order items array for API call
    const orderItems = cartItems.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      product_price: getEffectivePrice(item),
      quantity: item.quantity,
      delivery_charge: item.product.delivery_charge || 0
    }));

    // Use API layer to create order
    const orderId = await apiCreateOrder({
      email: customerInfo.email,
      fullName: customerInfo.fullName,
      address: customerInfo.address,
      subtotal,
      deliveryTotal,
      total,
      paymentMethod,
      orderItems
    });

    // If payment ID is provided, create payment record
    if (paymentId) {
      await apiCreatePayment({
        orderId,
        paymentMethod,
        paymentId,
        amount: total,
        status: paymentMethod === 'paypal' ? 'completed' : (paymentMethod === 'card' ? 'completed' : 'pending'),
        paypalDetails,
        stripeDetails
      });
    }

    // Fetch the created order to return
    const order = await apiGetOrderById(orderId);
    if (!order) {
      throw new Error('Failed to retrieve created order');
    }

    return order;

  } catch (error) {
    // Log error details only in development
    if (isDevRuntime()) {
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
    const items = await apiGetOrderItems(orderId);
    return items || [];
  } catch (error) {
    // Log error details only in development
    if (isDevRuntime()) {
      console.error('Error in getOrderItems:', error);
    }
    throw error;
  }
}

export async function updateOrderStatus(orderId: string, status: Order['status']): Promise<void> {
  try {
    await apiUpdateOrderStatus(orderId, status);
  } catch (error) {
    throw new Error(`Failed to update order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  try {
    await apiCreatePayment({
      orderId,
      paymentMethod,
      paymentId,
      amount,
      status,
      paypalDetails,
      stripeDetails
    });
  } catch (error) {
    throw new Error(`Failed to create payment record: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ========================================
// ORDER RETRIEVAL SERVICES
// ========================================

export async function getUserOrders(limit: number = 50): Promise<Order[]> {
  try {
    const orders = await apiGetUserOrders(limit);
    return orders || [];
  } catch (error) {
    throw new Error(`Failed to fetch user orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  try {
    const order = await apiGetOrderById(orderId);
    return order;
  } catch (error) {
    throw new Error(`Failed to fetch order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getAllOrders(options: {
  status?: string;
  paymentMethod?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Order[]> {
  try {
    const orders = await apiGetAllOrders(options);
    return orders || [];
  } catch (error) {
    throw new Error(`Failed to fetch orders: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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

  // Use the same robust email regex as database constraint and Edge function
  // Prevents consecutive dots, leading/trailing special chars, etc.
  const emailRegex = /^[A-Za-z0-9]([A-Za-z0-9._%-]*[A-Za-z0-9])?@[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,}$/;
  if (!orderData.email || !emailRegex.test(orderData.email)) {
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