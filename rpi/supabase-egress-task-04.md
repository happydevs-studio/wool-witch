# Task 04: Client-Side Caching Implementation

## Objective
Implement comprehensive client-side caching to reduce redundant API calls and minimize data transfer from Supabase.

## Scope
- Implement React Query for server state management
- Add intelligent caching for product data
- Cache user authentication state
- Implement offline-first patterns for cart data
- Add cache invalidation strategies

## Acceptance Criteria
- [ ] React Query integrated for all server data fetching
- [ ] Product data cached with appropriate TTLs
- [ ] User authentication state cached securely
- [ ] Cart data persists across sessions
- [ ] 30-50% reduction in API call frequency
- [ ] Improved perceived performance

## Technical Tasks

### React Query Integration
- [ ] Install and configure React Query
- [ ] Set up query client with optimized defaults
- [ ] Create custom hooks for all data fetching
- [ ] Implement query key patterns and organization
- [ ] Add devtools for debugging

### Product Data Caching
- [ ] Cache product listings with 5-minute TTL
- [ ] Implement infinite queries for paginated products
- [ ] Cache individual product details
- [ ] Add optimistic updates for admin operations
- [ ] Implement background refetching

### Authentication State Caching
- [ ] Cache user session data securely
- [ ] Implement automatic session refresh
- [ ] Add offline authentication state
- [ ] Cache user preferences and settings

### Cart Data Optimization
- [ ] Enhance existing localStorage cart persistence
- [ ] Add cart state synchronization
- [ ] Implement optimistic cart updates
- [ ] Add offline cart functionality

## Implementation Details

### React Query Setup
```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      refetchOnWindowFocus: false,
    },
  },
})
```

### Custom Hooks
```typescript
// src/hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export const useProducts = (page = 0, pageSize = 24) => {
  return useQuery({
    queryKey: ['products', page, pageSize],
    queryFn: () => fetchProducts(page, pageSize),
    staleTime: 5 * 60 * 1000, // 5 minutes
    keepPreviousData: true,
  })
}
```

### Query Key Patterns
```typescript
// src/lib/queryKeys.ts
export const queryKeys = {
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (page: number, filters: any) => 
      [...queryKeys.products.lists(), page, filters] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
  },
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    orders: () => [...queryKeys.user.all, 'orders'] as const,
  },
}
```

## Caching Strategies

### Product Data
- **Listings**: 5-minute stale time, background refresh
- **Details**: 10-minute stale time, prefetch related products
- **Categories**: 1-hour stale time (rarely changes)
- **Search Results**: 2-minute stale time, debounced queries

### User Data
- **Profile**: 15-minute stale time, optimistic updates
- **Preferences**: Local storage with sync
- **Orders**: 5-minute stale time, real-time for new orders

### Admin Data
- **Dashboard**: 1-minute stale time, frequent updates
- **Analytics**: 5-minute stale time, manual refresh option
- **Product Management**: Immediate invalidation on changes

## File Changes Required

### Main App Setup
- [ ] Wrap App with QueryClient provider
- [ ] Add React Query DevTools in development
- [ ] Configure error boundaries for query errors

### Page Components
- [ ] Update Shop.tsx to use useProducts hook
- [ ] Modify Admin.tsx to use cached queries
- [ ] Update Cart.tsx with optimistic updates
- [ ] Enhance Checkout.tsx with cached user data

### Context Migration
- [ ] Migrate AuthContext to use React Query
- [ ] Enhance CartContext with query integration
- [ ] Add query-based state management patterns

### New Hook Files
- `src/hooks/useProducts.ts` - Product data hooks
- `src/hooks/useAuth.ts` - Authentication hooks
- `src/hooks/useOrders.ts` - Order management hooks
- `src/hooks/useCart.ts` - Enhanced cart hooks

## Cache Invalidation Strategy

### Automatic Invalidation
- [ ] User logout clears all user-related cache
- [ ] Product updates invalidate related queries
- [ ] Order creation triggers order cache refresh

### Manual Invalidation
- [ ] Pull-to-refresh on mobile
- [ ] Admin "refresh" buttons for real-time data
- [ ] Error recovery invalidation

### Background Updates
- [ ] Periodic background sync when online
- [ ] Stale-while-revalidate pattern
- [ ] Smart background refresh based on user activity

## Performance Optimizations

### Query Deduplication
- [ ] Prevent duplicate API calls for same data
- [ ] Implement request batching where possible
- [ ] Use query sharing across components

### Memory Management
- [ ] Configure appropriate cache sizes
- [ ] Implement cache pruning strategies
- [ ] Monitor memory usage in production

### Network Optimization
- [ ] Implement request cancellation
- [ ] Add retry logic with exponential backoff
- [ ] Optimize query timing and batching

## Testing Requirements

### Unit Tests
- [ ] Test custom hooks with React Query Testing Library
- [ ] Mock query responses for component tests
- [ ] Test cache invalidation logic

### Integration Tests
- [ ] Test caching behavior across page navigation
- [ ] Verify offline functionality
- [ ] Test cache persistence across browser sessions

### Performance Tests
- [ ] Measure cache hit rates
- [ ] Monitor API call reduction
- [ ] Test perceived performance improvements

## Monitoring and Analytics

### Metrics to Track
- [ ] Cache hit/miss rates
- [ ] API call frequency reduction
- [ ] Query response times
- [ ] User experience metrics

### React Query DevTools
- [ ] Enable in development for debugging
- [ ] Monitor query states and timing
- [ ] Analyze cache usage patterns

## Timeline
**Duration**: 2-3 weeks  
**Priority**: MEDIUM  
**Dependencies**: Task 02 (Query optimization)  
**Next Task**: supabase-egress-task-05.md (Real-time Optimization)

## Success Metrics
- **API Call Reduction**: 30-50% fewer redundant calls
- **Performance**: Improved perceived loading times
- **User Experience**: Smoother navigation and interactions
- **Egress Cost**: Measurable reduction in data transfer

## Migration Strategy
- [ ] Implement alongside existing code initially
- [ ] Gradual migration of components to React Query
- [ ] A/B test performance improvements
- [ ] Full migration after validation

## Dependencies to Add
```json
{
  "@tanstack/react-query": "^4.29.0",
  "@tanstack/react-query-devtools": "^4.29.0"
}
```

## Notes
- Focus on highest-traffic endpoints first
- Consider implementing service worker for advanced caching
- Plan for future offline-first capabilities
- Monitor bundle size impact of additional dependencies
