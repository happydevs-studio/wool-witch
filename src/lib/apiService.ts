/**
 * API Service Layer - Uses woolwitch_api schema functions and views
 * 
 * This service provides a clean abstraction over the database API layer,
 * using only exposed functions and views from the woolwitch_api schema.
 * This follows best practice of separating the API layer from the data layer.
 */

import { supabase } from './supabase';
import { handleApiError } from './errorHandler';
import type { Product, Order, OrderItem } from '../types/database';

// ========================================
// PRODUCT API
// ========================================

export interface ProductListParams {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getProducts(params: ProductListParams = {}): Promise<Product[]> {
  const { category, search, limit = 50, offset = 0 } = params;
  
  const { data, error } = await supabase.rpc('get_products', {
    p_category: category || null,
    p_search: search || null,
    p_limit: limit,
    p_offset: offset
  });

  if (error) handleApiError(error, 'fetching products');

  return (data || []) as Product[];
}

export async function getProductById(productId: string): Promise<Product | null> {
  const { data, error } = await supabase.rpc('get_product_by_id', {
    p_product_id: productId
  });

  if (error) handleApiError(error, 'fetching product');

  return data && data.length > 0 ? (data[0] as Product) : null;
}

export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  if (productIds.length === 0) return [];
  
  const { data, error } = await supabase.rpc('get_products_by_ids', {
    p_product_ids: productIds
  });

  if (error) handleApiError(error, 'fetching products by IDs');

  return (data || []) as Product[];
}

export async function getCategories(): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_categories');

  if (error) handleApiError(error, 'fetching categories');

  return (data || []).map((item: any) => item.category);
}

// ========================================
// ADMIN PRODUCT MANAGEMENT
// ========================================

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity?: number;
  delivery_charge?: number;
  is_available?: boolean;
  price_max?: number;
}

export async function createProduct(productData: CreateProductData): Promise<string> {
  const { data, error } = await supabase.rpc('create_product', {
    p_name: productData.name,
    p_description: productData.description,
    p_price: productData.price,
    p_image_url: productData.image_url,
    p_category: productData.category,
    p_stock_quantity: productData.stock_quantity ?? 0,
    p_delivery_charge: productData.delivery_charge ?? 0,
    p_is_available: productData.is_available ?? true,
    p_price_max: productData.price_max ?? null
  });

  if (error) handleApiError(error, 'creating product');

  return data as string;
}

export async function updateProduct(
  productId: string, 
  productData: CreateProductData
): Promise<void> {
  const { error } = await supabase.rpc('update_product', {
    p_product_id: productId,
    p_name: productData.name,
    p_description: productData.description,
    p_price: productData.price,
    p_image_url: productData.image_url,
    p_category: productData.category,
    p_stock_quantity: productData.stock_quantity ?? 0,
    p_delivery_charge: productData.delivery_charge ?? 0,
    p_is_available: productData.is_available ?? true,
    p_price_max: productData.price_max ?? null
  });

  if (error) handleApiError(error, 'updating product');
}

export async function updateProductSortOrders(
  productOrders: Array<{ id: string; sort_order: number }>
): Promise<void> {
  const { error } = await supabase.rpc('update_product_sort_orders', {
    p_product_orders: productOrders
  });

  if (error) handleApiError(error, 'updating product sort orders');
}

export async function deleteProduct(productId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_product', {
    p_product_id: productId
  });

  if (error) handleApiError(error, 'deleting product');
}

// ========================================
// ORDER API
// ========================================

export interface CreateOrderParams {
  email: string;
  fullName: string;
  address: {
    address: string;
    city: string;
    postcode: string;
  };
  subtotal: number;
  deliveryTotal: number;
  total: number;
  paymentMethod: 'card' | 'paypal' | 'stripe';
  orderItems: Array<{
    product_id: string;
    product_name: string;
    product_price: number;
    quantity: number;
    delivery_charge: number;
  }>;
}

export async function createOrder(orderData: CreateOrderParams): Promise<string> {
  const { data, error } = await supabase.rpc('create_order', {
    p_email: orderData.email,
    p_full_name: orderData.fullName,
    p_address: orderData.address,
    p_subtotal: orderData.subtotal,
    p_delivery_total: orderData.deliveryTotal,
    p_total: orderData.total,
    p_payment_method: orderData.paymentMethod,
    p_order_items: orderData.orderItems
  });

  if (error) handleApiError(error, 'creating order');

  return data as string;
}

export async function createPayment(params: {
  orderId: string;
  paymentMethod: string;
  paymentId: string;
  amount: number;
  status?: string;
  paypalDetails?: any;
  stripeDetails?: any;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_payment', {
    p_order_id: params.orderId,
    p_payment_method: params.paymentMethod,
    p_payment_id: params.paymentId,
    p_amount: params.amount,
    p_status: params.status || 'pending',
    p_paypal_details: params.paypalDetails || null,
    p_stripe_details: params.stripeDetails || null
  });

  if (error) handleApiError(error, 'creating payment');

  return data as string;
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status']
): Promise<void> {
  const { error } = await supabase.rpc('update_order_status', {
    p_order_id: orderId,
    p_status: status
  });

  if (error) handleApiError(error, 'updating order status');
}

export async function updatePaymentStatus(
  paymentId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded',
  paymentDetails?: any
): Promise<void> {
  const { error } = await supabase.rpc('update_payment_status', {
    p_payment_id: paymentId,
    p_status: status,
    p_payment_details: paymentDetails || null
  });

  if (error) handleApiError(error, 'updating payment status');
}

export async function getUserOrders(limit: number = 50): Promise<Order[]> {
  const { data, error } = await supabase.rpc('get_user_orders', {
    p_limit: limit
  });

  if (error) handleApiError(error, 'fetching user orders');

  return (data || []) as Order[];
}

export async function getAllOrders(params: {
  status?: string;
  paymentMethod?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<Order[]> {
  const { status, paymentMethod, limit = 50, offset = 0 } = params;
  
  const { data, error } = await supabase.rpc('get_all_orders', {
    p_status: status || null,
    p_payment_method: paymentMethod || null,
    p_limit: limit,
    p_offset: offset
  });

  if (error) handleApiError(error, 'fetching all orders');

  return (data || []) as Order[];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase.rpc('get_order_by_id', {
    p_order_id: orderId
  });

  if (error) handleApiError(error, 'fetching order');

  return data && data.length > 0 ? (data[0] as Order) : null;
}

export async function getOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase.rpc('get_order_items', {
    p_order_id: orderId
  });

  if (error) handleApiError(error, 'fetching order items');

  return (data || []) as OrderItem[];
}

// ========================================
// VIEW-BASED QUERIES (for read-only access)
// ========================================

/**
 * Access products view directly for caching/optimization scenarios
 * Note: Views are read-only but can be more efficient for certain queries
 */
export async function queryProductsView(params: {
  filters?: any;
  limit?: number;
  offset?: number;
} = {}): Promise<Product[]> {
  let query = supabase
    .from('products_view' as any)
    .select('*');

  if (params.limit) {
    query = query.limit(params.limit);
  }

  if (params.offset) {
    query = query.range(params.offset, params.offset + (params.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) handleApiError(error, 'querying products view');

  return (data || []) as Product[];
}
