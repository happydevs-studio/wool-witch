import { supabase } from './supabase';
import { persistentCache, imagePreloader, networkOptimizer } from './cacheUtils';
import type { Product } from '../types/database';

interface ProductListFields {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
  stock_quantity: number | null;
  delivery_charge: number | null;
  is_available: boolean | null;
  sort_order?: number;
}

interface ProductSummaryFields {
  id: string;
  name: string;
  price: number;
  image_url: string;
  category: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Optimized data service that implements:
 * - Selective field fetching to reduce payload size
 * - In-memory caching to prevent redundant requests
 * - Pagination support for large datasets
 * - Query optimization for different use cases
 */
export class DataService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly LIST_TTL = 2 * 60 * 1000; // 2 minutes for frequently updated data

  /**
   * Clear expired cache entries from memory
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get data from cache (memory first, then persistent)
   */
  private getFromCache<T>(key: string): T | null {
    this.cleanCache();
    
    // Check memory cache first
    const entry = this.cache.get(key);
    if (entry && Date.now() <= entry.timestamp + entry.ttl) {
      return entry.data;
    }
    
    // Check persistent cache
    const persistent = persistentCache.get<T>(key);
    if (persistent) {
      // Restore to memory cache
      this.setCache(key, persistent);
      return persistent;
    }
    
    return null;
  }

  /**
   * Set data in both memory and persistent cache
   */
  private setCache<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Memory cache
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Persistent cache for important data
    if (key.includes('products_list') || key.includes('categories')) {
      persistentCache.set(key, data, ttl);
    }
  }

  /**
   * Get products for listing (minimal fields for performance)
   */
  async getProductList(options: {
    category?: string;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<ProductListFields[]> {
    const { category, search, offset = 0 } = options;
    
    // Adapt limit based on network conditions
    const limit = options.limit || networkOptimizer.getOptimalBatchSize();
    
    const cacheKey = `products_list_${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getFromCache<ProductListFields[]>(cacheKey);
    if (cached) {
      // Still preload images if not already done
      imagePreloader.preloadProductImages(cached);
      return cached;
    }

    try {
      let query = supabase
        .from('products_view')
        .select('id, name, price, image_url, category, stock_quantity, delivery_charge, is_available, sort_order')
        .eq('is_available', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%, description.ilike.%${search}%, category.ilike.%${search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      const products = (data as ProductListFields[]) || [];
      this.setCache(cacheKey, products, this.LIST_TTL);
      
      // Preload product images for better performance
      if (products.length > 0) {
        imagePreloader.preloadProductImages(products);
      }
      
      return products;
    } catch (error) {
      console.error('Error fetching product list:', error);
      throw error;
    }
  }

  /**
   * Get minimal product data for cart/summary views
   */
  async getProductSummaries(productIds: string[]): Promise<ProductSummaryFields[]> {
    if (productIds.length === 0) return [];
    
    const cacheKey = `products_summary_${productIds.sort().join(',')}`;
    
    // Check cache first
    const cached = this.getFromCache<ProductSummaryFields[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('products_view')
        .select('id, name, price, image_url, category')
        .in('id', productIds);

      if (error) throw error;

      const products = (data as ProductSummaryFields[]) || [];
      this.setCache(cacheKey, products);
      return products;
    } catch (error) {
      console.error('Error fetching product summaries:', error);
      throw error;
    }
  }

  /**
   * Get full product details (only when needed)
   */
  async getProductDetails(productId: string): Promise<Product | null> {
    const cacheKey = `product_detail_${productId}`;
    
    // Check cache first
    const cached = this.getFromCache<Product>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('products_view')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;

      const product = data as Product;
      this.setCache(cacheKey, product);
      return product;
    } catch (error) {
      console.error('Error fetching product details:', error);
      throw error;
    }
  }

  /**
   * Get product categories (cached for long period)
   */
  async getCategories(): Promise<string[]> {
    const cacheKey = 'product_categories';
    
    // Check cache first (longer TTL for categories)
    const cached = this.getFromCache<string[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('products_view')
        .select('category')
        .eq('is_available', true);

      if (error) throw error;

      const categories = [...new Set((data || []).map(item => item.category))];
      this.setCache(cacheKey, categories, 15 * 60 * 1000); // 15 minutes TTL
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  /**
   * Prefetch products for better performance
   */
  async prefetchProducts(options: {
    category?: string;
    limit?: number;
  } = {}): Promise<void> {
    // Prefetch in background without blocking
    this.getProductList(options).catch(console.error);
  }

  /**
   * Clear all cached data (both memory and persistent)
   */
  clearCache(): void {
    this.cache.clear();
    persistentCache.clear();
    imagePreloader.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    this.cleanCache();
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const dataService = new DataService();