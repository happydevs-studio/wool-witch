# Task 06: Response Compression and API Optimization

## Objective
Implement response compression and API-level optimizations to reduce data transfer without changing core functionality.

## Scope
- Enable response compression at multiple layers
- Optimize JSON response formats
- Implement API response minification
- Add compression headers and policies
- Optimize API endpoint design

## Acceptance Criteria
- [ ] Response compression enabled and configured
- [ ] 20-40% reduction in response payload sizes
- [ ] Optimized JSON structures for minimal data transfer
- [ ] Maintained API functionality and performance
- [ ] Proper compression headers and caching policies

## Technical Tasks

### Response Compression Setup
- [ ] Configure Supabase response compression
- [ ] Enable gzip/brotli compression for API responses
- [ ] Set up compression at CDN/proxy layer
- [ ] Configure client-side compression headers
- [ ] Test compression ratios for different content types

### JSON Response Optimization
- [ ] Minimize property names in API responses
- [ ] Remove null/undefined fields from responses
- [ ] Implement response field filtering
- [ ] Optimize nested object structures
- [ ] Use more efficient data formats where possible

### API Endpoint Optimization
- [ ] Combine multiple API calls into batch endpoints
- [ ] Implement GraphQL-style field selection
- [ ] Optimize response schemas
- [ ] Add response caching headers
- [ ] Implement conditional requests (ETags)

### Client-Side Optimizations
- [ ] Add request compression for large payloads
- [ ] Implement response decompression handling
- [ ] Optimize request/response serialization
- [ ] Add compression-aware error handling

## Implementation Details

### Supabase Configuration
```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!,
  {
    global: {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br',
        'Content-Type': 'application/json;charset=UTF-8'
      }
    },
    db: {
      schema: 'woolwitch'
    }
  }
)
```

### Response Field Filtering
```typescript
// src/lib/apiUtils.ts
export const optimizeResponse = <T>(data: T, fields?: string[]): Partial<T> => {
  if (!fields) return data
  
  const optimized: Partial<T> = {}
  fields.forEach(field => {
    if (data[field] !== null && data[field] !== undefined) {
      optimized[field] = data[field]
    }
  })
  return optimized
}
```

### Batch API Patterns
```typescript
// src/lib/batchApi.ts
export const batchProductOperations = async (operations: BatchOperation[]) => {
  // Combine multiple product queries into single request
  // Reduce round trips and connection overhead
  
  const batchQuery = operations.map(op => ({
    method: op.method,
    table: op.table,
    select: op.fields?.join(',') || '*',
    filters: op.filters
  }))
  
  return supabase.rpc('batch_operations', { operations: batchQuery })
}
```

## Compression Strategies

### Response Compression Levels
- **Products List**: Target 60-70% compression ratio
- **User Data**: Target 50-60% compression ratio
- **Admin Data**: Target 40-50% compression ratio
- **Static Configuration**: Target 70-80% compression ratio

### Content-Type Specific Optimization
```typescript
// Optimize different response types
export const contentOptimizers = {
  'application/json': (data: any) => {
    // Remove null values, minimize property names
    return JSON.stringify(data, (key, value) => value === null ? undefined : value)
  },
  
  'text/html': (data: string) => {
    // Minify HTML responses (if serving any)
    return data.replace(/\s+/g, ' ').trim()
  },
  
  'application/javascript': (data: string) => {
    // Minify JS responses (for dynamic content)
    return data.replace(/\s+/g, ' ').replace(/;\s*}/g, '}')
  }
}
```

### Database View Optimization
```sql
-- Create optimized views for common queries
-- supabase/migrations/add_optimized_views.sql
CREATE VIEW woolwitch.products_list AS
SELECT 
  id,
  name,
  price,
  image_url,
  category,
  in_stock
FROM woolwitch.products
WHERE active = true;

CREATE VIEW woolwitch.products_admin AS
SELECT 
  id,
  name,
  description,
  price,
  cost,
  inventory_count,
  category,
  tags,
  image_url,
  active,
  created_at,
  updated_at
FROM woolwitch.products;
```

## API Response Optimization

### Property Name Shortening
```typescript
// src/types/optimizedTypes.ts
// Use shorter property names for frequently transferred data
export interface OptimizedProduct {
  id: string
  n: string     // name
  p: number     // price
  img: string   // image_url
  cat: string   // category
  stock: boolean // in_stock
}

export const mapToOptimized = (product: Product): OptimizedProduct => ({
  id: product.id,
  n: product.name,
  p: product.price,
  img: product.image_url,
  cat: product.category,
  stock: product.inventory_count > 0
})
```

### Response Size Monitoring
```typescript
// src/lib/responseMonitor.ts
export const monitorResponseSize = (response: Response) => {
  const size = response.headers.get('content-length')
  const encoding = response.headers.get('content-encoding')
  
  analytics.track('api_response_size', {
    endpoint: response.url,
    size_bytes: size ? parseInt(size) : 0,
    compression: encoding || 'none',
    compression_ratio: calculateCompressionRatio(response)
  })
}
```

## Caching and Compression Headers

### HTTP Headers Strategy
```typescript
// Implement proper caching and compression headers
export const setOptimalHeaders = (response: Response, cacheStrategy: string) => {
  const headers = new Headers(response.headers)
  
  // Compression
  headers.set('Content-Encoding', 'gzip')
  headers.set('Vary', 'Accept-Encoding')
  
  // Caching
  switch(cacheStrategy) {
    case 'static':
      headers.set('Cache-Control', 'public, max-age=31536000, immutable')
      break
    case 'dynamic':
      headers.set('Cache-Control', 'public, max-age=300, s-maxage=600')
      break
    case 'private':
      headers.set('Cache-Control', 'private, max-age=60')
      break
  }
  
  return headers
}
```

### ETag Implementation
```typescript
// src/lib/etags.ts
export const generateETag = (data: any): string => {
  const content = JSON.stringify(data)
  return `"${btoa(content.substring(0, 32))}"`
}

export const handleConditionalRequest = (request: Request, etag: string) => {
  const ifNoneMatch = request.headers.get('If-None-Match')
  
  if (ifNoneMatch === etag) {
    return new Response(null, { status: 304 }) // Not Modified
  }
  
  return null // Proceed with full response
}
```

## Performance Testing

### Compression Ratio Testing
```bash
# Test compression ratios for different endpoints
curl -H "Accept-Encoding: gzip" -s "https://api.woolwitch.com/products" | wc -c
curl -s "https://api.woolwitch.com/products" | wc -c

# Calculate compression ratio
echo "scale=2; compressed_size / original_size * 100" | bc
```

### Response Size Benchmarks
- [ ] Baseline response sizes before optimization
- [ ] Measure compression ratios across different endpoints
- [ ] Track response times with compression enabled
- [ ] Monitor client decompression performance

### Load Testing with Compression
```bash
# Test with compression enabled
ab -n 1000 -c 10 -H "Accept-Encoding: gzip" https://api.woolwitch.com/products

# Test without compression
ab -n 1000 -c 10 https://api.woolwitch.com/products
```

## Implementation Files

### Core Files to Update
- `src/lib/supabase.ts` - Client configuration
- `src/lib/apiUtils.ts` - Response optimization utilities
- `src/types/optimizedTypes.ts` - Compressed type definitions
- `src/hooks/useOptimizedQuery.ts` - Query hooks with compression

### New Utility Files
- `src/lib/compression.ts` - Compression utilities
- `src/lib/responseMonitor.ts` - Response size monitoring
- `src/lib/batchApi.ts` - Batch operation utilities
- `src/lib/etags.ts` - ETag handling

### Configuration Files
- `vite.config.ts` - Build-time compression
- `vercel.json` - Deployment compression settings

## Monitoring and Analytics

### Metrics to Track
- [ ] Average response size by endpoint
- [ ] Compression ratios achieved
- [ ] Response time impact of compression
- [ ] Client decompression performance
- [ ] Bandwidth savings per user session

### Dashboard Implementation
```typescript
// src/components/admin/CompressionDashboard.tsx
export const CompressionDashboard = () => {
  const compressionStats = useCompressionStats()
  
  return (
    <div>
      <h2>API Compression Analytics</h2>
      <div>Average Compression: {compressionStats.averageRatio}%</div>
      <div>Bandwidth Saved: {compressionStats.bandwidthSaved}MB</div>
      <div>Response Time Impact: {compressionStats.performanceImpact}ms</div>
    </div>
  )
}
```

## Timeline
**Duration**: 1-2 weeks  
**Priority**: MEDIUM  
**Dependencies**: Task 02 (Query optimization)  
**Next Task**: supabase-egress-task-07.md (Monitoring and Alerting)

## Success Metrics
- **Compression Ratio**: 20-40% reduction in response sizes
- **Performance**: No degradation in response times
- **Bandwidth Savings**: Measurable reduction in total egress
- **User Experience**: Improved loading times on slower connections

## Risk Assessment
- **Low Risk**: Response compression implementation
- **Medium Risk**: Property name optimization (breaking changes)
- **Low Risk**: Caching header optimization

## Rollback Plan
- [ ] Feature flags for compression settings
- [ ] Monitoring for performance degradation
- [ ] Quick disable option for compression
- [ ] Fallback to original response formats

## Notes
- Test thoroughly with different client configurations
- Monitor for any mobile performance impact
- Consider progressive compression implementation
- Document compression settings for team knowledge
