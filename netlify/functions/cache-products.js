const { createClient } = require('@supabase/supabase-js');

// In-memory cache for this serverless function instance
const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const LIST_TTL = 2 * 60 * 1000; // 2 minutes for product lists

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase configuration in environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'woolwitch' }
});

/**
 * Clean expired cache entries
 */
function cleanCache() {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.timestamp + entry.ttl) {
      cache.delete(key);
    }
  }
}

/**
 * Get data from cache if available and not expired
 */
function getFromCache(key) {
  cleanCache();
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.timestamp + entry.ttl) {
    cache.delete(key);
    return null;
  }
  
  return entry.data;
}

/**
 * Store data in cache
 */
function setCache(key, data, ttl = DEFAULT_TTL) {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

/**
 * Fetch products from Supabase with caching
 */
async function getProductList(options = {}) {
  const { category, search, offset = 0, limit = 50 } = options;
  
  const cacheKey = `products_list_${JSON.stringify(options)}`;
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    let query = supabase
      .from('products')
      .select('id, name, price, image_url, category, stock_quantity, delivery_charge, is_available')
      .eq('is_available', true)
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

    const products = data || [];
    setCache(cacheKey, products, LIST_TTL);
    
    return products;
  } catch (error) {
    console.error('Error fetching product list:', error);
    throw error;
  }
}

/**
 * Get available categories with caching
 */
async function getCategories() {
  const cacheKey = 'categories_list';
  
  // Check cache first
  const cached = getFromCache(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('category')
      .eq('is_available', true);

    if (error) throw error;

    const categories = [...new Set(data?.map(item => item.category) || [])];
    setCache(cacheKey, categories, DEFAULT_TTL);
    
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Netlify function handler
 */
exports.handler = async (event, context) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: '',
    };
  }

  // Only handle GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const url = new URL('http://localhost' + event.path + '?' + (event.queryStringParameters ? new URLSearchParams(event.queryStringParameters).toString() : ''));
    const searchParams = url.searchParams;
    const action = searchParams.get('action') || 'products';

    let responseData;

    switch (action) {
      case 'products': {
        const category = searchParams.get('category') || undefined;
        const search = searchParams.get('search') || undefined;
        const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')) : undefined;
        const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')) : undefined;

        responseData = await getProductList({ category, search, limit, offset });
        break;
      }
      
      case 'categories': {
        responseData = await getCategories();
        break;
      }
      
      default: {
        return {
          statusCode: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ error: 'Invalid action parameter' }),
        };
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // 5 minutes
      },
      body: JSON.stringify({
        success: true,
        data: responseData,
        cached: Date.now(),
      }),
    };

  } catch (error) {
    console.error('Function error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
    };
  }
};