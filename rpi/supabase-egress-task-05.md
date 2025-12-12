# Task 05: Real-time Subscription Optimization

## Objective
Audit and optimize real-time subscriptions to eliminate unnecessary data transfer and reduce egress costs from Supabase real-time features.

## Scope
- Audit all existing real-time subscriptions
- Implement selective real-time updates
- Optimize subscription payloads
- Add intelligent subscription management
- Consider polling alternatives for less critical updates

## Acceptance Criteria
- [ ] Complete audit of all real-time subscriptions
- [ ] Optimized subscription payloads (specific columns only)
- [ ] Intelligent subscription lifecycle management
- [ ] 40-60% reduction in real-time data transfer
- [ ] Maintained real-time user experience where needed

## Technical Tasks

### Subscription Audit
- [ ] Identify all active real-time subscriptions in codebase
- [ ] Document subscription frequency and payload sizes
- [ ] Analyze actual vs necessary real-time requirements
- [ ] Map user interactions that trigger subscriptions

### Payload Optimization
- [ ] Implement column filtering for subscriptions
- [ ] Add conditional subscription logic
- [ ] Optimize subscription event types
- [ ] Reduce subscription scope and frequency

### Subscription Management
- [ ] Implement automatic subscription cleanup
- [ ] Add subscription pooling and sharing
- [ ] Create subscription state management
- [ ] Add connection status monitoring

### Alternative Strategies
- [ ] Implement polling for less critical data
- [ ] Add hybrid real-time/polling patterns
- [ ] Use local state optimizations
- [ ] Consider WebSocket connection sharing

## Current Subscription Analysis

### Potential Real-time Usage Areas
Based on typical e-commerce patterns:

#### User Authentication
- User session changes
- Profile updates
- Role/permission changes

#### Shopping Cart (if implemented)
- Cart synchronization across devices
- Inventory updates
- Price changes

#### Admin Operations
- Product inventory changes
- Order status updates
- Admin activity monitoring

#### Order Management
- Order status changes
- Payment confirmations
- Shipping updates

## Implementation Strategy

### Subscription Optimization Patterns

```typescript
// Before: Full table subscription
supabase
  .channel('products')
  .on('postgres_changes', 
    { event: '*', schema: 'woolwitch', table: 'products' },
    payload => handleProductChange(payload)
  )

// After: Selective column subscription
supabase
  .channel('products-inventory')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'woolwitch', 
    table: 'products',
    filter: 'inventory_count=lt.10', // Only low inventory
    select: 'id,inventory_count,status'
  }, payload => handleInventoryChange(payload))
```

### Smart Subscription Manager
```typescript
// src/lib/subscriptionManager.ts
class SubscriptionManager {
  private subscriptions = new Map<string, RealtimeChannel>()
  private connectionState = 'disconnected'
  
  subscribe(key: string, config: SubscriptionConfig) {
    // Implement subscription deduplication and lifecycle management
  }
  
  unsubscribe(key: string) {
    // Clean up subscriptions when components unmount
  }
  
  pauseNonCritical() {
    // Pause non-essential subscriptions during low activity
  }
}
```

### Conditional Real-time Hook
```typescript
// src/hooks/useRealtimeData.ts
export const useRealtimeData = (
  query: string,
  options: {
    realtime?: boolean
    pollInterval?: number
    priority?: 'high' | 'medium' | 'low'
  }
) => {
  // Decide between real-time subscription vs polling
  // Based on user activity, connection quality, etc.
}
```

## Optimization Strategies

### High Priority Real-time (Keep)
- Order status changes during checkout
- Payment confirmations
- Critical inventory updates
- Admin security events

### Medium Priority (Optimize)
- Product inventory for displayed items only
- User session management
- Cart synchronization (if multi-device)
- Admin dashboard updates

### Low Priority (Consider Polling)
- General product catalog changes
- Non-critical admin statistics
- Historical order updates
- Analytics data

## Technical Implementation

### Subscription Lifecycle Management
```typescript
// src/hooks/useOptimizedSubscription.ts
export const useOptimizedSubscription = (config: SubscriptionConfig) => {
  const [isActive, setIsActive] = useState(false)
  
  useEffect(() => {
    // Subscribe only when component is visible and user is active
    const shouldSubscribe = isPageVisible && isUserActive && config.priority === 'high'
    
    if (shouldSubscribe && !isActive) {
      // Start subscription
    } else if (!shouldSubscribe && isActive) {
      // Stop subscription
    }
  }, [isPageVisible, isUserActive, config.priority])
}
```

### Connection Quality Adaptation
```typescript
// Adjust real-time behavior based on connection quality
const useAdaptiveRealtime = () => {
  const connectionQuality = useNetworkQuality()
  
  return {
    shouldUseRealtime: connectionQuality === 'good',
    pollInterval: connectionQuality === 'poor' ? 30000 : 5000,
    subscriptionPriority: connectionQuality === 'poor' ? 'high-only' : 'all'
  }
}
```

## Code Areas to Review

### Authentication Context
```typescript
// src/contexts/AuthContext.tsx
// Review any real-time user session monitoring
// Optimize to poll for session validation instead
```

### Admin Dashboard
```typescript
// src/pages/Admin.tsx
// Review real-time dashboard updates
// Implement manual refresh with optimistic updates
```

### Cart Management
```typescript
// src/contexts/CartContext.tsx
// Review any real-time cart synchronization
// Consider localStorage-first with periodic sync
```

## Performance Monitoring

### Metrics to Track
- [ ] Real-time message frequency per user session
- [ ] Average payload size per subscription
- [ ] Subscription connection duration
- [ ] Failed subscription attempts
- [ ] User experience impact of optimizations

### Monitoring Implementation
```typescript
// src/lib/realtimeAnalytics.ts
export const trackRealtimeUsage = (event: string, payload: any) => {
  // Track subscription patterns and costs
  analytics.track('realtime_usage', {
    event_type: event,
    payload_size: JSON.stringify(payload).length,
    subscription_key: getCurrentSubscriptionKey(),
    timestamp: new Date().toISOString()
  })
}
```

## Testing Strategy

### Subscription Testing
- [ ] Test subscription cleanup on component unmount
- [ ] Verify optimized payloads contain required data only
- [ ] Test graceful degradation when real-time fails
- [ ] Validate polling fallback mechanisms

### Performance Testing
- [ ] Load test with multiple concurrent subscriptions
- [ ] Test subscription behavior under poor network conditions
- [ ] Validate memory usage with long-running subscriptions

### User Experience Testing
- [ ] Test critical real-time features still work
- [ ] Verify non-critical features gracefully degrade
- [ ] Test offline/online transition behavior

## Migration Strategy

### Phase 1: Audit and Baseline (Week 1)
- [ ] Complete subscription audit
- [ ] Establish baseline metrics
- [ ] Identify optimization opportunities

### Phase 2: Critical Path Optimization (Week 2)
- [ ] Optimize highest-volume subscriptions
- [ ] Implement smart subscription management
- [ ] Add monitoring and analytics

### Phase 3: Alternative Strategies (Week 3)
- [ ] Replace non-critical real-time with polling
- [ ] Implement hybrid approaches
- [ ] Fine-tune based on usage patterns

## Timeline
**Duration**: 2-3 weeks  
**Priority**: MEDIUM  
**Dependencies**: Task 01 (Audit baseline)  
**Next Task**: supabase-egress-task-06.md (Response Compression)

## Success Metrics
- **Real-time Data Reduction**: 40-60% less real-time egress
- **Connection Efficiency**: Fewer unnecessary subscriptions
- **User Experience**: Maintained responsiveness for critical features
- **Resource Usage**: Reduced memory and CPU from subscription management

## Risk Assessment
- **Low Risk**: Optimizing subscription payloads
- **Medium Risk**: Replacing real-time with polling for some features
- **High Risk**: Removing real-time from critical user flows

## Rollback Plan
- [ ] Feature flags for real-time vs polling modes
- [ ] Gradual rollout with monitoring
- [ ] Quick revert for critical functionality
- [ ] User feedback monitoring during transition

## Notes
- Focus on user-facing critical features first
- Consider user behavior patterns (active vs idle)
- Monitor for any negative user experience impact
- Document real-time requirements for future development
